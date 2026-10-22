import type { Brand } from "./schema.js";

/**
 * Upstream strings are rebranded where they are loaded, never in the catalogs, so catalog files
 * stay identical to upstream and strings added by later merges are rebranded automatically.
 *
 * - `Rakazo` (the capitalised word only; `rakazo-shared`, `RAKAZO_*` are identifiers) becomes the
 *   product name; a possessive keeps grammatical sense ("Nurlings’").
 * - The English words `bot`/`bots` become the brand's agent nouns, capitalised as a name. Ids
 *   (`bot-123`), paths (`/bots`), `botId`, `robot` and `chatbot` are not words and stay.
 * - ICU placeholder names (`{bot}`) are never touched.
 */
const PRODUCT = /(?<![\w{])Rakazo(?:(['’])s)?(?!\w)/g;
const AGENT = /(?<![\w{\-./:@#])([Bb]ot)(s?)(?![\w\-/:@#]|\.\w)/g;

export function brandText(input: string, brand: Pick<Brand, "name" | "bot">): string {
  if (!input.includes("Rakazo") && !/bot/i.test(input)) return input;
  return input
    .replace(PRODUCT, (_match, apostrophe: string | undefined) => {
      if (!apostrophe) return brand.name;
      return brand.name.endsWith("s")
        ? `${brand.name}${apostrophe}`
        : `${brand.name}${apostrophe}s`;
    })
    .replace(AGENT, (_match, _word: string, plural: string) =>
      plural ? brand.bot.plural : brand.bot.singular,
    );
}

/** A compiled message is a string, or an array of literal strings and `[name, type?, options?]` tokens. */
type CompiledToken = readonly [name: string, type?: unknown, options?: unknown];
export type CompiledMessage = string | ReadonlyArray<string | CompiledToken>;

const BRANCHING = new Set(["plural", "select", "selectordinal"]);

function brandToken(token: CompiledToken, brand: Pick<Brand, "name" | "bot">): CompiledToken {
  const [name, type, options] = token;
  // The variable name and the plural/select keys are identifiers; only the branch texts are copy.
  // Compiled plurals also carry non-text options (`offset: 0`), which pass through untouched.
  if (typeof type === "string" && BRANCHING.has(type) && options && typeof options === "object") {
    const branches = Object.fromEntries(
      Object.entries(options as Record<string, unknown>).map(([key, value]) => [
        key,
        typeof value === "string" || Array.isArray(value)
          ? brandMessage(value as CompiledMessage, brand)
          : value,
      ]),
    );
    return [name, type, branches];
  }
  return token;
}

export function brandMessage(
  message: CompiledMessage,
  brand: Pick<Brand, "name" | "bot">,
): CompiledMessage {
  if (typeof message === "string") return brandText(message, brand);
  return message.map((part) =>
    typeof part === "string" ? brandText(part, brand) : brandToken(part, brand),
  );
}

/** Rebrands every message of a compiled catalog (`id → compiled message`); ids are left as keys. */
export function brandMessages<T extends Record<string, CompiledMessage>>(
  catalog: T,
  brand: Pick<Brand, "name" | "bot">,
): T {
  return Object.fromEntries(
    Object.entries(catalog).map(([id, message]) => [id, brandMessage(message, brand)]),
  ) as T;
}

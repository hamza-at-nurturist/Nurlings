import data from "../brand.json" with { type: "json" };
import { parseBrand } from "./schema.js";

export type { Brand } from "./schema.js";
export {
  BrandConfigError,
  parseBrand,
  REGISTRY_PLACEHOLDER,
  registryIsPlaceholder,
} from "./schema.js";
export type { CompiledMessage } from "./text.js";
export { brandMessage, brandMessages, brandText } from "./text.js";

/** The validated brand configuration. Import this instead of writing the product name. */
export const brand = parseBrand(data);

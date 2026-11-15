/** @jsxRuntime automatic */
import { brand } from "@nurlings/brand";
import type { TransactionalEmail } from "@rakazo/adapter-kit";
import { Link, Text } from "react-email";
import { emailText, greeting, linkStyle, message, withNodes } from "./email.js";

// Store links come from the brand; an unset link is left out rather than pointing elsewhere.
const APPS: Record<string, string> = {};
if (brand.urls.iosApp) APPS.iPhone = brand.urls.iosApp;
if (brand.urls.androidApp) APPS.Android = brand.urls.androidApp;

const stepStyle = { margin: "20px 0 4px" };

export function welcomeEmail(
  user: { email: string; name: string },
  unsubscribeUrl: string,
  locale = "en",
): Promise<TransactionalEmail> {
  const say = emailText(locale);
  return message(
    user.email,
    locale,
    say("Welcome to Rakazo"),
    <>
      <Text>{greeting(say, user.name)}</Text>
      <Text>{say("Welcome to Rakazo")}.</Text>
      {Object.keys(APPS).length > 0 ? (
        <>
          <Text style={stepStyle}>
            <strong>{say("Get the apps")}</strong>
          </Text>
          <Text style={{ marginTop: 0 }}>
            {withNodes(
              say("Rakazo runs on {platforms}, so your bots can reach you wherever you are."),
              {
                // The language's own list ("A, B, and C", "A, B y C"), with each app a link.
                platforms: new Intl.ListFormat(locale, { type: "conjunction" })
                  .formatToParts(Object.keys(APPS))
                  .map((part, index) =>
                    part.type === "element" ? (
                      <Link key={part.value} href={APPS[part.value]} style={linkStyle}>
                        {part.value}
                      </Link>
                    ) : (
                      <span key={`${index}${part.value}`}>{part.value}</span>
                    ),
                  ),
              },
            )}
          </Text>
        </>
      ) : null}
      <Text style={{ marginTop: "28px" }}>{say("Questions? Just reply. I read every one.")}</Text>
      <Text>{brand.company.name}</Text>
    </>,
    unsubscribeUrl,
  );
}

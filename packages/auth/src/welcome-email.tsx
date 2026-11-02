/** @jsxRuntime automatic */
import { brand } from "@nurlings/brand";
import type { TransactionalEmail } from "@rakazo/adapter-kit";
import { Link, Text } from "react-email";
import { emailText, greeting, linkStyle, message } from "./email.js";

// Store links come from the brand; an unset link is left out rather than pointing elsewhere.
const APPS: Record<string, string> = {};
if (brand.urls.iosApp) APPS.iPhone = brand.urls.iosApp;
if (brand.urls.androidApp) APPS.Android = brand.urls.androidApp;

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
      <Text>{say("Thanks for signing up for Rakazo.")}</Text>
      {Object.keys(APPS).length > 0 ? (
        <Text>
          {say("Rakazo also has apps for")}{" "}
          {/* The language's own list ("A, B, and C", "A, B y C"), with each app a link. */}
          {new Intl.ListFormat(locale, { type: "conjunction" })
            .formatToParts(Object.keys(APPS))
            .map((part, index) =>
              part.type === "element" ? (
                <Link key={part.value} href={APPS[part.value]} style={linkStyle}>
                  {part.value}
                </Link>
              ) : (
                <span key={`${index}${part.value}`}>{part.value}</span>
              ),
            )}
          .
        </Text>
      ) : null}
      <Text>{say("Have any questions? Reply to this email.")}</Text>
      <Text>{brand.company.name}</Text>
    </>,
    unsubscribeUrl,
  );
}

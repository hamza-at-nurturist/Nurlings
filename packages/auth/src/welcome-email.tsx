/** @jsxRuntime automatic */
import { brand } from "@nurlings/brand";
import type { TransactionalEmail } from "@rakazo/adapter-kit";
import { Link, Text } from "react-email";
import { emailText, greeting, linkStyle, message, withNodes } from "./email.js";
import { emailCopy } from "./email-copy/deployment-copy.js";

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
  const copy = emailCopy("welcome", locale);
  return message(
    user.email,
    locale,
    copy("subject"),
    <>
      <Text>{greeting(say, user.name)}</Text>
      <Text>{copy("intro")}</Text>
      <Text style={stepStyle}>
        <strong>1. {copy("appsTitle")}</strong>
      </Text>
      <Text style={{ marginTop: 0 }}>
        {withNodes(copy("apps"), {
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
        })}
      </Text>
      <Text style={{ marginTop: "28px" }}>{copy("closing")}</Text>
      <Text>{copy("signature")}</Text>
    </>,
    unsubscribeUrl,
  );
}

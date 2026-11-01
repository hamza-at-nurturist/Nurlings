/** @jsxRuntime automatic */
import { brand } from "@nurlings/brand";
import type { TransactionalEmail } from "@rakazo/adapter-kit";
import { displayName } from "@rakazo/core";
import { Link, Text } from "react-email";
import { linkStyle, message } from "./email.js";

// Store links come from the brand; an unset link is left out rather than pointing elsewhere.
const APPS: Array<[name: string, href: string]> = [];
if (brand.urls.iosApp) APPS.push(["iPhone", brand.urls.iosApp]);
if (brand.urls.androidApp) APPS.push(["Android", brand.urls.androidApp]);

export function welcomeEmail(
  user: { email: string; name: string },
  unsubscribeUrl: string,
): Promise<TransactionalEmail> {
  return message(
    user.email,
    `Welcome to ${brand.name}`,
    <>
      <Text>Hi {displayName(user.name, "there")},</Text>
      <Text>Thanks for signing up for {brand.name}.</Text>
      {APPS.length > 0 ? (
        <Text>
          {brand.name} also has apps for{" "}
          {APPS.map(([name, href], index) => (
            <span key={name}>
              {index === APPS.length - 1 && APPS.length > 1 ? "and " : ""}
              <Link href={href} style={linkStyle}>
                {name}
              </Link>
              {index === APPS.length - 1 ? "." : ", "}
            </span>
          ))}
        </Text>
      ) : null}
      <Text>Have any questions? Reply to this email.</Text>
      <Text>{brand.company.name}</Text>
    </>,
    unsubscribeUrl,
  );
}

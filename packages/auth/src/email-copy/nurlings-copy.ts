import { brand } from "@nurlings/brand";
import type { EmailCopyId } from "./email-keys.js";
import type { CopyByLocale } from "./validate.js";

/**
 * The lifecycle emails' English wording for this product. A deployment that sets EMAIL_COPY_DIR
 * supplies its own instead; any other app language falls back to this English.
 */
export const NURLINGS_EMAIL_COPY: Record<EmailCopyId, CopyByLocale> = {
  welcome: {
    en: {
      subject: `Welcome to ${brand.name}`,
      intro: `Welcome to ${brand.name}.`,
      appsTitle: "Get the apps",
      apps: `${brand.name} runs on {platforms}, so your ${brand.bot.plural} can reach you wherever you are.`,
      closing: "Questions? Just reply. I read every one.",
      signature: brand.company.name,
    },
  },
  referral: {
    en: {
      subject: "Invite a friend",
      body: `Invite a friend to ${brand.name}: they get {weeks} weeks free, and you earn a free month when they start a qualifying subscription with a new card.`,
      link: `Open ${brand.name}`,
      afterLink: "and choose Invite friends for your link.",
      signature: brand.company.name,
    },
  },
  "model-connection": {
    en: {
      subject: `Connect a model to start using ${brand.name}`,
      intro: `Your ${brand.name} plan has started, but your ${brand.bot.plural} can't reply until a model is connected.`,
      connect: "Sign in with your {subscriptions} subscription, or paste an API key.",
      button: "Connect a model",
    },
  },
  "agent-import": {
    en: {
      subject: `Bring your old assistant to ${brand.name}`,
      intro: `Already set up an assistant in {assistants}? ${brand.name} can bring over its instructions, memory, skills and routines as a new ${brand.bot.singular}, so you don't start again.`,
      other: "It works for any other assistant too: send it one prompt and paste its reply.",
      button: "Import an agent",
    },
  },
};

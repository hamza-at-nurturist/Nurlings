import { isMiniAppName, readMiniApp } from "@rakazo/mini-app";

/**
 * What is wrong with a mini app file, in words the bot can act on, or null when the file is fine
 * or is not a mini app. Checked where a bot saves or attaches one so it fixes the file itself
 * instead of leaving the person a screen that says it cannot be shown.
 */
export function miniAppProblem(name: string, bytes: Uint8Array): string | null {
  if (!isMiniAppName(name)) return null;
  const read = readMiniApp(new TextDecoder().decode(bytes));
  if (!("error" in read)) return null;
  return `This mini app cannot be shown: ${read.detail}. Fix the file and attach it again; the Apps skill lists every component and prop.`;
}

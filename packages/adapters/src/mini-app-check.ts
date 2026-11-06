import { isMiniAppName, MINI_APP_SUFFIX, readMiniApp } from "@rakazo/mini-app";

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

/**
 * The name to store an attached file under. A mini app keeps its `.app.json` suffix even when the
 * bot gives it a friendly name, or it would open as plain JSON instead of an app.
 */
export function miniAppAttachName(filePath: string, name: string | undefined): string | undefined {
  if (!name) return undefined;
  return isMiniAppName(filePath) && !isMiniAppName(name) ? `${name}${MINI_APP_SUFFIX}` : name;
}

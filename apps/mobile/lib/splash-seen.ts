import { File, Paths } from "expo-file-system";

// A file in the app's own storage, not the keychain: it goes away when the app is uninstalled, so
// the long splash plays again on the next install.
function seenFile(): File {
  return new File(Paths.document, "nurlings-splash-seen");
}

/** Whether the full splash has already played on this install. Unreadable storage counts as seen. */
export function hasSeenFullSplash(): boolean {
  try {
    return seenFile().exists;
  } catch {
    return true;
  }
}

export function markFullSplashSeen(): void {
  try {
    const file = seenFile();
    if (!file.exists) file.create();
  } catch {
    // The next launch plays the full splash again.
  }
}

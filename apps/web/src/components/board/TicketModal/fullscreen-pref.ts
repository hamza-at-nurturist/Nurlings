/** Whether the ticket modal fills the window, remembered per browser. Default off. */
export const TICKET_FULLSCREEN_KEY = "rakazo.ticket-fullscreen";

export function readTicketFullscreen(): boolean {
  try {
    return window.localStorage.getItem(TICKET_FULLSCREEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeTicketFullscreen(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(TICKET_FULLSCREEN_KEY, "1");
    else window.localStorage.removeItem(TICKET_FULLSCREEN_KEY);
  } catch {
    // Blocked storage: the choice lasts until the modal closes.
  }
}

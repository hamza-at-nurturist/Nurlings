/**
 * Where the Nurlings Board and Ticket screens live. Upstream's own native board owns `/board`, so
 * ours sits under `/nurlings` and every entry (home header, Settings, notifications, deep links)
 * opens these paths.
 */
export const NURLINGS_BOARD_PATH = "/nurlings/board" as const;
export const NURLINGS_TICKET_PATH = "/nurlings/ticket" as const;

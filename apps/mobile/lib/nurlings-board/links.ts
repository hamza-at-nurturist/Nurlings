const BOARD_LINK = /^((?:[a-z][a-z0-9+.-]*:\/\/)?\/?)(board|ticket)(?=$|[/?#])/i;

/**
 * Our Board and Ticket screens live under `/nurlings`, because upstream's own native board owns
 * `/board`. Links written before the move (`rakazo://board`, `rakazo://ticket?ticketId=…`) and
 * push payloads still say `board` and `ticket`, so they are rewritten to the screens that exist.
 */
export function nurlingsBoardPath(path: string): string {
  return path.replace(BOARD_LINK, (_match, prefix: string, screen: string) => {
    return `${prefix}nurlings/${screen.toLowerCase()}`;
  });
}

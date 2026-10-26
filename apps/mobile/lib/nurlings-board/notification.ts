export type TicketRoute = {
  pathname: "/ticket";
  params: { ticketId: string; spaceId?: string };
};

function field(data: Record<string, unknown>, key: string): string | undefined {
  const direct = data[key];
  const prefixed = data[`rakazo.${key}`];
  const value = typeof direct === "string" ? direct : prefixed;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** The ticket screen a notification payload (or a `rakazo://ticket` link's query) opens. */
export function ticketNotificationRoute(data: unknown): TicketRoute | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const ticketId = field(record, "ticketId");
  if (!ticketId) return null;
  const spaceId = field(record, "spaceId");
  return { pathname: "/ticket", params: { ticketId, ...(spaceId ? { spaceId } : {}) } };
}

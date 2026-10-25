import { describe, expect, it } from "vitest";
import { ticketNotificationRoute } from "./notification";

describe("ticketNotificationRoute", () => {
  it("opens the ticket from a push payload, keeping the space", () => {
    expect(
      ticketNotificationRoute({
        kind: "help",
        botId: "b1",
        threadId: "th",
        ticketId: "t1",
        spaceId: "s1",
      }),
    ).toEqual({ pathname: "/ticket", params: { ticketId: "t1", spaceId: "s1" } });
  });

  it("reads rakazo-prefixed keys and leaves the space out when absent", () => {
    expect(ticketNotificationRoute({ "rakazo.ticketId": "t2" })).toEqual({
      pathname: "/ticket",
      params: { ticketId: "t2" },
    });
  });

  it("is null without a ticket id, so chat notifications keep opening the chat", () => {
    expect(ticketNotificationRoute({ botId: "b1", threadId: "th" })).toBeNull();
    expect(ticketNotificationRoute({ ticketId: "  " })).toBeNull();
    expect(ticketNotificationRoute(null)).toBeNull();
    expect(ticketNotificationRoute(["t1"])).toBeNull();
  });
});

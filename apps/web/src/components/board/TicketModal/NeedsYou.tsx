import { Trans } from "@lingui/react/macro";
import { Badge } from "@rakazo/ui-web";

/** A Nurling on this ticket is waiting on the user. Rendered only while that is true. */
export function NeedsYou() {
  return (
    <Badge data-testid="ticket-needs-you" className="bg-warning/15 text-warning">
      <Trans>Needs you</Trans>
    </Badge>
  );
}

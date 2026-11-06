import { botHexColor, resolvePersonaColorDef } from "@rakazo/core";
import type { MentionTarget } from "@rakazo/core/nurlings-board";
import { splitMentions } from "@rakazo/core/nurlings-board";
import { BotAvatar } from "@rakazo/ui-web";
import { MentionChip } from "./MentionChip";

/** A comment that mentions someone: plain text, line breaks kept, with a chip for each mention. */
export function MentionText({ body, targets }: { body: string; targets: MentionTarget[] }) {
  return (
    <p className="whitespace-pre-wrap break-words">
      {splitMentions(body, targets).map((segment, index) =>
        segment.type === "text" ? (
          <span key={index}>{segment.text}</span>
        ) : segment.target.kind === "bot" && segment.target.color ? (
          <BotBadge key={index} target={segment.target} />
        ) : (
          <MentionChip key={index} name={segment.target.name} color={segment.target.color} />
        ),
      )}
    </p>
  );
}

/** A Nurling named in text: its avatar and its name in its color, as in chat replies. */
function BotBadge({ target }: { target: MentionTarget }) {
  const color = target.color ?? "";
  return (
    <span data-testid="bot-mention" className="inline-flex items-baseline gap-1.5 align-baseline">
      <span className="self-center">
        <BotAvatar color={color} identity={target.id} size={18} />
      </span>
      <span
        dir="auto"
        className="font-medium"
        style={{ color: resolvePersonaColorDef(target.id, botHexColor(color) ?? color).hex }}
      >
        {target.name}
      </span>
    </span>
  );
}

import { MentionChip } from "./MentionChip";
import type { MentionTarget } from "./mentions";
import { splitMentions } from "./mentions";

/** A comment that mentions someone: plain text, line breaks kept, with a chip for each mention. */
export function MentionText({ body, targets }: { body: string; targets: MentionTarget[] }) {
  return (
    <p className="whitespace-pre-wrap break-words">
      {splitMentions(body, targets).map((segment, index) =>
        segment.type === "text" ? (
          <span key={index}>{segment.text}</span>
        ) : (
          <MentionChip key={index} name={segment.target.name} color={segment.target.color} />
        ),
      )}
    </p>
  );
}

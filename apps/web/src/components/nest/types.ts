import type { NestSnapshot } from "@rakazo/contracts";

/** Every Nest section renders from the whole snapshot, so a new section needs no wiring beyond this. */
export type NestSectionProps = { snapshot: NestSnapshot };

export function nurlingPath(botId: string, groupId: string | null): string {
  return groupId ? `/app/g/${groupId}` : `/app/${botId}`;
}

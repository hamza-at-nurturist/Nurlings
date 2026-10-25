import { i18n } from "@lingui/core";
import { useLingui } from "@lingui/react/macro";
import { Button, Calendar, Input, Popover, PopoverContent, PopoverTrigger } from "@rakazo/ui-web";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { CHIP } from "./chip";
import type { RelativeDayLabels } from "./dates";
import { formatTicketDate, localDate, localTime, quickPickDates } from "./dates";

type Value = { at: string; hasTime: boolean } | null;

type Props = {
  label: string;
  value: Value;
  timeZone: string;
  disabled: boolean;
  overdue?: boolean;
  testId: string;
  /** A 44px pill on the narrow sheet, naming itself while empty. */
  chip?: boolean;
  /** A local `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` in `timeZone`, or null to clear. */
  onChange: (value: string | null) => void;
};

const TRIGGER =
  "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const PICK = "h-8 justify-start px-2 font-normal";

export function useRelativeDayLabels(): RelativeDayLabels {
  const { t } = useLingui();
  return { today: t`Today`, tomorrow: t`Tomorrow`, yesterday: t`Yesterday` };
}

/** One picker for a ticket's start or due: quick picks, a calendar, an optional time, no date. */
export function DatePicker({
  label,
  value,
  timeZone,
  disabled,
  overdue,
  testId,
  chip = false,
  onChange,
}: Props) {
  const { t } = useLingui();
  const labels = useRelativeDayLabels();
  const [open, setOpen] = useState(false);
  const [showTime, setShowTime] = useState(Boolean(value?.hasTime));
  const at = value ? new Date(value.at) : null;
  const [time, setTime] = useState(at && value?.hasTime ? localTime(at, timeZone) : "");
  const date = at ? localDate(at, timeZone) : null;
  const current =
    at && date ? (value?.hasTime ? `${date}T${localTime(at, timeZone)}` : date) : null;
  const now = new Date();
  const picks = quickPickDates(now, timeZone);

  function pick(day: string) {
    onChange(showTime && time ? `${day}T${time}` : day);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        aria-label={label}
        data-testid={testId}
        className={`${chip ? CHIP : `${TRIGGER} -ml-2.5`} ${overdue ? "text-destructive" : ""}`}
      >
        {chip ? (
          <CalendarDays size={15} aria-hidden="true" className="text-muted-foreground" />
        ) : null}
        {value ? (
          formatTicketDate(value, now, timeZone, labels, i18n.locale || "en")
        ) : chip ? (
          <span className="text-muted-foreground">{label}</span>
        ) : (
          <CalendarDays size={15} aria-hidden="true" className="text-muted-foreground" />
        )}
      </PopoverTrigger>
      {open ? (
        <PopoverContent align="start" className="w-auto gap-1 p-2">
          <div className="grid grid-cols-2 gap-1">
            <Button variant="ghost" size="sm" className={PICK} onClick={() => pick(picks.today)}>
              {labels.today}
            </Button>
            <Button variant="ghost" size="sm" className={PICK} onClick={() => pick(picks.tomorrow)}>
              {labels.tomorrow}
            </Button>
            <Button variant="ghost" size="sm" className={PICK} onClick={() => pick(picks.weekend)}>
              {t`This weekend`}
            </Button>
            <Button variant="ghost" size="sm" className={PICK} onClick={() => pick(picks.nextWeek)}>
              {t`Next week`}
            </Button>
          </div>
          <Calendar
            mode="single"
            timeZone={timeZone}
            selected={at ?? undefined}
            defaultMonth={at ?? undefined}
            onSelect={(day) => {
              if (day) pick(localDate(day, timeZone));
            }}
          />
          {showTime ? (
            <Input
              type="time"
              aria-label={t`Time`}
              data-testid={`${testId}-time`}
              value={time}
              onChange={(event) => setTime(event.target.value)}
              onBlur={() => {
                if (!date) return;
                const next = time ? `${date}T${time}` : date;
                if (next !== current) onChange(next);
              }}
            />
          ) : (
            <Button variant="ghost" size="sm" className={PICK} onClick={() => setShowTime(true)}>
              {t`Add time`}
            </Button>
          )}
          {value ? (
            <Button
              variant="ghost"
              size="sm"
              className={PICK}
              onClick={() => {
                onChange(null);
                setTime("");
                setShowTime(false);
                setOpen(false);
              }}
            >
              {t`No date`}
            </Button>
          ) : null}
        </PopoverContent>
      ) : null}
    </Popover>
  );
}

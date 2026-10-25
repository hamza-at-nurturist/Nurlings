import type { Ticket } from "@rakazo/contracts";
import { TICKET_DESCRIPTION_MAX_LENGTH } from "@rakazo/contracts";
import { mergeActivity } from "@rakazo/core/nurlings-board";
import { fontWeight, typeScale } from "@rakazo/ui-tokens";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { glassHeaderOptions } from "../../components/glass-title";
import { NativeActionButton } from "../../components/native-action-button";
import { NativeSegmentedControl } from "../../components/native-segmented-control";
import { ActivityFeed } from "../../components/nurlings-board/activity-feed";
import { ReplyComposer } from "../../components/nurlings-board/reply-composer";
import { TicketFiles } from "../../components/nurlings-board/ticket-files";
import type { PropertiesPatch } from "../../components/nurlings-board/ticket-properties";
import { TicketProperties } from "../../components/nurlings-board/ticket-properties";
import { rpc } from "../../lib/api";
import { useFloatingHeaderInset, useHeaderHeightIfAny } from "../../lib/floating-header";
import { dateLocaleForUi, useI18n } from "../../lib/i18n";
import { useMobileTokens } from "../../lib/native";
import { iosAtLeast } from "../../lib/native-controls";
import { useNurlingsBoardEnabled } from "../../lib/nurlings-board/enabled";
import {
  useBoardBots,
  useBoardMe,
  useBoardStream,
  useRevisions,
} from "../../lib/nurlings-board/live";
import { useTicketSpace } from "../../lib/nurlings-board/space";
import { useTicketActivity } from "../../lib/nurlings-board/ticket-activity";
import { errorText } from "../../lib/user-error";

type Segment = "ticket" | "activity";

/** One ticket: its properties and files on the Ticket segment, its feed and reply box on Activity. */
export default function TicketScreen() {
  const params = useLocalSearchParams<{
    ticketId?: string | string[];
    spaceId?: string | string[];
  }>();
  const ticketId = (Array.isArray(params.ticketId) ? params.ticketId[0] : params.ticketId) ?? "";
  const space = useTicketSpace(params.spaceId);
  const enabled = useNurlingsBoardEnabled();
  const router = useRouter();
  const tokens = useMobileTokens();
  const { t } = useI18n();

  useEffect(() => {
    if (enabled === false) router.replace("/");
  }, [enabled, router]);

  if (space === "failed" || !ticketId) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.background }]}>
        <Text style={[typeScale.body, { color: tokens.mutedForeground }]}>
          {t("Something went wrong. Try again.")}
        </Text>
      </View>
    );
  }
  if (space !== "ready" || enabled !== true) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.background }]}>
        <ActivityIndicator color={tokens.foreground} />
      </View>
    );
  }
  return <TicketView ticketId={ticketId} />;
}

function TicketView({ ticketId }: { ticketId: string }) {
  const { t, locale } = useI18n();
  const tokens = useMobileTokens();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const topInset = useFloatingHeaderInset();
  const headerHeight = useHeaderHeightIfAny();
  const [segment, setSegment] = useState<Segment>("ticket");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const revisions = useRevisions();
  const revision = revisions.get(ticketId);
  const bots = useBoardBots(revision);
  const { timeZone, viewer } = useBoardMe();
  const activity = useTicketActivity(ticketId, revision);

  const load = useCallback(async () => {
    setTicket(await rpc<Ticket>("tickets/get", { id: ticketId }));
  }, [ticketId]);
  useEffect(() => {
    void load().then(
      () => setError(""),
      (cause) => setError(errorText(cause)),
    );
  }, [load, revision]);

  useBoardStream({
    onOpen: () => revisions.bump(ticketId),
    onChange: (event) => {
      if (!event.ticketId || event.ticketId === ticketId) revisions.bump(ticketId);
    },
    onError: () => undefined,
  });

  useLayoutEffect(() => {
    const title = segment === "ticket" ? (ticket?.ref ?? "") : (ticket?.title ?? "");
    navigation.setOptions(glassHeaderOptions(title));
  }, [navigation, segment, ticket?.ref, ticket?.title]);

  const items = useMemo(
    () =>
      ticket
        ? mergeActivity(ticket, activity.events, activity.comments, activity.files, activity.runs)
        : [],
    [ticket, activity.events, activity.comments, activity.files, activity.runs],
  );

  async function save(patch: PropertiesPatch | { title: string } | { description: string | null }) {
    if (!ticket) return;
    setBusy(true);
    setError("");
    try {
      setTicket(await rpc<Ticket>("tickets/update", { id: ticket.id, ...patch }));
      activity.refresh();
    } catch (cause) {
      setError(errorText(cause));
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!ticket) return;
    setBusy(true);
    setError("");
    try {
      setTicket(await rpc<Ticket>("tickets/approve", { id: ticket.id }));
      activity.refresh();
    } catch (cause) {
      setError(errorText(cause));
      await load().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  if (!ticket) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.background }]}>
        {error ? (
          <Text style={[typeScale.body, { color: tokens.destructive }]}>{error}</Text>
        ) : (
          <ActivityIndicator color={tokens.foreground} />
        )}
      </View>
    );
  }

  const latest = items.findLast(
    (item): item is Extract<(typeof items)[number], { kind: "comment" }> =>
      item.kind === "comment" && item.comment.body.trim().length > 0,
  );
  const latestName = latest
    ? latest.comment.authorBotId
      ? (bots.find((bot) => bot.id === latest.comment.authorBotId)?.name ??
        latest.comment.authorName ??
        t("Someone"))
      : latest.comment.authorUserId === viewer.id
        ? t("You")
        : (latest.comment.authorName ?? t("Someone"))
    : "";

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={iosAtLeast(26) ? 0 : headerHeight}
      style={{ flex: 1, backgroundColor: tokens.background, paddingTop: topInset }}
    >
      <View style={styles.segments}>
        <NativeSegmentedControl<Segment>
          accessibilityLabel={t("Ticket sections")}
          value={segment}
          onChange={setSegment}
          options={[
            { value: "ticket", label: t("Ticket") },
            { value: "activity", label: t("Activity") },
          ]}
        />
      </View>
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[
            typeScale.caption,
            { color: tokens.destructive, paddingHorizontal: 20, paddingBottom: 6 },
          ]}
        >
          {error}
        </Text>
      ) : null}

      {/* Both segments stay mounted, so a draft, staged files and scroll survive switching. */}
      <View style={[styles.panel, segment !== "ticket" && styles.hidden]}>
        <ScrollView contentContainerStyle={styles.ticket} keyboardShouldPersistTaps="handled">
          <TitleField
            value={ticket.title}
            disabled={busy}
            onSave={(title) => void save({ title })}
          />
          <TicketProperties
            ticket={ticket}
            bots={bots}
            timeZone={timeZone}
            disabled={busy}
            onChange={(patch) => void save(patch)}
          />
          {latest ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setSegment("activity")}
              style={[styles.latest, { backgroundColor: tokens.card, borderColor: tokens.border }]}
            >
              <Text
                numberOfLines={1}
                style={[typeScale.secondary, { color: tokens.foreground, flex: 1 }]}
              >
                <Text style={{ fontWeight: fontWeight.semibold }}>{latestName}:</Text>{" "}
                {latest.comment.body.replace(/\s+/g, " ")}
              </Text>
              <Text style={[typeScale.footnote, { color: tokens.mutedForeground }]}>
                {new Date(latest.at).toLocaleTimeString(dateLocaleForUi(locale), {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </Pressable>
          ) : null}
          <DescriptionField
            value={ticket.description ?? ""}
            label={t("Description")}
            showMore={t("Show more")}
            disabled={busy}
            onSave={(description) => void save({ description: description || null })}
          />
          <TicketFiles files={activity.files} label={t("Files")} />
        </ScrollView>
        {ticket.status === "review" ? (
          <View style={[styles.approve, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <NativeActionButton
              label={t("Approve")}
              prominence="primary"
              busy={busy}
              onPress={() => void approve()}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.panel, segment !== "activity" && styles.hidden]}>
        <ActivityFeed
          items={items}
          bots={bots}
          viewer={viewer}
          files={activity.files}
          runs={activity.runs}
          ownerBotId={ticket.assigneeBotId}
        />
        <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
          <ReplyComposer
            ticketId={ticket.id}
            ownerBotId={ticket.assigneeBotId}
            bots={bots}
            onSent={(comment) => {
              activity.addComment(comment);
              activity.refresh();
            }}
            onError={setError}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** The title, big; tapping edits it in place and leaving the field saves a changed one. */
function TitleField({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (title: string) => void;
}) {
  const tokens = useMobileTokens();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <TextInput
      accessibilityLabel={value}
      value={draft}
      multiline
      editable={!disabled}
      scrollEnabled={false}
      onChangeText={setDraft}
      onBlur={() => {
        const next = draft.trim();
        if (!next) setDraft(value);
        else if (next !== value) onSave(next);
      }}
      style={[typeScale.title, styles.title, { color: tokens.foreground }]}
    />
  );
}

/** Three lines with Show more when it overflows; tapping the text edits it in place. */
function DescriptionField({
  value,
  label,
  showMore,
  disabled,
  onSave,
}: {
  value: string;
  label: string;
  showMore: string;
  disabled: boolean;
  onSave: (description: string) => void;
}) {
  const tokens = useMobileTokens();
  const [editing, setEditing] = useState(value.trim().length === 0);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <View style={styles.description}>
      <Text
        style={[typeScale.caption, { color: tokens.mutedForeground }]}
        accessibilityRole="header"
      >
        {label}
      </Text>
      {editing ? (
        <TextInput
          accessibilityLabel={label}
          value={draft}
          multiline
          autoFocus={value.trim().length > 0}
          editable={!disabled}
          maxLength={TICKET_DESCRIPTION_MAX_LENGTH}
          onChangeText={setDraft}
          onBlur={() => {
            setEditing(value.trim().length === 0 && draft.trim().length === 0);
            if (draft !== value) onSave(draft);
          }}
          style={[typeScale.body, { color: tokens.foreground, padding: 0 }]}
        />
      ) : (
        <>
          <Pressable
            onPress={() => !disabled && setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Text
              numberOfLines={expanded ? undefined : 3}
              style={[typeScale.body, { color: tokens.foreground }]}
            >
              {value}
            </Text>
          </Pressable>
          {/* A copy with no line limit measures whether the text needs "Show more". */}
          <Text
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            onTextLayout={(event) => setOverflows(event.nativeEvent.lines.length > 3)}
            style={[typeScale.body, styles.measure]}
          >
            {value}
          </Text>
          {overflows && !expanded ? (
            <Pressable accessibilityRole="button" onPress={() => setExpanded(true)}>
              <Text style={[typeScale.caption, { color: tokens.mutedForeground }]}>{showMore}</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  segments: { paddingHorizontal: 16, paddingVertical: 8 },
  panel: { flex: 1 },
  hidden: { display: "none" },
  ticket: { padding: 20, gap: 16 },
  title: { padding: 0 },
  latest: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  description: { gap: 8 },
  measure: { position: "absolute", opacity: 0, left: 0, right: 0 },
  approve: { paddingHorizontal: 16, paddingTop: 12 },
});

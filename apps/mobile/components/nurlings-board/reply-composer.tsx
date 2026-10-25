import type { MenuAction } from "@expo/ui/community/menu";
import { MenuView } from "@expo/ui/community/menu";
import type { Bot, TicketComment } from "@rakazo/contracts";
import { attachmentMaxBytes, TICKET_COMMENT_MAX_LENGTH } from "@rakazo/contracts";
import { typeScale } from "@rakazo/ui-tokens";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { rpc } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { useMobileTokens, useResolvedAppearance } from "../../lib/native";
import type { PickedAttachment } from "../../lib/pick-attachments";
import { pickDocuments, pickFromLibrary, takePhoto } from "../../lib/pick-attachments";
import { errorText } from "../../lib/user-error";
import { NativeSymbol } from "../native-symbol";
import { ComposerBar } from "./composer-bar";

const UPLOAD_TIMEOUT_MS = 120_000;

/**
 * The reply box on the Activity segment: text with `@` mentions, and attach with the chat
 * composer's pickers. Files upload for the ticket's owner and go with the comment.
 */
export function ReplyComposer({
  ticketId,
  ownerBotId,
  bots,
  onSent,
  onError,
}: {
  ticketId: string;
  /** Uploads belong to the ticket's owner; without one there is no attach control. */
  ownerBotId: string | null;
  bots: Bot[];
  onSent: (comment: TicketComment) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const tokens = useMobileTokens();
  const scheme = useResolvedAppearance();
  const [staged, setStaged] = useState<PickedAttachment[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const attachActions: MenuAction[] = [
    { id: "library", title: t("Photo library"), image: "photo.on.rectangle" },
    { id: "camera", title: t("Camera"), image: "camera" },
    { id: "file", title: t("File"), image: "doc" },
  ];

  async function attach(source: string) {
    const picker =
      source === "library" ? pickFromLibrary : source === "camera" ? takePhoto : pickDocuments;
    try {
      const result = await picker(staged.length, attachmentMaxBytes());
      setStaged((current) => [...current, ...result.attachments]);
      setNotice(
        result.skipped.length
          ? t("Skipped {names}", { names: result.skipped.map((s) => s.name).join(", ") })
          : "",
      );
    } catch (cause) {
      onError(errorText(cause));
    }
  }

  return (
    <ComposerBar
      testID="reply-composer"
      bots={bots}
      busy={busy}
      sendWithoutText={staged.length > 0}
      maxLength={TICKET_COMMENT_MAX_LENGTH}
      placeholder={t("Reply")}
      left={
        ownerBotId ? (
          <MenuView
            actions={attachActions}
            colorScheme={scheme}
            onPressAction={({ nativeEvent }) => void attach(nativeEvent.event)}
          >
            <View
              accessible
              accessibilityRole="button"
              accessibilityLabel={t("Attach file")}
              style={[styles.attach, { backgroundColor: tokens.muted }]}
            >
              <NativeSymbol ios="plus" android="add" size={18} color={tokens.mutedForeground} />
            </View>
          </MenuView>
        ) : null
      }
      above={
        staged.length || notice ? (
          <View style={styles.staged}>
            {notice ? (
              <Text style={[typeScale.footnote, { color: tokens.mutedForeground }]}>{notice}</Text>
            ) : null}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {staged.map((file) => (
                <Pressable
                  key={file.id}
                  accessibilityRole="button"
                  accessibilityLabel={t("Remove {name}", { name: file.name })}
                  onPress={() =>
                    setStaged((current) => current.filter((row) => row.id !== file.id))
                  }
                  style={[styles.chip, { backgroundColor: tokens.muted }]}
                >
                  <Text
                    numberOfLines={1}
                    style={[typeScale.footnote, { color: tokens.foreground, maxWidth: 160 }]}
                  >
                    {file.name}
                  </Text>
                  <NativeSymbol
                    ios="xmark"
                    android="close"
                    size={10}
                    color={tokens.mutedForeground}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null
      }
      onSend={async ({ text, mentions }) => {
        setBusy(true);
        onError("");
        try {
          const artifactIds: string[] = [];
          for (const file of staged) {
            const artifact = await rpc<{ id: string }>(
              "artifacts/create",
              {
                botId: ownerBotId,
                name: file.name,
                mimeType: file.mimeType,
                contentBase64: file.contentBase64,
              },
              { timeoutMs: UPLOAD_TIMEOUT_MS },
            );
            artifactIds.push(artifact.id);
          }
          const comment = await rpc<TicketComment>("tickets/comment", {
            ticketId,
            body: text,
            ...(mentions.length
              ? { mentions: mentions.map((bot) => ({ kind: "bot" as const, id: bot.id })) }
              : {}),
            ...(artifactIds.length ? { artifactIds } : {}),
          });
          onSent(comment);
          setStaged([]);
          setNotice("");
          return true;
        } catch (cause) {
          onError(errorText(cause));
          return false;
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  attach: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  staged: { paddingHorizontal: 12, gap: 6 },
  chips: { gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 32,
  },
});

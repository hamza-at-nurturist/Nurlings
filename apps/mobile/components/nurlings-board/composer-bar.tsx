import type { Bot } from "@rakazo/contracts";
import { typeScale } from "@rakazo/ui-tokens";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useI18n } from "../../lib/i18n";
import { useMobileTokens } from "../../lib/native";
import type { MentionInputState } from "../../lib/nurlings-board/mention-input";
import {
  emptyMentionInput,
  mentionedBots,
  moveCaret,
  pickBot,
  pickerOptions,
  typeText,
} from "../../lib/nurlings-board/mention-input";
import { NativeSymbol } from "../native-symbol";
import { MentionOptions } from "./mention-options";

export type ComposerSend = { text: string; mentions: Bot[]; picked: Bot[] };

/**
 * A text box pinned above the keyboard that offers the space's Nurlings after an `@`. The board's
 * quick-add and the ticket's reply box are both this, with different things beside the text.
 */
export function ComposerBar({
  bots,
  placeholder,
  maxLength,
  busy,
  sendWithoutText = false,
  left,
  above,
  onSend,
  testID,
}: {
  bots: Bot[];
  placeholder: string;
  maxLength: number;
  busy: boolean;
  /** Something else (staged files) is enough to send. */
  sendWithoutText?: boolean;
  left?: ReactNode;
  above?: ReactNode;
  /** Resolves true when the text was used; a false keeps it for another try. */
  onSend: (input: ComposerSend) => Promise<boolean>;
  testID?: string;
}) {
  const { t } = useI18n();
  const tokens = useMobileTokens();
  const [state, setState] = useState<MentionInputState>(emptyMentionInput);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>();
  const options = pickerOptions(state, bots);
  const canSend = !busy && (state.text.trim().length > 0 || sendWithoutText);

  async function send() {
    if (!canSend) return;
    const used = await onSend({
      text: state.text,
      mentions: mentionedBots(state),
      picked: state.picked,
    });
    if (used) {
      setState(emptyMentionInput);
      setSelection(undefined);
    }
  }

  return (
    <View>
      <MentionOptions
        bots={options}
        onPick={(bot) => {
          const next = pickBot(state, bot);
          setState(next);
          setSelection({ start: next.caret, end: next.caret });
        }}
      />
      {above}
      <View style={styles.row}>
        {left}
        <TextInput
          testID={testID}
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          placeholderTextColor={tokens.faintForeground}
          value={state.text}
          multiline
          maxLength={maxLength}
          editable={!busy}
          selection={selection}
          onChangeText={(text) => setState((current) => typeText(current, text))}
          onSelectionChange={({ nativeEvent }) => {
            setSelection(undefined);
            setState((current) => moveCaret(current, nativeEvent.selection.start));
          }}
          style={[
            typeScale.body,
            styles.input,
            { color: tokens.foreground, backgroundColor: tokens.card, borderColor: tokens.border },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Send")}
          disabled={!canSend}
          onPress={() => void send()}
          style={[styles.send, { backgroundColor: tokens.primary, opacity: canSend ? 1 : 0.4 }]}
        >
          <NativeSymbol
            ios="arrow.up"
            android="arrow-up"
            size={18}
            color={tokens.primaryForeground}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});

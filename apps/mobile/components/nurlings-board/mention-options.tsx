import type { Bot } from "@rakazo/contracts";
import { typeScale } from "@rakazo/ui-tokens";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../lib/i18n";
import { useMobileTokens } from "../../lib/native";
import { MentionOptionIcon } from "../thread-composer";

/** The Nurlings an `@` offers, in the look of the chat composer's list. */
export function MentionOptions({
  bots,
  onPick,
}: {
  bots: readonly Bot[];
  onPick: (bot: Bot) => void;
}) {
  const { t } = useI18n();
  const tokens = useMobileTokens();
  if (bots.length === 0) return null;
  return (
    <ScrollView
      testID="mention-picker"
      keyboardShouldPersistTaps="handled"
      style={[styles.list, { borderColor: tokens.border, backgroundColor: tokens.card }]}
    >
      {bots.map((bot) => (
        <Pressable
          key={bot.id}
          accessibilityRole="button"
          accessibilityLabel={t("@{name}", { name: bot.name })}
          onPress={() => onPick(bot)}
          style={styles.row}
        >
          <MentionOptionIcon
            mention={{ kind: "bot", id: bot.id, name: bot.name, color: bot.color }}
          />
          <View style={styles.name}>
            <Text style={[typeScale.secondary, { color: tokens.foreground }]}>@{bot.name}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
    flexShrink: 1,
    maxHeight: 220,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  name: { flex: 1, minWidth: 0 },
});

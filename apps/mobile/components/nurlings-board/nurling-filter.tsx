import type { Bot } from "@rakazo/contracts";
import { fontWeight, typeScale } from "@rakazo/ui-tokens";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useI18n } from "../../lib/i18n";
import { useMobileTokens } from "../../lib/native";
import { BotAvatar } from "../bot-avatar";

/** All, then one avatar per Nurling; choosing one shows only its tickets. */
export function NurlingFilter({
  bots,
  value,
  onChange,
}: {
  bots: Bot[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { t } = useI18n();
  const tokens = useMobileTokens();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: value === null }}
        onPress={() => onChange(null)}
        style={[styles.all, { backgroundColor: value === null ? tokens.primary : "transparent" }]}
      >
        <Text
          style={[
            typeScale.caption,
            {
              fontWeight: fontWeight.medium,
              color: value === null ? tokens.primaryForeground : tokens.mutedForeground,
            },
          ]}
        >
          {t("All")}
        </Text>
      </Pressable>
      {bots.map((bot) => (
        <Pressable
          key={bot.id}
          accessibilityRole="button"
          accessibilityLabel={bot.name}
          accessibilityState={{ selected: value === bot.id }}
          onPress={() => onChange(value === bot.id ? null : bot.id)}
          style={[
            styles.avatar,
            { borderColor: value === bot.id ? tokens.foreground : "transparent" },
          ]}
        >
          <BotAvatar
            color={bot.color}
            identity={bot.id}
            size={28}
            status={bot.status}
            motion="lazy"
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 6 },
  all: { height: 36, borderRadius: 18, paddingHorizontal: 14, justifyContent: "center" },
  avatar: {
    minWidth: 44,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});

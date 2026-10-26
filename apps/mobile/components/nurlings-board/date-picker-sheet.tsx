import DateTimePicker from "@expo/ui/community/datetime-picker";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useMobileTokens, useResolvedAppearance } from "../../lib/native";
import { pickedDateInput } from "../../lib/nurlings-board/date-input";

/**
 * The platform's date picker: a calendar sheet on iOS, the Material dialog on Android. Picking a
 * day hands back `YYYY-MM-DD` and closes.
 */
export function DatePickerSheet({
  value,
  onPick,
  onClose,
}: {
  value: Date;
  onPick: (date: string) => void;
  onClose: () => void;
}) {
  const tokens = useMobileTokens();
  const scheme = useResolvedAppearance();
  const picker = (
    <DateTimePicker
      mode="date"
      value={value}
      display={Platform.OS === "ios" ? "inline" : "default"}
      presentation="dialog"
      themeVariant={scheme}
      accentColor={tokens.foreground}
      onValueChange={(_event, date) => {
        onPick(pickedDateInput(date));
        onClose();
      }}
      onDismiss={onClose}
    />
  );
  if (Platform.OS !== "ios") return picker;
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button">
        <View style={[styles.card, { backgroundColor: tokens.dialog }]}>{picker}</View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  card: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 12, paddingBottom: 28 },
});

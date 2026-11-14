import { ph } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { BotAvatarSet } from "@rakazo/contracts";
import { BOT_COLORS } from "@rakazo/contracts";
import {
  botLookState,
  botLookWithColor,
  botLookWithShape,
  PICKABLE_ORGANIC_SHAPE_INDEXES,
  PINNED_FAMILY_FIRST_SHAPE_INDEX,
} from "@rakazo/core";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useMobileTokens } from "../lib/native";
import { BotAvatar } from "./bot-avatar";

/**
 * The shape grid and color row for a bot's look, as on web. With `organicIdentities`, the grid
 * offers the organic body each identity draws (for a bot that has no id yet); without them,
 * "Default" restores the bot's own organic body.
 */
export function BotLookPicker({
  value,
  identity,
  organicIdentities,
  avatarSet,
  disabled = false,
  onChange,
}: {
  value: string;
  identity?: string;
  organicIdentities?: readonly string[];
  avatarSet: BotAvatarSet;
  /** While the look is being saved, so what is shown stays what is saved. */
  disabled?: boolean;
  onChange: (value: string, identity?: string) => void;
}) {
  const { t } = useLingui();
  const tokens = useMobileTokens();
  const { photo, shapeIndex: shape, color, defaultLook } = botLookState(value);
  const labeled = !organicIdentities;
  // The family bodies are the identities' own previews when those are offered, so only the brand
  // blob and the original bodies come from the shapes.
  const offeredShapes = organicIdentities
    ? PICKABLE_ORGANIC_SHAPE_INDEXES.filter((index) => index < PINNED_FAMILY_FIRST_SHAPE_INDEX)
    : PICKABLE_ORGANIC_SHAPE_INDEXES;

  return (
    <View style={{ gap: 20 }}>
      {avatarSet === "organic" ? (
        <View>
          {labeled ? <Label>{t`Shape`}</Label> : null}
          <View accessibilityRole="radiogroup" style={grid}>
            {offeredShapes.map((shapeIndex, position) => (
              <Choice
                disabled={disabled}
                key={shapeIndex}
                label={t`Shape ${ph({ number: position + 1 })}`}
                selected={shape === shapeIndex}
                onPress={() => onChange(botLookWithShape(color, shapeIndex))}
              >
                <BotAvatar
                  color={botLookWithShape(color, shapeIndex)}
                  identity={identity}
                  size={40}
                />
              </Choice>
            ))}
            {organicIdentities ? (
              organicIdentities.map((organic, index) => (
                <Choice
                  disabled={disabled}
                  key={organic}
                  label={t`Shape ${ph({ number: offeredShapes.length + index + 1 })}`}
                  selected={defaultLook && identity === organic}
                  onPress={() => onChange(color, organic)}
                >
                  <BotAvatar color={color} identity={organic} size={40} />
                </Choice>
              ))
            ) : (
              <Choice
                disabled={disabled}
                label={t`Default`}
                selected={defaultLook}
                onPress={() => onChange(color)}
              >
                <BotAvatar color={color} identity={identity} size={40} />
              </Choice>
            )}
          </View>
        </View>
      ) : null}
      <View>
        {labeled ? <Label>{t`Color`}</Label> : null}
        <View accessibilityRole="radiogroup" style={grid}>
          {BOT_COLORS.map((option, index) => {
            const selected = !photo && color.toLowerCase() === option.toLowerCase();
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={t`Color ${ph({ number: index + 1 })}`}
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                onPress={() => onChange(botLookWithColor(value, option))}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  padding: 3,
                  borderWidth: 2,
                  borderColor: selected ? tokens.foreground : "transparent",
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 20,
                    backgroundColor: option,
                    borderWidth: 1,
                    borderColor: tokens.border,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const grid = {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 10,
} as const;

function Label({ children }: { children: string }) {
  const tokens = useMobileTokens();
  return (
    <Text style={{ color: tokens.mutedForeground, fontSize: 14, marginBottom: 8 }}>{children}</Text>
  );
}

function Choice({
  disabled,
  label,
  selected,
  onPress,
  children,
}: {
  disabled: boolean;
  label: string;
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const tokens = useMobileTokens();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        padding: 4,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: selected ? tokens.foreground : "transparent",
      }}
    >
      {children}
    </Pressable>
  );
}

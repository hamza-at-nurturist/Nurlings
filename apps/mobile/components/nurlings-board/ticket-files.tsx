import type { Artifact } from "@rakazo/contracts";
import { formatFileSize } from "@rakazo/core";
import { isTicketImage, shortFileType } from "@rakazo/core/nurlings-board";
import { typeScale } from "@rakazo/ui-tokens";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { imageArtifactUri, openMobileArtifact } from "../../lib/artifact-open";
import { useMobileTokens } from "../../lib/native";

type TicketFile = Pick<Artifact, "id" | "name" | "mimeType" | "size"> & { botId: string };

/** A square image thumbnail; tapping it opens the app's image viewer. */
export function ImageThumb({ file, size }: { file: TicketFile; size?: number }) {
  const router = useRouter();
  const tokens = useMobileTokens();
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void imageArtifactUri({ botId: file.botId }, file.id, file.mimeType)
      .then((next) => {
        if (active) setUri(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [file.botId, file.id, file.mimeType]);
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={file.name}
      onPress={() =>
        router.push({
          pathname: "/image",
          params: {
            artifactId: file.id,
            name: file.name,
            mimeType: file.mimeType,
            botId: file.botId,
          },
        })
      }
      style={[
        size ? { width: size, height: size } : styles.thumb,
        { backgroundColor: tokens.muted },
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Text
          numberOfLines={2}
          style={[typeScale.footnote, styles.thumbName, { color: tokens.mutedForeground }]}
        >
          {file.name}
        </Text>
      )}
    </Pressable>
  );
}

/** A non-image file; tapping it opens it like a chat file. */
export function FileRow({ file, producer }: { file: TicketFile; producer?: string | null }) {
  const tokens = useMobileTokens();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={file.name}
      onPress={() =>
        void openMobileArtifact({ botId: file.botId }, file.id, file.name, file.mimeType).catch(
          () => undefined,
        )
      }
      style={[styles.file, { backgroundColor: tokens.card, borderColor: tokens.border }]}
    >
      <View style={[styles.type, { backgroundColor: tokens.muted }]}>
        <Text style={[typeScale.footnote, { color: tokens.foreground }]}>
          {shortFileType(file.name, file.mimeType)}
        </Text>
      </View>
      <View style={styles.fileText}>
        <Text numberOfLines={1} style={[typeScale.secondary, { color: tokens.foreground }]}>
          {file.name}
        </Text>
        <Text style={[typeScale.footnote, { color: tokens.mutedForeground }]}>
          {producer ? `${producer} · ` : ""}
          {formatFileSize(file.size)}
        </Text>
      </View>
    </Pressable>
  );
}

/** The ticket's files: images as a three-column thumbnail grid, the rest as cards. */
export function TicketFiles({ files, label }: { files: Artifact[]; label: string }) {
  const tokens = useMobileTokens();
  const owned = files.flatMap((file) => (file.botId ? [{ ...file, botId: file.botId }] : []));
  if (owned.length === 0) return null;
  const images = owned.filter((file) => isTicketImage(file.mimeType));
  const others = owned.filter((file) => !isTicketImage(file.mimeType));
  return (
    <View style={styles.section}>
      <Text
        style={[typeScale.caption, { color: tokens.mutedForeground }]}
        accessibilityRole="header"
      >
        {label}
      </Text>
      {images.length ? (
        <View style={styles.grid}>
          {images.map((file) => (
            <ImageThumb key={file.id} file={file} />
          ))}
        </View>
      ) : null}
      {others.map((file) => (
        <FileRow key={file.id} file={file} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  // Three columns inside the 20pt side padding and two 8pt gaps.
  thumb: {
    width: "31.5%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    padding: 6,
    justifyContent: "flex-end",
  },
  thumbName: {},
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  type: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fileText: { flex: 1, minWidth: 0 },
});

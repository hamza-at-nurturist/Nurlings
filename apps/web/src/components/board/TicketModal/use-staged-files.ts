import { useLingui } from "@lingui/react/macro";
import { ATTACHMENT_MAX_COUNT, attachmentMaxBytes, attachmentSizeLabel } from "@rakazo/contracts";
import { inferAttachmentMimeType } from "@rakazo/core";
import { useCallback, useState } from "react";
import { getMaxUploadSizeBytes } from "../../../lib/bootstrap";
import {
  readFileAsBase64,
  revokePendingAttachmentPreviews,
  usePendingAttachmentPreviewCleanup,
} from "../../../lib/pending-attachments";
import { canPrepareImage, prepareImage } from "../../../lib/prepare-image";
import { rpc } from "../../../lib/rpc";

export type StagedFile = { id: string; file: File; previewUrl?: string };

/**
 * Files waiting in the reply box, checked and uploaded the way the chat composer does it. Nothing
 * uploads until `upload`, which stores each file for the ticket's owner and returns the ids.
 */
export function useStagedFiles() {
  const { t } = useLingui();
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  usePendingAttachmentPreviewCleanup(staged);

  const add = useCallback(
    (files: FileList | File[] | null) => {
      if (!files?.length) return;
      const maxBytes = attachmentMaxBytes({ maxUploadSizeBytes: getMaxUploadSizeBytes() });
      setStaged((current) => {
        const next: StagedFile[] = [];
        const skipped: string[] = [];
        for (const file of Array.from(files)) {
          if (current.length + next.length >= ATTACHMENT_MAX_COUNT) {
            skipped.push(t`${file.name} (max ${ATTACHMENT_MAX_COUNT} attachments)`);
            continue;
          }
          // Raster photos get a chance to shrink before server-side size validation.
          if (file.size > maxBytes && !canPrepareImage(file)) {
            skipped.push(t`${file.name} (over ${attachmentSizeLabel(maxBytes)})`);
            continue;
          }
          const mimeType = inferAttachmentMimeType(file.name, file.type);
          if (!mimeType) {
            skipped.push(file.name);
            continue;
          }
          next.push({
            id: `${file.name}-${file.size}-${file.lastModified}-${current.length + next.length}`,
            file,
            previewUrl: mimeType.startsWith("image/") ? URL.createObjectURL(file) : undefined,
          });
        }
        setNotice(skipped.length ? t`Skipped ${skipped.join(", ")}` : null);
        return next.length ? [...current, ...next] : current;
      });
    },
    [t],
  );

  const remove = useCallback((item: StagedFile) => {
    revokePendingAttachmentPreviews([item]);
    setStaged((current) => current.filter((row) => row.id !== item.id));
  }, []);

  const clear = useCallback(() => {
    setStaged((current) => {
      revokePendingAttachmentPreviews(current);
      return [];
    });
    setNotice(null);
  }, []);

  /** Uploads every staged file for the ticket's owner, in order. */
  const upload = useCallback(
    async (botId: string) => {
      const ids: string[] = [];
      for (const item of staged) {
        const mimeType = inferAttachmentMimeType(item.file.name, item.file.type);
        if (!mimeType) throw new Error(t`Unsupported file type: ${item.file.name}`);
        const file = await prepareImage(item.file);
        const contentBase64 = await readFileAsBase64(file);
        const artifact = await rpc.artifacts.create({
          botId,
          name: item.file.name,
          mimeType,
          contentBase64,
        });
        ids.push(artifact.id);
      }
      return ids;
    },
    [staged, t],
  );

  return { staged, notice, add, remove, clear, upload };
}

export type StagedFiles = ReturnType<typeof useStagedFiles>;

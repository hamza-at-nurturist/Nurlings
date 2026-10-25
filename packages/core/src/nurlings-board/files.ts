import { attachmentExtensionForMimeType } from "../attachments.js";

/** The image types a ticket shows as thumbnails and opens in the viewer. */
export const TICKET_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export function isTicketImage(mimeType: string): boolean {
  return TICKET_IMAGE_MIME_TYPES.includes(mimeType);
}

/** "TXT" from the name's extension, else from the type's usual one, else the type itself. */
export function shortFileType(name: string, mimeType: string): string {
  const dot = name.lastIndexOf(".");
  const extension =
    dot > 0 && dot < name.length - 1
      ? name.slice(dot + 1)
      : attachmentExtensionForMimeType(mimeType).replace(/^\./, "");
  return extension ? extension.toUpperCase() : mimeType;
}

/**
 * @file Creates short-lived local downloads for user-requested timeline exports.
 * Functions: downloadText.
 * Variables: blob, url, anchor.
 * Line locations: see docs/CODE_INDEX.md for the generated symbol index.
 */

/**
 * Downloads generated text without transmitting data to a server.
 * @param {string} fileName Suggested local filename.
 * @param {string} text Export content.
 * @param {string} mimeType MIME type.
 * @returns {void}
 */
export function downloadText(fileName, text, mimeType) {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

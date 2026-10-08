/**
 * Copies text to the clipboard and resolves to `true` only when the browser
 * accepts the Clipboard API write or the legacy copy command.
 *
 * Prefer the Clipboard API when available. On plain HTTP, use the synchronous
 * `execCommand` fallback while the click's user gesture is still active.
 *
 * The text is copied verbatim — never trimmed or reformatted — so what lands
 * on the clipboard is exactly what is displayed in the UI.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = typeof text === 'string' ? text : String(text ?? '');
  if (!value) return false;

  // The modern API is the reliable path on secure origins. It only reports
  // success after the browser resolves the write request.
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Continue to the synchronous fallback when permissions reject the API.
  }

  // execCommand remains the available path on the app's plain HTTP deployment.
  try {
    if (typeof document === 'undefined' || !document.execCommand || !document.body) return false;

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    Object.assign(textarea.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '1px',
      height: '1px',
      padding: '0',
      border: '0',
      opacity: '0.01',
      pointerEvents: 'none',
      zIndex: '2147483647',
      fontSize: '16px',
      userSelect: 'text',
    });
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    try {
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, value.length);
      return document.execCommand('copy');
    } finally {
      textarea.remove();
      if (previousRange && selection) {
        try {
          selection.removeAllRanges();
          selection.addRange(previousRange);
        } catch {
          // The original selection can become stale while the copy field is focused.
        }
      }
    }
  } catch {
    // Report failure to the caller; never show a success toast on an exception.
  }
  return false;
}

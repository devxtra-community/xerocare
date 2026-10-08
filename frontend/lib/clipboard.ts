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

  // Chrome exposes or partially exposes the Clipboard API on some insecure
  // origins. Waiting for that request to reject can consume the click's user
  // activation, making the legacy fallback report success without copying.
  // On HTTP, skip that request and run execCommand synchronously in this click.
  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
  if (isSecureContext) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // Try the synchronous fallback if the browser rejects the API write.
    }
  }

  // execCommand remains the available path on the app's plain HTTP deployment.
  try {
    if (typeof document === 'undefined' || !document.execCommand || !document.body) return false;

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    Object.assign(textarea.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '320px',
      height: '40px',
      padding: '4px',
      border: '1px solid currentColor',
      opacity: '1',
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

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

  // Try the synchronous path first. Clipboard API failures can consume the
  // browser's click activation, which then prevents execCommand from copying.
  // Keeping this attempt before any await makes it reliable on HTTP and on
  // browsers that deny clipboard permissions even over HTTPS.
  try {
    if (typeof document !== 'undefined' && document.execCommand && document.body) {
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
        if (document.execCommand('copy')) return true;
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
    }
  } catch {
    // Try the Clipboard API below when the browser rejects the legacy command.
  }

  // HTTPS and localhost can use the asynchronous Clipboard API as a fallback.
  try {
    if (typeof window !== 'undefined' && window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Report failure to the caller; never show a success toast on an exception.
  }
  return false;
}

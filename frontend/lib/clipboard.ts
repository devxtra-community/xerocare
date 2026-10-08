/**
 * Copies text to the clipboard and resolves to `true` only when the text is
 * verifiably on the clipboard.
 *
 * Run the synchronous `execCommand` path first while the click's user gesture
 * is still active. This matters on plain HTTP, where Clipboard API access is
 * unavailable, and in browsers that revoke activation while an awaited
 * `writeText` permission request is pending. Use Clipboard API as a fallback.
 *
 * The text is copied verbatim — never trimmed or reformatted — so what lands
 * on the clipboard is exactly what is displayed in the UI.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = typeof text === 'string' ? text : String(text ?? '');
  if (!value) return false;

  // Legacy copy is synchronous, so it retains the click's transient user
  // activation on HTTP and browser implementations that gate clipboard writes.
  try {
    if (typeof document !== 'undefined' && document.execCommand) {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      // Keep the field in the viewport but visually transparent. Some browsers
      // refuse to copy selections from a far off-screen element.
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      textarea.style.zIndex = '-1';
      textarea.style.fontSize = '16px';
      document.body.appendChild(textarea);

      // Preserve whatever the user had selected so the copy is invisible to them.
      const selection = document.getSelection();
      const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, value.length);
      const ok = document.execCommand('copy');

      document.body.removeChild(textarea);
      if (previousRange && selection) {
        selection.removeAllRanges();
        selection.addRange(previousRange);
      }
      if (ok) return true;
    }
  } catch {
    // Try the modern API below.
  }

  // Clipboard API works on secure contexts and may succeed when legacy copy is
  // disabled by the browser. This call is made only after the synchronous
  // gesture-preserving attempt above.
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Report failure to the caller; never show a false success toast.
  }
  return false;
}

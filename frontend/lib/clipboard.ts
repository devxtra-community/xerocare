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

  const secureContext = typeof window !== 'undefined' && window.isSecureContext;

  // On HTTPS, prefer the Clipboard API, which reports an actual write failure.
  if (secureContext) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // Fall back to the synchronous copy event below.
    }
  }

  // The app may run on plain HTTP, where the Clipboard API is unavailable.
  // Do not trust execCommand's return value alone: Chrome can return true even
  // when no copy event populated the system clipboard. Supply and verify the
  // exact text in that event before reporting success to the caller.
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
      width: '2px',
      height: '2px',
      padding: '0',
      border: '0',
      opacity: '0.1',
      zIndex: '2147483647',
      fontSize: '16px',
      userSelect: 'text',
    });
    document.body.appendChild(textarea);

    const selection = document.getSelection();
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    let copyEventHandled = false;
    const handleCopy = (event: ClipboardEvent) => {
      if (!event.clipboardData) return;
      event.clipboardData.setData('text/plain', value);
      event.preventDefault();
      copyEventHandled = true;
    };

    document.addEventListener('copy', handleCopy, true);
    try {
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, value.length);
      const commandSucceeded = document.execCommand('copy');
      return commandSucceeded && copyEventHandled;
    } finally {
      document.removeEventListener('copy', handleCopy, true);
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
    // Report failure so the caller can show its manual-copy fallback.
  }
  return false;
}

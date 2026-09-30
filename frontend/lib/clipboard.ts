/**
 * Copies text to the clipboard and resolves to `true` only when the text is
 * verifiably on the clipboard.
 *
 * Why not just `navigator.clipboard.writeText()`? The async Clipboard API only
 * exists on secure origins (https or localhost). This app is routinely used
 * over plain LAN HTTP (e.g. http://15.252.52.227/finance/rent), where
 * `navigator.clipboard` is undefined — the old fire-and-forget call copied
 * nothing while the success toast fired anyway. When the API is missing, or
 * rejects (permission denied, document not focused, …), fall back to the
 * legacy `document.execCommand('copy')` path via a temporary textarea, which
 * still works on insecure origins inside a user gesture.
 *
 * The text is copied verbatim — never trimmed or reformatted — so what lands
 * on the clipboard is exactly what is displayed in the UI.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = typeof text === 'string' ? text : String(text ?? '');
  if (!value) return false;

  // 1) Async Clipboard API — secure contexts only.
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the legacy path below.
  }

  // 2) Legacy fallback — hidden textarea + execCommand, works on plain HTTP.
  try {
    if (typeof document === 'undefined' || !document.execCommand) return false;
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    // Off-screen but rendered — display:none breaks selection on some browsers.
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);

    // Preserve whatever the user had selected so the copy is invisible to them.
    const selection = document.getSelection();
    const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    textarea.select();
    textarea.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');

    document.body.removeChild(textarea);
    if (previousRange && selection) {
      selection.removeAllRanges();
      selection.addRange(previousRange);
    }
    return ok;
  } catch {
    return false;
  }
}

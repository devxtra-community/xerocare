/**
 * Print a complete document clone in an isolated iframe. The source document can stay
 * inside a scrollable dialog; its viewport and scroll position never constrain printing.
 */
export async function printDocument(target: HTMLElement | null | undefined) {
  if (!target || typeof window === 'undefined') return;

  const frame = document.createElement('iframe');
  frame.title = 'Print document';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '-1',
  });
  document.body.appendChild(frame);

  const printWindow = frame.contentWindow;
  const printDoc = frame.contentDocument;
  if (!printWindow || !printDoc) {
    frame.remove();
    return;
  }

  printDoc.open();
  printDoc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  printDoc.close();
  printDoc.title = document.title;
  printDoc.documentElement.className = document.documentElement.className;
  printDoc.body.className = document.body.className;

  const base = printDoc.createElement('base');
  base.href = document.baseURI;
  printDoc.head.prepend(base);

  const stylesheetLoads: Promise<void>[] = [];
  document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((sourceStyle) => {
    const copiedStyle = sourceStyle.cloneNode(true) as HTMLElement;
    if (copiedStyle instanceof HTMLLinkElement) {
      copiedStyle.href = (sourceStyle as HTMLLinkElement).href;
      stylesheetLoads.push(
        new Promise((resolve) => {
          copiedStyle.addEventListener('load', () => resolve(), { once: true });
          copiedStyle.addEventListener('error', () => resolve(), { once: true });
        }),
      );
    }
    printDoc.head.appendChild(copiedStyle);
  });

  const clone = target.cloneNode(true) as HTMLElement;
  clone.classList.add('print-document');
  clone.removeAttribute('data-print-target');
  clone.removeAttribute('data-print-hidden');
  printDoc.body.appendChild(clone);

  await Promise.race([
    Promise.all(stylesheetLoads),
    new Promise<void>((resolve) => window.setTimeout(resolve, 10_000)),
  ]);
  await printDoc.fonts?.ready.catch(() => undefined);
  await Promise.allSettled(Array.from(printDoc.images).map((image) => image.decode()));

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    printWindow.removeEventListener('afterprint', cleanup);
    window.removeEventListener('afterprint', cleanup);
    frame.remove();
  };

  printWindow.addEventListener('afterprint', cleanup, { once: true });
  window.addEventListener('afterprint', cleanup, { once: true });
  try {
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}

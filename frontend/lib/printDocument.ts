/**
 * Print one document element without including its surrounding page or dialog UI.
 * Siblings along the element's path to <body> are hidden only while printing; their
 * original attributes are restored after print completes.
 */
export function printDocument(target: HTMLElement | null | undefined) {
  if (!target || typeof window === 'undefined') return;

  const previousAttributes = new Map<HTMLElement, string | null>();
  const mark = (element: HTMLElement, name: string) => {
    if (!previousAttributes.has(element))
      previousAttributes.set(element, element.getAttribute(name));
    element.setAttribute(name, '');
  };

  mark(target, 'data-print-target');

  let branch: HTMLElement = target;
  while (branch.parentElement) {
    const parent = branch.parentElement;
    if (!parent) break;
    Array.from(parent.children).forEach((sibling) => {
      if (sibling !== branch) mark(sibling as HTMLElement, 'data-print-hidden');
    });
    if (parent === document.body) break;
    branch = parent;
  }

  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    previousAttributes.forEach((previousValue, element) => {
      const attribute = element === target ? 'data-print-target' : 'data-print-hidden';
      if (previousValue === null) element.removeAttribute(attribute);
      else element.setAttribute(attribute, previousValue);
    });
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  try {
    window.print();
  } catch (error) {
    cleanup();
    throw error;
  }
}

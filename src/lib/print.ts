/**
 * Prints one element on its own: it is cloned into a temporary `#print-root`
 * and print CSS (styles/base.css) hides every other top-level node, so app
 * navigation, buttons and dialogs never reach the paper.
 */
export function printElement(element: HTMLElement): void {
  const root = document.createElement('div');
  root.id = 'print-root';
  root.dir = document.documentElement.dir || 'rtl';
  root.appendChild(element.cloneNode(true));
  document.body.appendChild(root);
  document.body.classList.add('printing');

  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    document.body.classList.remove('printing');
    root.remove();
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
  // Browsers without a blocking print() / afterprint still get cleaned up.
  window.setTimeout(() => {
    if (document.body.contains(root)) cleanup();
  }, 1000);
}

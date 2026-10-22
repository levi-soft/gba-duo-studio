export const DEVICE_DENSITY = 2.30625;
/** @template T @param {T} v @returns {T} */
export const clone = (v) => JSON.parse(JSON.stringify(v));
/** @param {import('./types.js').LayoutNode | undefined} root @returns {import('./types.js').TreeRef[]} */
export function walk(root) {
  /** @type {import('./types.js').TreeRef[]} */
  const out = [];
  /** @param {import('./types.js').LayoutNode | undefined} node @param {import('./types.js').LayoutNode | import('./types.js').LayoutEntry | null} parent @param {string|null} key @param {number|null} index @param {number} depth @param {string} [title] */
  function visit(node, parent, key, index, depth, title) {
    if (!node || typeof node !== 'object') return;
    // Walk every editor-visible branch, including branches the native widget
    // parser ignores. Imports must not bypass limits through unused metadata.
    if (depth > 160 || out.length >= 50000) throw new Error('Layout exceeds editor complexity limits.');
    out.push({ node, parent, key, index, depth, title });
    (node.children ?? []).forEach((c, i) => visit(c, node, 'children', i, depth + 1));
    if (node.child) visit(node.child, node, 'child', null, depth + 1);
    if (node.template) visit(node.template, node, 'template', null, depth + 1, 'Mẫu lặp');
    for (const key of /** @type {const} */ (['pages', 'tabs'])) (node[key] ?? []).forEach((entry) => visit(entry.child, entry, 'child', null, depth + 1, entry.name ?? entry.title));
  }
  visit(root, null, null, null, 0);
  return out;
}

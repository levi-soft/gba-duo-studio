// Validate the public pack format without converting it into a second widget schema.
const supported = new Set(['column','row','box','text','image','spacer','bar','button','tabs','pages','list']);
export class InvalidLayoutError extends Error {}
/** @param {string} key */
export const stateKey = key => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);

/** @param {unknown} input @returns {{root: import('../studio/types.js').LayoutNode, warnings:string[]}} */
export function parseLayoutWithWarnings(input) {
  /** @type {import('../studio/types.js').LayoutNode} */
  let root;
  try { root = typeof input === 'string' ? JSON.parse(input) : /** @type {import('../studio/types.js').LayoutNode} */ (structuredClone(input)); }
  catch (error) { throw new InvalidLayoutError('Cannot read layout JSON: ' + (error instanceof Error ? error.message : String(error))); }
  /** @type {string[]} */
  const warnings = [];
  let nodes = 0;
  /** @param {import('../studio/types.js').LayoutNode} node @param {string} path @param {number} depth */
  function inspect(node, path, depth) {
    if (++nodes > 50000 || depth > 160) throw new InvalidLayoutError('Layout exceeds preview complexity limits.');
    if (!node || typeof node !== 'object' || Array.isArray(node) || !supported.has(node.type))
      throw new InvalidLayoutError(`${path}: unsupported widget type ${String(node?.type)}`);
    if (node.style != null && (Array.isArray(node.style) || typeof node.style !== 'object'))
      throw new InvalidLayoutError(`${path}: style must be an object`);
    if (node.type === 'list') {
      if (!node.template) throw new InvalidLayoutError(`${path}: list requires template`);
      inspect(node.template, path + '.template', depth + 1);
    } else if (node.type === 'tabs' || node.type === 'pages') {
      const key = node.type;
      if (!Array.isArray(node[key]) || !node[key].length) throw new InvalidLayoutError(`${path}: ${key} must not be empty`);
      const names = new Set();
      node[key].forEach((page, index) => {
        if (key === 'pages') {
          if (typeof page.name !== 'string' || names.has(page.name)) throw new InvalidLayoutError(`${path}: page names must be unique strings`);
          names.add(page.name);
        }
        inspect(page.child, `${path}.${key}[${index}].child`, depth + 1);
      });
      if (key === 'pages') {
        if (!stateKey(node.state ?? 'page')) throw new InvalidLayoutError(`${path}: invalid page state key`);
        if (node.initial != null && !names.has(node.initial)) throw new InvalidLayoutError(`${path}: initial page does not exist`);
      }
    } else {
      if (node.child && node.children) throw new InvalidLayoutError(`${path}: choose child or children`);
      const children = node.child ? [node.child] : node.children ?? [];
      if (!Array.isArray(children)) throw new InvalidLayoutError(`${path}: children must be an array`);
      children.forEach((child, index) => inspect(child, `${path}.children[${index}]`, depth + 1));
    }
    const actions = Array.isArray(node.onClick) ? node.onClick : node.onClick == null ? [] : [node.onClick];
    for (const action of actions) {
      if (action === 'back') continue;
      if (!action || typeof action !== 'object') { warnings.push(`${path}: ignored invalid action`); continue; }
      for (const key of Object.keys(action)) if (!['set','navigate','back','state','call','args'].includes(key)) warnings.push(`${path}: ignored action field ${key}`);
    }
  }
  inspect(root, 'layout', 0);
  return {root, warnings};
}
/** @param {unknown} input */
export function parseLayout(input) { return parseLayoutWithWarnings(input).root; }

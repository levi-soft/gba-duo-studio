/** @typedef {import('../studio/types.js').JsonValue} JsonValue */
/** @typedef {{[scopeTag]: true, item: JsonValue, index: number, root: JsonValue}} Scope */
// Studio preview data access. No game code is executed by this module.
const scopeTag = Symbol('studio-list-scope');
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);

/** @param {JsonValue} item @param {number} index @param {JsonValue} root @returns {Scope} */
export function scopedValues(item, index, root) { return { [scopeTag]: true, item, index, root }; }

/** @param {JsonValue | undefined} object @param {unknown} path @returns {JsonValue} */
function lookup(object, path) {
  const keys = String(path).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  if (!keys.length || keys.some(key => forbidden.has(key))) return null;
  let result = object;
  for (const key of keys) {
    if (result == null || typeof result !== 'object' || !Object.hasOwn(result, key)) return null;
    result = Array.isArray(result) ? result[Number(key)] : result[key];
  }
  return result ?? null;
}

/** @param {unknown} path @param {JsonValue | Scope | undefined} context @returns {JsonValue} */
export function resolve(path, context) {
  const key = String(path ?? '').replace(/^\$/, '');
  if (!isScope(context)) return lookup(context, key);
  if (key === '@index') return context.index;
  if (key === 'item') return context.item;
  if (key.startsWith('ui.')) return lookup(context.root, key);
  return lookup(context.item, key) ?? lookup(context.root, key);
}

/** @param {unknown} text @param {JsonValue | Scope | undefined} context */
export function interpolate(text, context) {
  return String(text ?? '').replace(/\{([^{}]+)\}/g, (_, key) => {
    const value = resolve(key, context);
    return value == null ? '' : String(value);
  });
}

/** @param {JsonValue | undefined} value @param {JsonValue | Scope | undefined} context @returns {JsonValue | undefined} */
export function bound(value, context) {
  if (typeof value !== 'string') return value;
  const token = /^\{([^{}]+)\}$/.exec(value);
  if (token) return resolve(token[1], context);
  return value.startsWith('$') ? resolve(value, context) : interpolate(value, context);
}

/** @param {unknown} value */
export function isTruthy(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}
/** @param {unknown} value */
export function asNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
/** @param {JsonValue} value @returns {JsonValue[]} */
export function asList(value) { return Array.isArray(value) ? value : []; }

/** @param {JsonValue | Scope | undefined} context @returns {JsonValue} */
export function rootValues(context) { return isScope(context) ? context.root : context ?? null; }

/** @param {JsonValue | Scope | undefined} context @returns {context is Scope} */
function isScope(context) { return context != null && typeof context === 'object' && scopeTag in context; }

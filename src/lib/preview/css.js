// Browser adaptation of the companion CSS vocabulary; native baseline adapted
// from khumam/gba-duo (GPL-3.0). See NOTICE.md for file-level provenance.
export const PREVIEW_DENSITY = 369 / 160;
const widgetNames = new Set('column row box text image spacer bar button tabs pages list fill label empty tab tab-bar tab-content'.split(' '));

// Split only outside strings, brackets and functions. Used for declarations and selectors.
/** @param {string} text @param {string} delimiter */
export function splitTokens(text, delimiter) {
  const result = []; let from = 0, quote = '', escape = false, level = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '(' || c === '[') level++;
    if (c === ')' || c === ']') level--;
    if (c === delimiter && level === 0) { result.push(text.slice(from, i)); from = i + 1; }
  }
  result.push(text.slice(from)); return result;
}

/** @param {string} css */
function stripComments(css) {
  let result = '', quote = '', escape = false;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (escape) { result += c; escape = false; continue; }
    if (c === '\\') { result += c; escape = true; continue; }
    if (quote) { result += c; if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; result += c; continue; }
    if (c === '/' && css[i+1] === '*') { const end = css.indexOf('*/', i+2); i = end < 0 ? css.length : end+1; result += ' '; }
    else result += c;
  }
  return result;
}

/** @param {string} input */
export function splitIntoBlocks(input) {
  const css = stripComments(String(input)), result = [];
  let start = 0, opening = -1, depth = 0, quote = '', escape = false, parentheses = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (quote) { if (quote === c) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '(') parentheses++;
    if (c === ')') parentheses--;
    if (parentheses) continue;
    if (c === '{') { if (depth++ === 0) opening = i; }
    if (c === '}' && depth > 0 && --depth === 0) {
      result.push({selector:css.slice(start, opening).trim(), body:css.slice(opening+1, i)}); start = i+1;
    }
    if (c === ';' && depth === 0) start = i+1; // @import is deliberately not fetched.
  }
  return result;
}

/** @param {string | ((path:string)=>string)} source @param {unknown} input */
export function assetUrl(source, input) {
  const path = String(input ?? '').replace(/^asset:/, '').replace(/^assets\//, '');
  if (/^(?:data:|blob:|https?:|\/)/i.test(path)) return path;
  if (/^[a-z]+:/i.test(path) || path.split('/').includes('..')) return '';
  return typeof source === 'function' ? source(path) : `${String(source).replace(/\/$/, '')}/assets/${path}`;
}

/** @param {string} input */
export function previewSelector(input) {
  // Lex selectors rather than replacing words inside class names or attribute values.
  let result = '', quoted = '', bracket = 0;
  for (let i = 0; i < input.length;) {
    const c = input[i];
    if (quoted) { result += c; if (c === '\\') result += input[++i] ?? ''; else if (c === quoted) quoted = ''; i++; continue; }
    if (c === '"' || c === "'") { quoted = c; result += c; i++; continue; }
    if (c === '[') bracket++;
    if (c === ']') bracket--;
    if (!bracket && c === ':' && input.slice(i).match(/^:root\b/)) { result += '[data-gbaduo-root]'; i += 5; continue; }
    const state = !bracket && c === ':' && /^:(active|pressed|disabled)\b/.exec(input.slice(i));
    if (state) { result += '.' + state[1]; i += state[0].length; continue; }
    const word = !bracket && /[a-zA-Z_]/.test(c) && /^[\w-]+/.exec(input.slice(i));
    if (word) {
      const prior = input[i-1] ?? '';
      result += widgetNames.has(word[0]) && !/[.#:\w-]/.test(prior) ? `[data-type="${word[0]}"]` : word[0];
      i += word[0].length; continue;
    }
    result += c; i++;
  }
  return result;
}

/** @param {string} value @param {string | ((path:string)=>string)} source */
function mapValue(value, source) {
  // Temporarily protect strings and URLs from numeric unit conversion.
  /** @type {string[]} */
  const protectedValues = [];
  /** @param {string} text */
  const protect = text => `___studio_css_${protectedValues.push(text)-1}___`;
  let result = value.replace(/url\(\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^)]*))\s*\)/gi, (_, a,b,c) => {
    const raw = (a ?? b ?? c).trim(); return protect(`url(${JSON.stringify(assetUrl(source, raw))})`);
  }).replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, protect);
  result = result.replace(/(-?(?:\d*\.)?\d+)(vmin|vmax|vw|vh|px)\b/g, (_, number, unit) =>
    unit === 'px' ? Math.round(Number(number)*PREVIEW_DENSITY)+'px' : number+unit.replace('vw','cqw').replace('vh','cqh').replace('vmin','cqmin').replace('vmax','cqmax'));
  return result.replace(/___studio_css_(\d+)___/g, (_, index) => protectedValues[Number(index)]);
}

/** @param {string} input @param {string | ((path:string)=>string)} source */
export function prepareStyleDeclarations(input, source) {
  return splitTokens(stripComments(input), ';').map(part => {
    const colon = part.indexOf(':'); if (colon < 0) return '';
    const key = part.slice(0,colon).trim(), value = part.slice(colon+1).trim();
    if (key === 'display' && /^stack(?:\s*!important)?$/.test(value)) return 'display:grid;position:relative;--studio-stack:1';
    if (key === 'scroll-follow') return '--studio-scroll-follow:'+value;
    return key+':'+mapValue(value, source);
  }).filter(Boolean).join(';');
}

/** @param {string} css @param {string | ((path:string)=>string)} source @param {boolean} [fontsOnly] @returns {string} */
function compileRules(css, source, fontsOnly = false) {
  return splitIntoBlocks(css).map(({selector,body}) => {
    if (/^@font-face\b/i.test(selector)) return fontsOnly ? `@font-face{${prepareStyleDeclarations(body,source)}}` : '';
    if (/^@(?:media|supports|container|layer)\b/i.test(selector)) return `${selector}{${compileRules(body,source,fontsOnly)}}`;
    if (fontsOnly) return '';
    if (/^@(?:keyframes|-webkit-keyframes)\b/i.test(selector)) return `${selector}{${compileRules(body,source)}}`;
    return `${selector.startsWith('@') ? selector : previewSelector(selector)}{${prepareStyleDeclarations(body,source)}}`;
  }).join('\n');
}

export const DEFAULT_CSS = `
:root{width:100%;height:100%;font-size:14px;color:white}
column,box,list{display:flex;flex-direction:column}
row{display:flex;flex-direction:row;align-items:flex-start}
text{white-space:pre-wrap}
image{width:32px;height:32px;object-fit:contain;image-rendering:pixelated}
spacer{width:8px;height:8px;flex-shrink:0}
bar{display:stack;height:12px;background:rgba(108,74,182,.3);accent-color:#6c4ab6}
bar>fill{position:absolute;inset:0 auto 0 0}
bar>label{align-self:center;justify-self:center;font-size:10px;white-space:nowrap;z-index:1}
pages,tab-content{display:stack;place-items:stretch;flex:1 1 auto}
tabs{display:flex;flex-direction:column;flex:1 1 auto}
tab-bar{display:flex;flex-direction:row;flex-shrink:0}
tab{padding:8px 12px;color:#888}
tab:active{color:white}
empty{color:#888}
button{display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;border-radius:8px;background:#ffffff1f}
button:pressed{opacity:.7}`;

/** @param {string} css @param {string | ((path:string)=>string)} source @param {string} [defaults] */
export function prepareStylesheetCss(css, source, defaults = DEFAULT_CSS) {
  return `*{box-sizing:border-box;min-width:0;min-height:0;overflow-wrap:anywhere;--studio-stack:0;--studio-scroll-follow:none}
[data-gbaduo-hidden],[data-studio-invisible]{display:none!important}
${compileRules(defaults+'\n'+css, source)}`;
}
/** @param {string} css @param {string | ((path:string)=>string)} source */
export function extractFontFaceCss(css, source) { return compileRules(css, source, true); }

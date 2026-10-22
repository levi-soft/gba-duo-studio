import { compileSkins } from './skins.js';
import { compileFonts } from './fonts.js';
import { compileStyles } from './style-model.js';

/** @template {Pick<import('./types.js').Project,'layout'|'css'|'files'>} T @param {T} project */
export function compileDesign(project) {
  const skinned = compileSkins(project), styled = compileStyles(skinned), compiled = compileFonts(styled);
  return { ...compiled, hasEditorMetadata: Boolean(skinned.hasSkins || compiled.hasFonts || styled.hasStyles) };
}

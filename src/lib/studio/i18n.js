import { derived, writable } from 'svelte/store';
import english from './locales/en.json';

export const LANGUAGE_KEY = 'gba-duo-studio-language';
export const locale = writable('en');

/** Translate Studio chrome only. Project data, CSS and Lua are never localized. */
/** @param {string | null | undefined} language @param {string} source @param {unknown[]} params */
export function translate(language, source, ...params) {
  if (typeof source !== 'string') return source;
  const value = language === 'vi' ? source : (/** @type {Record<string,string>} */ (english)[source] ?? source);
  return value.replace(/\{(\d+)\}/g, (match, index) =>
    Number(index) < params.length ? String(params[Number(index)]) : match);
}

/** @param {string} language */
function translator(language){
  /** @param {string} source @param {unknown[]} params */
  return (source,...params)=>translate(language,source,...params);
}
export const t = derived(locale, translator);

/** @param {string | null | undefined} language */
export function setLanguage(language) {
  const next = language === 'vi' ? 'vi' : 'en';
  locale.set(next);
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  try { globalThis.localStorage?.setItem(LANGUAGE_KEY, next); } catch { /* Private browsing may disable storage. */ }
}

export function restoreLanguage() {
  let saved;
  try { saved = globalThis.localStorage?.getItem(LANGUAGE_KEY); } catch { /* Use English. */ }
  setLanguage(saved);
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'svelte/compiler';
import { resolve } from 'node:path';
import en from './locales/en.json';
import { LANGUAGE_KEY, locale, restoreLanguage, setLanguage, t, translate } from './i18n.js';

beforeEach(() => {
  const values=new Map<string,string>();
  vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,String(value)),removeItem:(key:string)=>values.delete(key)});
});
afterEach(() => { setLanguage('en'); vi.unstubAllGlobals(); });

describe('Studio language', () => {
  it('defaults to English, persists Vietnamese and restores it', () => {
    localStorage.removeItem(LANGUAGE_KEY); restoreLanguage();
    expect(get(locale)).toBe('en'); expect(get(t)('Mở dự án')).toBe('Open Project');
    setLanguage('vi'); expect(localStorage.getItem(LANGUAGE_KEY)).toBe('vi');
    expect(get(t)('Mở dự án')).toBe('Mở dự án'); expect(document.documentElement.lang).toBe('vi');
    locale.set('en'); restoreLanguage(); expect(get(locale)).toBe('vi');
    localStorage.setItem(LANGUAGE_KEY,'invalid'); restoreLanguage(); expect(get(locale)).toBe('en');
  });
  it('interpolates UI parameters without changing unknown project text or bindings', () => {
    expect(translate('en','Trả {0} về CSS gốc','Width')).toBe('Returns Width to the original CSS');
    expect(translate('vi','Trả {0} về CSS gốc','Width')).toBe('Trả Width về CSS gốc');
    expect(translate('en','Sample Name')).toBe('Sample Name');
    expect(translate('en','{hp}/{maxHp}')).toBe('{hp}/{maxHp}');
  });
  it('preserves named and positional placeholders throughout the English catalog', () => {
    const params=(s:string)=>[...s.matchAll(/\{[\w]+\}/g)].map(m=>m[0]).sort();
    for(const[source,target]of Object.entries(en))expect(params(target),source).toEqual(params(source));
  });
  it('has English entries for every literal UI translation call', () => {
    const root=resolve('src');
    const files=['routes/+page.svelte',...readdirSync(resolve(root,'lib/studio')).filter(f=>f.endsWith('.svelte')).map(f=>'lib/studio/'+f)];
    let count=0;
    for(const file of files){const ast=parse(readFileSync(resolve(root,file),'utf8'),{modern:true});
      function walk(node:unknown){if(!node||typeof node!=='object')return;
        const entry=node as {type?:string;callee?:{name?:string};arguments?:{type?:string;value?:unknown}[]};
        if(entry.type==='CallExpression'&&entry.callee?.name==='$uiText'&&entry.arguments?.[0]?.type==='Literal'&&typeof entry.arguments[0].value==='string'){
          expect(Object.hasOwn(en,entry.arguments[0].value),entry.arguments[0].value).toBe(true);count++;
        }
        for(const[key,value]of Object.entries(node)){if(['loc','css','metadata'].includes(key))continue;if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}
      }walk(ast.fragment);walk(ast.instance);
    }
    expect(count).toBeGreaterThan(400);
  });
});

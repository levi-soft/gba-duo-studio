import {splitIntoBlocks,previewSelector} from '../preview/css.js';
import {splitCss,expandFour} from './style-model.js';
import {styleProperties} from './style-schema.js';

const inherited=new Set(['font-family','font-size','font-weight','color','line-height','letter-spacing','text-align','text-transform','text-shadow','image-rendering']);
/** @param {string} body @returns {[string,string][]} */
export function declarations(body) {
  return splitCss(body,';').flatMap(part=>{const i=part.indexOf(':');return i<0?[]:[[part.slice(0,i).trim(),part.slice(i+1).trim()]];});
}
/** @param {string} selector */
function priority(selector) {
  const ids=(selector.match(/#[\w-]+/g)??[]).length;
  const classes=(selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?/g)??[]).length;
  const types=(selector.replace(/\[[^\]]*\]|[.#][\w-]+|:[\w-]+(?:\([^)]*\))?/g,'').match(/\b[a-zA-Z][\w-]*\b/g)??[]).length;
  return ids*10000+classes*100+types;
}
/** @param {Element|null|undefined} element @param {string} css @param {string} [defaults] @param {Record<string,string|number>} [overrides] @returns {{values:Record<string,string>,sources:Record<string,string>}} */
export function resolveStyles(element,css,defaults='',overrides={}) {
  if(!element)return {values:{},sources:{}};
  const blocks=splitIntoBlocks((defaults+'\n'+css).replace(/\/\*[\s\S]*?\*\//g,''));
  /** @param {Element} el @returns {{values:Record<string,string>,sources:Record<string,string>, apply:(key:string,raw:string,rank:number,source:string)=>void}} */
  function forElement(el) {
    /** @type {{values:Record<string,string>,sources:Record<string,string>}} */
    const parent=el.parentElement?forElement(el.parentElement):{values:{},sources:{}};
    /** @type {Record<string,string>} */
    const values={};
    /** @type {Record<string,string>} */
    const sources={};
    /** @type {Record<string,number>} */
    const ranks={};
    for(const key of Object.keys(parent.values)) if(inherited.has(key)||key.startsWith('--')){values[key]=parent.values[key];sources[key]='Kế thừa · '+parent.sources[key];}
    const computed=getComputedStyle(el);
    /** @param {string} key @param {string} raw @param {number} rank @param {string} source */
    function apply(key,raw,rank,source) {
      const important=/\s*!important\s*$/i.test(raw);const clean=raw.replace(/\s*!important\s*$/i,'');
      const resolved=clean.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+))?\)/g,(_,name,fallback)=>values[name]??(computed.getPropertyValue(name).trim()||fallback||''));
      const temp=document.createElement('div').style;temp.setProperty(key,resolved);
      const expanded=new Set([key]);
      for(const prop of styleProperties)if(temp.getPropertyValue(prop))expanded.add(prop);
      for(const prop of expanded){const r=rank+(important?1e15:0);if(r<(ranks[prop]??-1))continue;values[prop]=temp.getPropertyValue(prop)||clean;sources[prop]=source+(resolved!==clean?` · ${clean}`:'');ranks[prop]=r;}
    }
    /** @type {[string,string,number,string][]} */
    const matched=[];
    blocks.forEach(({selector,body},order)=>{
      if(selector.trim().startsWith('@'))return;
      for(const part of splitCss(selector)) {
        let matches=false;try{matches=el.matches(previewSelector(part));}catch{continue;}
        if(!matches)continue;
        for(const [key,value] of declarations(body))matched.push([key,value,priority(part)*100000+order,`${part.trim()} → ${key}: ${value}`]);
      }
    });
    for(const declaration of matched.filter(d=>d[0].startsWith('--')))apply(...declaration);
    for(const declaration of matched.filter(d=>!d[0].startsWith('--')))apply(...declaration);
    return {values,sources,apply};
  }
  const result=forElement(element);
  for(const [key,value] of Object.entries(overrides)) result.apply(key,String(value),1e12,'Sửa riêng → '+key+': '+value);
  const {values,sources}=result;
  /** @param {string} key @param {string[]} parts @param {string} [fallback] */
  function compose(key,parts,fallback='0px') {
    if(!parts.some(p=>values[p]!=null))return;
    const base=expandFour(values[key]??fallback);
    values[key]=parts.map((p,i)=>values[p]??base[i]??fallback).join(' ');
    sources[key]=[...new Set(parts.map(p=>sources[p]).filter(Boolean))].join(' · ');
  }
  for(const key of ['padding','margin'])compose(key,['top','right','bottom','left'].map(side=>`${key}-${side}`));
  compose('border-radius',['top-left','top-right','bottom-right','bottom-left'].map(side=>`border-${side}-radius`));
  for(const side of ['top','right','bottom','left']) {
    const parts=['width','style','color'].map(p=>`border-${side}-${p}`);
    if(parts.every(p=>values[p]!=null)){
      values[`border-${side}`]=parts.map(p=>values[p]).join(' ');
      sources[`border-${side}`]=[...new Set(parts.map(p=>sources[p]))].join(' · ');
    }
  }
  if(['top','right','bottom','left'].every(side=>values[`border-${side}`]===values['border-top'])&&values['border-top']) {
    values.border=values['border-top'];sources.border=sources['border-top'];
  }
  if(values.background){
    const background=document.createElement('div').style;background.setProperty('background',values.background);
    for(const key of styleProperties.filter(p=>p.startsWith('background-')))if(values[key])background.setProperty(key,values[key]);
    if(background.getPropertyValue('background'))values.background=background.getPropertyValue('background');
  }
  return {values,sources};
}

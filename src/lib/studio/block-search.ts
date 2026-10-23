import type {Manifest,FieldInfo} from './types.js';
import {parseFieldInfo} from './data-profiles.js';

export function normalizeQuery(text:string){
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D')
    .replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
export interface BlockSuggestion {
  subject:string;scope:FieldInfo['scope'];current:string;maximum:string;
  currentLabel:string;maximumLabel:string;verified:boolean;compatible:boolean;explicit:boolean;
}
export interface BlockSearchResult {
  intent:'hp'|'unknown';selectedOnly:boolean;results:BlockSuggestion[];
}
/** Deterministic, local intent search. It never invents RAM addresses or executes a prompt. */
export function findDataBlocks(manifest:Manifest,query:string):BlockSearchResult{
  const text=normalizeQuery(query),words=new Set(text.split(' '));
  const fields=manifest.values??{};
  let info:Record<string,FieldInfo>={};
  try{info=parseFieldInfo(manifest.studioFieldInfo,fields);}catch{/* Invalid imported metadata cannot make verification claims. */}
  const selectedOnly=/\b(selected|hovered|highlighted|cursor)\b|\b(dang |duoc )(duoc )?(chon|tro)\b|\bcon tro\b|\b(unit|nhan vat|don vi) hien tai\b/.test(text);
  const aliasMatch=Object.values(info).some(meta=>meta.aliases?.some(alias=>{
    const normalized=normalizeQuery(alias);return normalized.length>=2&&(' '+text+' ').includes(' '+normalized+' ');
  }));
  const isHealth=words.has('hp')||words.has('health')||words.has('mau')||/\bhit points?\b/.test(text)||aliasMatch;
  if(!isHealth)return {intent:'unknown',selectedOnly,results:[]};
  const groups=new Map<string,{subject:string;scope:FieldInfo['scope'];current:string[];maximum:string[];explicit:boolean}>();
  // Infer names for discovery only. No selection/verification claim is inferred from an address.
  for(const key of Object.keys(fields)){
    const meta=info[key],normalized=normalizeQuery(key).replace(/ /g,'');
    const role=meta?.semantic??(['hp','health','currenthp','hpcurrent','currenthealth'].includes(normalized)?'hp.current':['maxhp','hpmax','maxhealth','maximumhp','maximumhealth'].includes(normalized)?'hp.maximum':null);
    if(!role||!['hp.current','hp.maximum'].includes(role))continue;
    const scope=meta?.scope??'unknown',subject=meta?.subject??'Unspecified unit';
    const groupKey=JSON.stringify([subject,scope,!!meta]);
    let group=groups.get(groupKey);
    if(!group){group={subject,scope,current:[],maximum:[],explicit:!!meta};groups.set(groupKey,group);}
    group[role==='hp.current'?'current':'maximum'].push(key);
  }
  const results:BlockSuggestion[]=[];
  for(const group of groups.values()){
    // More than one field for a role is ambiguous: never select an arbitrary pair.
    if(group.current.length!==1||group.maximum.length!==1)continue;
    const current=group.current[0],maximum=group.maximum[0];
    const verified=info[current]?.verified===true&&info[maximum]?.verified===true;
    results.push({subject:group.subject,scope:group.scope,current,maximum,verified,explicit:group.explicit,
      currentLabel:info[current]?.label??current,maximumLabel:info[maximum]?.label??maximum,
      compatible:!selectedOnly||(group.scope==='selected-unit'&&verified)});
  }
  results.sort((a,b)=>Number(b.compatible)-Number(a.compatible)||Number(b.verified)-Number(a.verified)||a.subject.localeCompare(b.subject));
  return {intent:'hp',selectedOnly,results};
}

/** Reject stale suggestions if fields/profile changed since rendering. */
export function requireBlockSuggestion(manifest:Manifest,query:string,current:string,maximum:string){
  const found=findDataBlocks(manifest,query).results.find(r=>r.current===current&&r.maximum===maximum&&r.compatible);
  if(!found)throw Error('This profile does not provide a matching block pair for the request.');
  return found;
}

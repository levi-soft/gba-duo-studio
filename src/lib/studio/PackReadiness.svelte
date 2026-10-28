<script lang="ts">
  import {onMount} from 'svelte';
  import {locale} from './i18n.js';
  import {packReadinessReport,issueText,type PackIssue} from './pack-readiness.js';
  import type {Project} from './types.js';
  interface Props{project:Project;sourceDirty:boolean;exportError?:string;onclose:()=>void;onfix:(issue:PackIssue)=>void;onexport:()=>void}
  let {project,sourceDirty,exportError='',onclose,onfix,onexport}:Props=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  const report=$derived(packReadinessReport(project,sourceDirty)),issues=$derived(report.issues),errors=$derived(issues.filter(i=>i.level==='error')),warnings=$derived(issues.filter(i=>i.level==='warning')),info=$derived(issues.filter(i=>i.level==='info'));
  let closeButton:HTMLButtonElement;
  onMount(()=>{const previous=document.activeElement;closeButton?.focus();return()=>{if(previous instanceof HTMLElement)previous.focus();};});
  function keys(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();onclose();}if(e.key==='Tab'){const all=[...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button:not(:disabled),summary')].filter(el=>el.offsetParent!==null);if(e.shiftKey&&document.activeElement===all[0]){e.preventDefault();all.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===all.at(-1)){e.preventDefault();all[0]?.focus();}}}
</script>
{#snippet issueRow(issue:PackIssue)}<li><div><strong>{issueText(issue,$locale)}</strong>{#if issue.nodeId||issue.location||issue.property}<code>{[issue.nodeId||issue.location,issue.property].filter(Boolean).join(' · ')}</code>{/if}{#if issue.field}<code>{issue.field}</code>{/if}{#if issue.detail}<span>{issue.detail}</span>{/if}</div><button onclick={()=>onfix(issue)}>{copy('Go to fix','Tới chỗ sửa')}</button></li>{/snippet}
<div class="modal-backdrop"><div class="modal readiness" role="dialog" aria-modal="true" aria-label={copy('Check before export','Kiểm tra trước khi xuất')} tabindex="-1" onkeydown={keys}>
  <div class="modal-title"><h2>{copy('Check before export','Kiểm tra trước khi xuất')}</h2><button bind:this={closeButton} aria-label={copy('Close export check','Đóng kiểm tra xuất')} onclick={onclose}>✕</button></div>
  <p>{project.manifest.name} · {report.errors} {copy('errors','lỗi')} · {report.warnings} {copy('notes','lưu ý')}</p>
  <p class="hint">{copy('These are file, settings and binding checks. They do not execute Lua or prove game-reader accuracy.','Đây là kiểm tra tệp, thiết lập và binding. Không chạy Lua hay chứng minh bộ đọc game chính xác.')}</p>
  {#if errors.length}<h3>{copy('Fix before exporting','Cần sửa trước khi xuất')}</h3><ul>{#each errors.slice(0,100) as issue}{@render issueRow(issue)}{/each}</ul>{/if}
  {#if warnings.length}<h3>{copy('Review these notes','Xem các lưu ý')}</h3><ul>{#each warnings.slice(0,100) as issue}{@render issueRow(issue)}{/each}</ul>{/if}
  {#if report.info}<details><summary>{report.info} {copy('runtime checks','mục kiểm tra khi chạy')}</summary><ul>{#each info as issue}{@render issueRow(issue)}{/each}</ul><p class="hint">{copy('Runtime fields are not treated as missing data errors.','Trường do bộ đọc cung cấp không bị coi là lỗi thiếu dữ liệu.')}</p></details>{/if}
  {#if report.truncated}<p class="hint">{copy('Showing up to 100 entries, blocking errors first. Totals include entries not shown.','Hiện tối đa 100 mục, ưu tiên lỗi chặn xuất. Tổng số gồm cả mục chưa hiển thị.')}</p>{/if}
  {#if !errors.length&&!warnings.length}<p>{copy('No blocking issues found in these checks.','Không tìm thấy vấn đề chặn xuất trong các kiểm tra này.')}</p>{/if}
  {#if exportError}<p class="error" role="alert">{exportError}</p>{/if}
  <div class="actions"><button onclick={onclose}>{copy('Keep editing','Sửa tiếp')}</button><button class="primary" disabled={errors.length>0||!!exportError} onclick={onexport}>{copy('Export companion copy','Xuất bản sao companion')}</button></div>
</div></div>
<style>.readiness{width:min(800px,calc(100vw - 24px));max-height:calc(100dvh - 32px);overflow:auto}ul{padding:0;list-style:none}li{display:flex;gap:12px;align-items:start;border:1px solid #526076;border-radius:5px;margin:8px 0;padding:10px}li>div{min-width:0;flex:1}strong,code,li span{display:block;overflow-wrap:anywhere}code,li span,.hint{font-size:12px;color:#c4cede;line-height:1.5}li button{flex-shrink:0}.actions{display:flex;gap:8px;margin-top:16px}summary{cursor:pointer}details{margin:14px 0}@media(max-width:500px){li{flex-direction:column}.actions{flex-wrap:wrap}}</style>

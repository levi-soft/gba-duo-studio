<script lang="ts">
  import { t as uiText } from './i18n.js';
  interface Props {value?:string;fonts?:{family:string;path:string;declared?:boolean}[];onchange:(value:string)=>void}
  let {value='',fonts=[],onchange}:Props=$props();
</script>
<label>{$uiText("Font chữ trên nút tab")}<select aria-label={$uiText("Font chữ trên nút tab")} {value} onchange={(e)=>onchange(e.currentTarget.value)}><option value="">{$uiText("Theo CSS của template")}</option>{#each fonts as font}<option value={font.family}>{font.declared?font.family:font.path.split('/').pop()}</option>{/each}<option value="sans-serif">{$uiText("Hệ thống · sans-serif")}</option><option value="serif">{$uiText("Hệ thống · serif")}</option><option value="monospace">{$uiText("Hệ thống · monospace")}</option></select></label>

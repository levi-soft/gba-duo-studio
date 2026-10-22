// A shared blinking phase for Studio snapshots and the exported Lua update loop.
/** @param {unknown} value */
const safeKey=value=>typeof value==='string'&&/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
/** @param {import('./types.js').PulseConfig} config */
export function validatePulse(config){
  if(!config||!Number.isInteger(config.periodMs)||config.periodMs<400||config.periodMs>10000||!config.bindings||Object.keys(config.bindings).length>32||!Object.entries(config.bindings).every(([output,source])=>safeKey(output)&&safeKey(source)))throw Error('Cấu hình nhấp nháy không hợp lệ.');
  return config;
}
/** @param {import('./types.js').DataValues} values @param {import('./types.js').PulseConfig | undefined} config @param {number} [now] */
export function applyPulseValues(values,config,now=Date.now()){
  if(!config)return values;
  validatePulse(config);
  const result={...values},on=now%config.periodMs<config.periodMs/2;
  for(const [output,source] of Object.entries(config.bindings))result[output]=Boolean(values[source])&&on;
  return result;
}
/** @param {import('./types.js').PulseConfig | undefined} config @param {number} tickHz */
export function pulseLua(config,tickHz){
  if(!config)return [];
  validatePulse(config);
  if(typeof tickHz!=='number'||!Number.isFinite(tickHz)||tickHz<=0)throw Error('Nhịp cập nhật không hợp lệ.');
  return ['  studioPulseTick = studioPulseTick + 1',`  local studioPulseOn = ((studioPulseTick * ${1000/tickHz}) % ${config.periodMs}) < ${config.periodMs/2}`,...Object.entries(config.bindings).map(([output,source])=>`  v.${output} = truth(v.${source}) and studioPulseOn`)];
}

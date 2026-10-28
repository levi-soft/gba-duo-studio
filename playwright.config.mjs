import {defineConfig} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const builder=path.resolve(process.env.GBA_DUO_BUILDER_DIR||'../GBA-Duo-Companion-Builder'),hasBuilder=fs.existsSync(path.join(builder,'site','builder-core.js'));
process.env.GBA_DUO_TEST_BUILDER_URL=hasBuilder?'http://127.0.0.1:4318':'';

// Uses a fresh, disposable browser context. No existing Chrome profile/session.
export default defineConfig({
  testDir:'./e2e',testMatch:'**/*.spec.mjs',timeout:90000,expect:{timeout:10000},workers:1,retries:0,forbidOnly:!!process.env.CI,
  outputDir:'.studio-runtime/browser-results',
  reporter:[['list'],['json',{outputFile:'.studio-runtime/browser-results/report.json'}]],
  use:{baseURL:'http://127.0.0.1:4317',browserName:'chromium',channel:process.env.GBA_DUO_BROWSER_CHANNEL||undefined,headless:true,acceptDownloads:true,trace:'retain-on-failure',screenshot:'only-on-failure',actionTimeout:15000,navigationTimeout:30000},
  projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'phone',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
  webServer:[{command:'npm run dev -- --host 127.0.0.1 --port 4317 --strictPort',url:'http://127.0.0.1:4317',reuseExistingServer:false,timeout:60000},...(hasBuilder?[{command:'node e2e/serve-builder.mjs',url:'http://127.0.0.1:4318',reuseExistingServer:false,timeout:20000,env:{GBA_DUO_BUILDER_DIR:builder}}]:[])]
});

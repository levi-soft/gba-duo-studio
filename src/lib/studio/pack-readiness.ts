import {validate} from './project.js';
import {shouldGenerateScript} from './computed-values.js';
import {projectDiagnostics,projectIssueText,type DependencyIssue} from './project-diagnostics.js';
import type {Project} from './types.js';

export interface PackIssue extends Omit<DependencyIssue,'location'> {location?:string;target:'project'|'code'|'node'|'data'}
export interface PackReadinessReport {issues:PackIssue[];errors:number;warnings:number;info:number;truncated:boolean;complete:boolean}

/** Studio settings and generated-field contracts wrap the shared native dependency pass. */
export function packReadinessReport(project:Project,sourceDirty=false):PackReadinessReport{
  const issues:PackIssue[]=[];
  const finish=(complete=true):PackReadinessReport=>({issues,errors:issues.filter(i=>i.level==='error').length,warnings:issues.filter(i=>i.level==='warning').length,info:issues.filter(i=>i.level==='info').length,truncated:false,complete});
  if(sourceDirty)issues.push({level:'error',code:'code-draft',target:'code'});
  try{validate(project);}catch(error){issues.push({level:'error',code:'invalid-project',target:'project',detail:error instanceof Error?error.message:String(error)});return finish(false);}
  const script=project.manifest.script,generated=shouldGenerateScript(project);
  const missingScript=!!script&&!Object.hasOwn(project.files,script)&&!generated;
  if(missingScript)issues.push({level:'error',code:'missing-script',target:'code',detail:script});
  try{validate(project,true);}catch(error){
    const message=error instanceof Error?error.message:String(error);
    if(!missingScript||message!=='Declared Lua entry point is missing.')issues.push({level:'error',code:'export-settings',target:'project',detail:message});
  }
  if(!script&&!Object.keys(project.manifest.values??{}).length&&!generated)issues.push({level:'warning',code:'sample-only',target:'data'});
  // These fields are produced by Studio's generator, not inferred from RAM or executed here.
  const studioDataFields={...project.manifest.studioDataFields};
  if(generated)for(const name of [...Object.keys(project.manifest.studioComputed??{}),...Object.keys(project.manifest.studioGraphics??{})])studioDataFields[name]={};
  const dependencies=projectDiagnostics({...project,manifest:{...project.manifest,script:generated?undefined:script,studioDataFields}});
  const base=finish();
  const mapped:PackIssue[]=dependencies.issues.map(issue=>({...issue,target:issue.nodeId?'node':issue.location==='style.css'?'code':'project'}));
  const ordered=[...issues,...mapped].sort((a,b)=>({error:0,warning:1,info:2}[a.level]-{error:0,warning:1,info:2}[b.level]));
  return {issues:ordered.slice(0,100),errors:base.errors+dependencies.errors,warnings:base.warnings+dependencies.warnings,info:base.info+dependencies.info,truncated:dependencies.truncated||ordered.length>100,complete:dependencies.complete};
}

export function packReadiness(project:Project,sourceDirty=false):PackIssue[]{return packReadinessReport(project,sourceDirty).issues;}

export function issueText(issue:PackIssue,language='en'){
  const messages:Record<string,[string,string]>={
    'code-draft':['Apply or discard your Code draft before exporting.','Áp dụng hoặc bỏ bản nháp Mã nguồn trước khi xuất.'],
    'invalid-project':['The project contains invalid settings or data.','Dự án có thiết lập hoặc dữ liệu không hợp lệ.'],
    'missing-script':['The declared Lua entry point is missing.','Thiếu tệp Lua khởi chạy đã khai báo.'],
    'export-settings':['Complete the project settings before exporting.','Hoàn thiện thiết lập dự án trước khi xuất.'],
    'sample-only':['This project only has sample data. Exporting does not create a game reader.','Dự án chỉ có dữ liệu mẫu. Xuất ZIP không tự tạo bộ đọc game.']
  };
  return messages[issue.code]?.[language==='vi'?1:0]??projectIssueText(issue,language);
}

export type PackFixDestination={mode:'2d';nodeId:string;inspector:'content'|'appearance'|'behavior'}|{mode:'code';path?:string}|{mode:'data'}|{mode:'project'};
export function packFixDestination(issue:PackIssue):PackFixDestination{
  if(issue.nodeId){
    const property=issue.property??'';
    const inspector=/^(onClick|visibleIf|classIf|bindStyle)(\.|$)/.test(property)?'behavior':/^(style|studioStyles)(\.|$)/.test(property)||property==='font'?'appearance':'content';
    return {mode:'2d',nodeId:issue.nodeId,inspector};
  }
  if(issue.target==='code')return {mode:'code',...(issue.location==='style.css'?{path:'style.css'}:issue.code==='missing-script'&&issue.detail?{path:issue.detail}:{})};
  return {mode:issue.target==='data'?'data':'project'};
}

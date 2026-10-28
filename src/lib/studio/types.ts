/** JSON-compatible data exchanged with packs and the live memory bridge. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue | undefined };
export type DataValues = Record<string, JsonValue | undefined>;
export type StyleValues = Record<string, string | number>;
export interface Skin { normal?: string; pressed?: string; selected?: string; fit?: string; width?: number; height?: number; showLabel?: boolean; transparentBackground?: boolean; [key: string]: JsonValue | undefined }
export interface LayoutEntry { name?: string; title?: string; child: LayoutNode; labelFont?: string; skin?: Skin }
/** Native widgets are extensible; known authoring fields have explicit contracts. */
export interface LayoutNode {
  id: string; type: string; class?: string; text?: string; src?: string; style?: StyleValues;
  studioStyles?: Record<string, Record<string, StyleValues>>;
  children?: LayoutNode[]; child?: LayoutNode; template?: LayoutNode;
  pages?: LayoutEntry[]; tabs?: LayoutEntry[];
  items?: string; empty?: string; visibleIf?: string; classIf?: Record<string,string>; bindStyle?: StyleValues;
  state?: string; initial?: string; onClick?: JsonValue; value?: string | number; maxKey?: string; max?: number; label?: string;
  buttonSkin?: Skin; font?: string; color?: string; bold?: boolean; size?: string | number;
  [key: string]: unknown;
}
export interface TreeRef { node: LayoutNode; parent: LayoutNode | LayoutEntry | null; key: string | null; index: number | null; depth: number; title?: string }
export interface PulseConfig { periodMs: number; bindings: Record<string,string> }
export type MemoryType = 'u8' | 's8' | 'u16' | 's16' | 'u32' | 's32';
export interface MemorySpec { type: MemoryType; addr?: string; ptr?: string; offset?: number; mask?: string; shift?: number }
export interface FieldInfo {
  semantic: 'hp.current' | 'hp.maximum';
  scope: 'fixed-unit' | 'selected-unit' | 'unknown';
  subject: string;
  label?: string;
  description?: string;
  aliases?: string[];
  verified?: boolean;
}
export interface GraphicsPart {x:number;y:number;w:number;h:number;tile:number;bank:number;hflip?:boolean;vflip?:boolean}
export interface GraphicsSpec {
  tiles:string;palette:string;width:number;height:number;lz77:boolean;
  kind?:'tiles'|'sprite';parts?:GraphicsPart[];
  tilesIndirect?:boolean;paletteIndirect?:boolean;tilesOffset?:number;paletteOffset?:number;
}
export interface DataFieldInfo {label?:string;labelVi?:string;description?:string;kind?:'number'|'string'|'boolean'|'list';aliases?:string[]}
export type Scalar = string | number | boolean;
export type ExpressionOp = 'choose' | 'eq' | 'ge' | 'and' | 'or' | 'first' | 'add' | 'sub' | 'mul' | 'max' | 'mod' | 'divfloor';
export type Expression = Scalar | {field?: string; lookup?: Expression; table?: Record<string,Scalar>; op?: ExpressionOp; args?: Expression[]};
export interface Manifest {
  id: string; name: string; version: string; author?: string; formatVersion?: number;
  match?: { gameCode?: string[]; crc32?: string[] }; tickHz?: number;
  layout?: string; styles?: string[]; script?: string;
  values?: Record<string,MemorySpec>; studioComputed?: Record<string,Expression>; studioPulse?: PulseConfig;
  studioFieldInfo?: Record<string,FieldInfo>; studioProfileName?: string;
  studioGraphics?: Record<string,GraphicsSpec>;
  studioDataFields?: Record<string,DataFieldInfo>;
  [key: string]: unknown;
}
export interface Project { studioVersion?: number; layout: LayoutNode; css: string; files: Record<string,string>; data: DataValues; manifest: Manifest; width: number; height: number; editorGrid?: {visible:boolean;snap:boolean;size:number}; [key: string]: unknown }
export interface RamRange {address:number;length:number}
export interface EncodedRamRange extends RamRange {base64:string}
export interface BridgeInfo {gameCode:string;deviceSerial?:string;crc32?:string;sessionId?:string;packId?:string;data?:DataValues;ranges?:EncodedRamRange[];bridgeVersion?:number;romSize?:number;capabilities?:{inspect?:boolean;maxRanges?:number;maxReadBytes?:number;maxRangeBytes?:number};[key:string]:unknown}
export type BridgeSend = (command:string,params?:{ranges:RamRange[]})=>Promise<BridgeInfo>;
export type AssetSource = string | ((path:string)=>string);

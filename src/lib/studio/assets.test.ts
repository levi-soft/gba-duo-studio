import {it,expect} from 'vitest';
import {assetImportPath} from './assets.js';
import {createProject,exportPack,importPack} from './project.js';
import {fontCatalog} from './fonts.js';

it('routes new images and fonts into separate folders regardless of extension case',()=>{
  for(const name of ['icon.png','Ảnh nền.JPG','icon.svg','scene.webp','anim.gif','photo.jpeg'])expect(assetImportPath(name)).toBe('assets/images/'+name);
  for(const name of ['MyFont.ttf','My Font.OTF','text.woff','text.woff2'])expect(assetImportPath(name)).toBe('assets/fonts/'+name);
  expect(assetImportPath('../icon.png')).toBe('assets/images/icon.png');
});

it('round-trips the new folders while keeping existing paths and font discovery',async()=>{
  const project=createProject('blank');project.manifest.match={gameCode:['TEST']};
  project.files['assets/icon.png']='b2xk';
  project.files[assetImportPath('icon.png')]='bmV3';
  project.files[assetImportPath('MyFont.ttf')]='Zm9udA==';
  expect(fontCatalog(project).some(f=>f.path==='assets/fonts/MyFont.ttf')).toBe(true);
  const imported=await importPack(await (await exportPack(project)).arrayBuffer());
  expect(imported.files['assets/icon.png']).toBe('b2xk');
  expect(imported.files['assets/images/icon.png']).toBe('bmV3');
  expect(imported.files['assets/fonts/MyFont.ttf']).toBe('Zm9udA==');
});

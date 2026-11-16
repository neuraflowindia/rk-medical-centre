import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {filesUnder,listDifferences,syncedList,run,WATCHED,LIST} from '../sync-hosting-list.mjs';
import {publicImagePath} from '../public-asset-boundary.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const list=JSON.parse(readFileSync(join(root,LIST),'utf8'));
const allowed=new Set(['.mjs','.js','.jsx','.ts','.tsx','.json','.css','.html','.txt','.xml','.svg','.png','.webp','.jpg','.jpeg','.ico','.woff2','.py']);

test('every file under src/ and public/ is named in the hosting list, and every name exists',()=>{
 const existing=WATCHED.flatMap(folder=>filesUnder(root,folder));
 assert.deepEqual(listDifferences(list.files,existing),{missing:[],stale:[]},'run: node scripts/sync-hosting-list.mjs');
 for(const name of list.files)assert.ok(existsSync(join(root,name)),`${name} is listed but does not exist`);
});

test('the list is sorted, has no doubles, and names only kinds the host accepts',()=>{
 assert.equal(list.version,1);
 assert.deepEqual(list.files,[...list.files].sort((a,b)=>a<b?-1:a>b?1:0));
 assert.equal(new Set(list.files).size,list.files.length);
 for(const name of list.files){
  const dot=name.lastIndexOf('.'),kind=dot<0?'':name.slice(dot);
  assert.ok(allowed.has(kind)||['.gitignore','.vercelignore','.python-version'].includes(name),`${name}: this kind of file is not hosted`);
  assert.ok(!/\.test\.mjs$|^scripts\/tests\/|^scripts\/smoke\/|dev-preview|sync-hosting-list/.test(name),`${name}: tests and development tools are not hosted`);
 }
 assert.equal(readFileSync(join(root,LIST),'utf8'),JSON.stringify(list,null,2)+'\n','two-space indent, one final line break');
});

test('pictures sit only in the three image folders and follow the naming rule; fonts never do',()=>{
 const publicFiles=list.files.filter(name=>name.startsWith('public/'));
 for(const name of publicFiles){
  if(name==='public/robots.txt')continue;
  assert.match('/'+name.slice('public/'.length),publicImagePath,`${name} breaks the image-folder rule`);
 }
 for(const folder of ['clinic-assets','client-photos','certificates'])assert.ok(publicFiles.some(name=>name.startsWith(`public/${folder}/`)),`${folder} must keep at least one file`);
 assert.ok(list.files.filter(name=>name.endsWith('.woff2')).every(name=>name.startsWith('src/site/fonts/')));
});

test('the list tool: keeps other names, adds new files, drops names whose file is gone',()=>{
 const current=['index.html','public/a.webp','src/gone.mjs','vite.config.js'],existing=['public/a.webp','public/b.webp','src/new.mjs'];
 assert.deepEqual(syncedList(current,existing),['index.html','public/a.webp','public/b.webp','src/new.mjs','vite.config.js']);
 assert.deepEqual(listDifferences(current,existing),{missing:['public/b.webp','src/new.mjs'],stale:['src/gone.mjs']});
 const folder=mkdtempSync(join(tmpdir(),'hosting-list-'));
 try{
  mkdirSync(join(folder,'appointment-settings'));mkdirSync(join(folder,'src/deep'),{recursive:true});
  writeFileSync(join(folder,'src/deep/a.mjs'),'');writeFileSync(join(folder,LIST),JSON.stringify({version:1,files:['index.html','src/old.mjs']}));
  const said=[];
  assert.equal(run({root:folder,check:true,log:line=>said.push(line)}),1);
  assert.deepEqual(said,['not listed: src/deep/a.mjs','listed but gone: src/old.mjs']);
  assert.equal(run({root:folder,log:()=>{}}),0);
  assert.deepEqual(JSON.parse(readFileSync(join(folder,LIST),'utf8')).files,['index.html','src/deep/a.mjs']);
  said.length=0;assert.equal(run({root:folder,check:true,log:line=>said.push(line)}),0);assert.match(said[0],/is true: 2 files/);
  assert.deepEqual(filesUnder(folder,'public'),[]);
 }finally{rmSync(folder,{recursive:true,force:true});}
});

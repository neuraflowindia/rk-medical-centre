#!/usr/bin/env node
/**
 * Keeps appointment-settings/hosting-files.json true to the folders. Development only.
 *
 * The hosted build receives only the files named in that list. Everything under `src/` and
 * `public/` must be named exactly once; a name whose file is gone must be removed. Files outside
 * those two folders (build scripts, configuration) are kept as they are.
 *
 *   node scripts/sync-hosting-list.mjs           # rewrite the list
 *   node scripts/sync-hosting-list.mjs --check   # only report; exit 1 if the list is not true
 */
import {readdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,relative,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const WATCHED=Object.freeze(['src','public']);
export const LIST='appointment-settings/hosting-files.json';

/** Every file under one folder, as paths from the project root with forward slashes. */
export function filesUnder(root,folder){
 const found=[];
 const visit=directory=>{
  for(const entry of readdirSync(directory,{withFileTypes:true})){
   const full=join(directory,entry.name);
   if(entry.isDirectory())visit(full);else if(entry.isFile())found.push(relative(root,full).split(sep).join('/'));
  }
 };
 if(existsSync(join(root,folder)))visit(join(root,folder));
 return found;
}

/**
 * The list as it should be (pure): names outside the watched folders are kept, names inside
 * them are exactly the files that exist. Sorted the way the list has always been sorted.
 */
export function syncedList(current,existing,watched=WATCHED){
 const inside=name=>watched.some(folder=>name.startsWith(folder+'/'));
 const kept=current.filter(name=>!inside(name));
 return [...new Set([...kept,...existing.filter(inside)])].sort((a,b)=>a<b?-1:a>b?1:0);
}

/** What differs between the list and the folders (pure). */
export function listDifferences(current,existing,watched=WATCHED){
 const wanted=new Set(syncedList(current,existing,watched)),have=new Set(current);
 return {missing:[...wanted].filter(name=>!have.has(name)),stale:current.filter(name=>!wanted.has(name))};
}

export function run({root,check=false,log=console.log}){
 const file=resolve(root,LIST),value=JSON.parse(readFileSync(file,'utf8'));
 const existing=WATCHED.flatMap(folder=>filesUnder(root,folder));
 const {missing,stale}=listDifferences(value.files,existing);
 if(!missing.length&&!stale.length){log(`The hosting list is true: ${value.files.length} files.`);return 0;}
 for(const name of missing)log(`not listed: ${name}`);
 for(const name of stale)log(`listed but gone: ${name}`);
 if(check)return 1;
 const files=syncedList(value.files,existing);
 writeFileSync(file,JSON.stringify({...value,files},null,2)+'\n');
 log(`The hosting list was rewritten: ${files.length} files.`);
 return 0;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 process.exit(run({root:fileURLToPath(new URL('..',import.meta.url)),check:process.argv.includes('--check')}));
}

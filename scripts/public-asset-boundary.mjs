import {lstatSync,readdirSync,readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
export const publicImagePath=/^\/(?:clinic-assets|client-photos|certificates)\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:webp|png|jpg|jpeg|svg|ico)$/;
/** The host exclusion accepts only ASCII image paths; encoded/unknown routes remain guarded. */
export function provePublicImages({dist,manifest}){
 const prefixes=['clinic-assets','client-photos','certificates'],counts={};
 const visit=directory=>{if(lstatSync(directory).isSymbolicLink())throw Error('Public image link forbidden');
  for(const item of readdirSync(directory,{withFileTypes:true})){const file=join(directory,item.name);if(item.isSymbolicLink())throw Error('Public image link forbidden');
   if(item.isDirectory())visit(file);else if(item.isFile()){const path='/'+relative(dist,file).replaceAll('\\','/');if(!publicImagePath.test(path)||manifest.assets[path]!=='general')throw Error('Unsafe excluded public image: '+path);counts[path.split('/')[1]]++;}else throw Error('Unexpected public image type');}};
 for(const prefix of prefixes){counts[prefix]=0;visit(join(dist,prefix));}
 if(!Object.values(counts).every(count=>count>0))throw Error('An excluded directory is empty');
 return {prefixes:counts,files:Object.values(counts).reduce((a,b)=>a+b,0),mixedAssetsExcluded:false,hostReadbackRequired:true};
}

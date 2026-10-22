// A disposable file server must serve declared imagery without opening APIs.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,cpSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {displayProof} from '../tools/checks/website-display.mjs';

async function fixture(run){
 const root=mkdtempSync(resolve(tmpdir(),'abs-display-proof-')),packageRoot=fileURLToPath(new URL('../',import.meta.url));
 mkdirSync(resolve(root,'appointment-settings'));mkdirSync(resolve(root,'dist/media'),{recursive:true});
 for(const shelf of ['hosting','worker','contracts'])cpSync(resolve(packageRoot,shelf),resolve(root,'appointment-system',shelf),{recursive:true});
 const project={installation_id:'891d05ec-8ab2-4a87-b537-1c30f2b694b6',project_id:'display-fixture',environment:'test',
  origin:'https://practice.example.test',aliases:[],worker:{origin:'https://worker.example.test'},surfaces:[{path:'/',class:'general'}]};
 const manifest={version:1,installation_id:project.installation_id,public_paths:['/'],booking_paths:['/booking'],
  backend_paths:['/studio','/studio/calendar','/enquiries-studio','/company'],
  assets:{'/media/glucose-meter-studio.webp':'general','/company-studio-mark.svg':'general'}};
 writeFileSync(resolve(root,'appointment-settings/project.json'),JSON.stringify(project));
 writeFileSync(resolve(root,'dist/appointment-surface-manifest.json'),JSON.stringify(manifest));
 writeFileSync(resolve(root,'dist/media/glucose-meter-studio.webp'),'synthetic studio imagery');
 writeFileSync(resolve(root,'dist/company-studio-mark.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
 let proof;
 try{proof=await displayProof(root,root);await run(proof);}
 finally{if(proof)await proof.close();rmSync(root,{recursive:true,force:true});}
}

test('display proof serves a declared studio-named general asset in both modes without a state read',async()=>fixture(async proof=>{
 for(const mode of [false,true]){
  proof.setEnabled(mode);const before=proof.state().reads;
  const reply=await fetch(proof.origin+'/media/glucose-meter-studio.webp');assert.equal(reply.status,200);
  assert.equal(await reply.text(),'synthetic studio imagery');assert.equal(proof.state().reads,before);
  const logo=await fetch(proof.origin+'/company-studio-mark.svg');assert.equal(logo.status,200);await logo.text();
  assert.equal(proof.state().reads,before);
 }
}));

test('display proof never serves backend path segments or proxies application reads',async()=>fixture(async proof=>{
 proof.setEnabled(true);
 for(const path of ['/studio','/studio/calendar','/enquiries-studio','/company','/company/booking-control','/api/contact/start','/api/checkout/status']){
  const reply=await fetch(proof.origin+path);assert.equal(reply.status,503,path);
  assert.equal((await reply.json()).code,'isolated_display_proof_no_application');
 }
 const absent=await fetch(proof.origin+'/studio/unlisted');assert.equal(absent.status,404);await absent.text();
}));

test('display proof refuses form writes even when a declared general asset is reachable',async()=>fixture(async proof=>{
 const reply=await fetch(proof.origin+'/media/glucose-meter-studio.webp',{method:'POST',body:'synthetic form'});
 assert.equal(reply.status,405);assert.equal(await reply.text(),'');
}));

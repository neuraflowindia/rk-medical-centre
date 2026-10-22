/** Test-only receiving contracts; providers and customer storage are never used. */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.env.CLINIC_SOURCE_ROOT),out=resolve(root,'verification-results/operating-source-coverage/native-refusals');
const artwork=await import(pathToFileURL(resolve(root,'src/clinic/artwork.js')).href);
assert.match(artwork.symbol('unknown'),/data-composition="unknown"/);
assert.match(artwork.utilityIcon('unknown'),/<svg/);
assert.match(artwork.layerImage('missing','unknown'),/<img /);
assert.throws(()=>artwork.composition('missing'),/Unknown composition/);
const draftAPI=await import(pathToFileURL(resolve(root,'src/clinic/visit-draft.mjs')).href);
const draft=draftAPI.createDraft();assert.equal(draftAPI.chooseDoctor(draft,'missing'),false);
assert.equal(draftAPI.chooseDoctor(draft,'sanjay'),true);draft.date='2026-11-01';draft.time='10:00';
assert.equal(draftAPI.chooseDoctor(draft,'sanjay'),true);assert.equal(draft.date,'2026-11-01');
assert.equal(draftAPI.chooseDoctor(draft,'parul'),true);assert.equal(draft.date,'');
assert.equal(draftAPI.chooseDoctor(draft,''),true);assert.equal(draft.doctor,'');
draftAPI.applyBookingQuery(draft,'?doctor=sanjay');assert.equal(draft.doctor,'sanjay');
assert.deepEqual(Object.keys(draftAPI.validateDraft(draft)).sort(),['name','phone']);
draft.name='Private QA';draft.phone='555';assert.deepEqual(draftAPI.validateDraft(draft),{});
const original=globalThis.FormData;
globalThis.FormData=class{constructor(value){return value[Symbol.iterator]();}};
try{draftAPI.updateDraft(draft,[['name','Changed QA'],['unknown','discard'],['message',{file:'discard'}]]);assert.equal(draft.name,'Changed QA');assert.equal(draft.unknown,undefined);assert.equal(draft.message,'');}finally{globalThis.FormData=original;}
const profile=await import(pathToFileURL(resolve(root,'scripts/require-hosting-profile.mjs')).href);
mkdirSync(resolve(out,'appointment-system'),{recursive:true});writeFileSync(resolve(out,'requirements.txt'),'different');writeFileSync(resolve(out,'appointment-system/requirements.txt'),'declared');
assert.throws(()=>profile.requireHostingDependencies(pathToFileURL(out+'/')),/dependencies must exactly match/);
const argv=[...process.argv];try{process.argv[1]=resolve(root,'scripts/require-hosting-profile.mjs');await import(pathToFileURL(process.argv[1]).href+'?native-cli-proof');}finally{process.argv=argv;}
const middleware=await import(pathToFileURL(resolve(root,'middleware.ts')).href);
assert.equal(typeof middleware.default,'function');
const excluded=new RegExp('^'+middleware.config.matcher+'$');
for(const path of ['/clinic-assets/example.webp','/client-photos/nested/doctor-1.png','/certificates/course.jpg'])assert.equal(excluded.test(path),false);
for(const path of ['/assets/booking.js','/api/private.png','/__booking_display/on/index.html','/clinic-assets/a.json','/clinic-assets/%61.webp','/clinic-assets/a.webp/private','/company/booking-control'])assert.equal(excluded.test(path),true);
console.log(JSON.stringify({passed:true,scope:'Receiving pure interfaces, missing-dependency refusal, native profile entry and emitted static matcher',provider_calls:0}));

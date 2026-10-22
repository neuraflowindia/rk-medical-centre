/** Disconnected native browser lifecycle/failure contracts; no product source mutation. */
import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {resolve,sep} from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';
const root=resolve(process.env.CLINIC_SOURCE_ROOT),out=resolve(process.env.CLINIC_UI_COUNTER_OUTPUT),origin='http://127.0.0.1:4252';
const coverageRoot=resolve(root,'verification-results/operating-source-coverage'),fingerprints=JSON.parse(readFileSync(resolve(coverageRoot,'source-fingerprints.json'))),baseline=JSON.parse(readFileSync(resolve(coverageRoot,'zero-hit-coverage.json')));
const require=createRequire(process.env.CLINIC_UI_TOOLS_PACKAGE),{createInstrumenter}=require('istanbul-lib-instrument');
const {chromium}=await import(pathToFileURL(resolve(process.env.BOOKING_BROWSER_NODE_MODULES,'playwright-core/index.mjs')));
mkdirSync(out);let sequence=0;const results=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.BOOKING_CHROME_EXECUTABLE,args:['--no-sandbox']});
async function make({reduced=false,blockedStorage=false,failPhotos=false,failCertificates=false}={}){
 const ctx=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:reduced?'reduce':'no-preference'});
 const faults={photos:failPhotos,certificates:failCertificates};
 if(blockedStorage)await ctx.addInitScript(()=>{for(const name of ['getItem','setItem'])Storage.prototype[name]=function(){throw new DOMException('Disconnected blocked-storage fixture','SecurityError');};});
 await ctx.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
  if(url.pathname==='/qa-owner-fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><style>[hidden]{display:none!important}body{margin:20px}img{max-width:300px;max-height:200px;object-fit:contain}dialog{width:700px;max-width:80vw}button{min-height:32px}.certificate-marquee-group{display:flex;width:max-content}.certificate-track{display:flex}.certificate-viewport{width:800px;overflow:hidden}.certificate-list-accessible{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.certificate-image-error[hidden]{display:none}</style></head><body><main></main></body></html>'});
  if(url.pathname.startsWith('/qa-original/')){
   const relative=url.pathname.slice('/qa-original/'.length);assert(/^src\/clinic\/[a-z0-9-]+\.(?:mjs|js)$/.test(relative),'Only declared original clinic modules can be served by this fixture');
   const file=resolve(root,relative);assert(file.startsWith(root+sep));assert(Object.hasOwn(fingerprints,file));
   const original=readFileSync(file,'utf8');assert.equal(createHash('sha256').update(original).digest('hex'),fingerprints[file]);
   const instrument=createInstrumenter({esModules:true,produceSourceMap:true,parserPlugins:['jsx','typescript'],coverageVariable:'__clinicCoverage__',coverageGlobalScope:'globalThis',coverageGlobalScopeFunc:false});
   const body=instrument.instrumentSync(original,file),zero=JSON.parse(JSON.stringify(instrument.lastFileCoverage()));
   assert.deepEqual(zero,baseline[file],'Use exactly the original zero-map');
   return route.fulfill({contentType:'text/javascript',body});
  }
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{code:'isolated_lifecycle_no_provider'}});
  if(faults.photos&&url.pathname.startsWith('/client-photos/'))return route.abort();
  if(faults.certificates&&url.pathname.startsWith('/certificates/'))return route.abort();
  return route.continue();
 });
 const page=await ctx.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/qa-owner-fixture');
 return {ctx,page,faults,errors};
}
async function capture(page){const data=JSON.parse(JSON.stringify(await page.evaluate(()=>globalThis.__clinicCoverage__||{})));assert(Object.keys(data).length>0);
 for(const [file,value] of Object.entries(data)){assert(Object.hasOwn(baseline,file));for(const key of ['statementMap','fnMap','branchMap'])assert.deepEqual(value[key],baseline[file][key]);}
 writeFileSync(resolve(out,'ui-'+ ++sequence+'.json'),JSON.stringify(data));
}
async function check(name,run){const fixtures=[];try{await run(async options=>{const f=await make(options);fixtures.push(f);return f;});for(const f of fixtures){assert.deepEqual(f.errors,[]);await capture(f.page);}results.push({name,pass:true});console.log('PASS '+name);}
 catch(error){results.push({name,pass:false,error:String(error.stack||error)});console.log('FAIL '+name+': '+error.message);}
 finally{for(const f of fixtures)await f.ctx.close();}}
async function photos(page,{gallery=true,plain=false,omitFailure=false,omitLabel=false,identity=false}={}){
 await page.evaluate(async options=>{
  const pictures=await import('/qa-original/src/clinic/clinic-photos.js'),binding=await import('/qa-original/src/clinic/photo-viewer.js');
  document.querySelector('main').innerHTML=options.gallery?pictures.clinicGallery():pictures.photoFigure('waiting-area',{open:!options.plain});
  if(options.omitFailure)document.querySelector('[data-photo-error]')?.remove();
  if(options.omitLabel)document.querySelector('[data-photo-open]')?.removeAttribute('aria-label');
  if(options.identity)document.querySelector('[data-photo-frame]').setAttribute('data-doctor-photo-frame','');
  window.fixturePhotoAbort=new AbortController();window.fixturePhotoDispose=binding.bindClinicPhotos({signal:fixturePhotoAbort.signal});
 },{gallery,plain,omitFailure,omitLabel,identity});
}
await check('Photo gallery selection, native viewer keys/focus cycle, backdrop and abort disposal',async create=>{
 const {page}=await create();await photos(page);
 await page.locator('[data-photo-select="reception"]').click();assert.equal(await page.locator('[data-clinic-gallery]').getAttribute('data-selected-photo'),'reception');assert.match(await page.locator('[data-photo-selection-status]').innerText(),/Reception selected/);
 await page.locator('[data-gallery-open]').click();await page.waitForTimeout(200);assert.equal(await page.locator('#clinic-photo-viewer').evaluate(node=>node.open),true);
 await page.locator('[data-viewer-frame][data-photo-state="ready"]').waitFor();
 await page.locator('[data-viewer-next]').click();await page.locator('[data-viewer-previous]').click();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
 await page.locator('[data-viewer-close]').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.locator(':focus').getAttribute('data-viewer-next'),'');
 await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('data-viewer-close'),'');
 await page.evaluate(()=>{const dialog=document.querySelector('#clinic-photo-viewer'),bounds=dialog.getBoundingClientRect();dialog.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:bounds.left-5,clientY:bounds.top-5}));});
 await page.waitForTimeout(200);assert.equal(await page.locator('#clinic-photo-viewer').evaluate(node=>node.open),false);
 await page.locator('[data-gallery-open]').click();await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-viewer-close]').click();assert.equal(await page.locator('#clinic-photo-viewer').evaluate(node=>node.open),false);
 await page.evaluate(()=>{document.querySelector('[data-gallery-open]').click();fixturePhotoAbort.abort();fixturePhotoDispose();});
 assert.equal(await page.locator('#clinic-photo-viewer').count(),0);assert.equal(await page.locator('html').evaluate(node=>node.classList.contains('dialog-open')),false);
});
await check('Page photograph errors retry a fresh resource, restore labels and move focus out of hidden failure',async create=>{
 const {page,faults}=await create({reduced:true,failPhotos:true});await photos(page,{gallery:false,omitFailure:true,omitLabel:true});
 await page.locator('[data-photo-frame][data-photo-state="error"]').waitFor();assert.equal(await page.locator('[data-photo-error]').isVisible(),true);assert.match(await page.locator('.clinic-photo-button').getAttribute('aria-label'),/^Retry photo/);
 faults.photos=false;await page.locator('.clinic-photo-button').click();await page.locator('[data-photo-frame][data-photo-state="ready"]').waitFor();assert.equal(await page.locator('.clinic-photo-button').getAttribute('aria-label'),null);assert.match(await page.locator('[data-client-photo-image]').getAttribute('src'),/photo-retry=/);
 await page.evaluate(()=>{fixturePhotoDispose();});faults.photos=true;await photos(page,{gallery:false,plain:true});
 await page.locator('[data-photo-frame][data-photo-state="error"]').waitFor();faults.photos=false;await page.locator('[data-photo-retry]').focus();await page.locator('[data-photo-retry]').click();await page.locator('[data-photo-frame][data-photo-state="ready"]').waitFor();
 assert.equal(await page.locator(':focus').evaluate(node=>node.tagName),'FIGURE');
 await page.evaluate(()=>{fixturePhotoAbort.abort();});
});
await check('Viewer request failure/retry preserves selection and superseded work cannot revive a disposed dialog',async create=>{
 const {page,faults}=await create({reduced:true});await photos(page,{gallery:false});await page.locator('[data-photo-frame][data-photo-state="ready"]').waitFor();
 faults.photos=true;await page.locator('.clinic-photo-button').click();await page.locator('[data-viewer-frame][data-photo-state="error"]').waitFor();
 const caption=await page.locator('[data-viewer-caption]').innerText();await page.locator('[data-viewer-retry]').focus();faults.photos=false;await page.locator('[data-viewer-retry]').click();await page.locator('[data-viewer-frame][data-photo-state="ready"]').waitFor();
 assert.equal(await page.locator('[data-viewer-caption]').innerText(),caption);assert.equal(await page.locator(':focus').getAttribute('data-viewer-close'),'');
 await page.evaluate(()=>{const close=document.querySelector('[data-viewer-close]'),trigger=document.querySelector('.clinic-photo-button');close.click();trigger.click();});await page.waitForTimeout(50);assert.equal(await page.locator('#clinic-photo-viewer').evaluate(node=>node.open),true);
 await page.evaluate(()=>{fixturePhotoDispose();fixturePhotoDispose();});assert.equal(await page.locator('#clinic-photo-viewer').count(),0);
});
async function certificates(page,{visible=true}={}){await page.evaluate(async visible=>{
 const module=await import('/qa-original/src/clinic/doctor-certificates.js');document.querySelector('main').innerHTML=module.certificateCollection('mixed');
 window.fixtureCertificateAbort=new AbortController();window.fixtureCertificateController=module.bindDoctorCertificates({signal:fixtureCertificateAbort.signal,visible});
 },visible);}
await check('Certificates preserve readable browse layout, keyboard/hover pauses and dispose owned clocks',async create=>{
 const {page}=await create();await certificates(page);
 await page.locator('[data-certificates]').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-certificates]').dataset.certificateLayout==='marquee');
 const root=page.locator('[data-certificates]');await root.hover();assert.equal(await root.getAttribute('data-certificate-motion'),'still');
 await page.mouse.move(0,0);await page.locator('[data-certificate-browse]').click();assert.equal(await root.getAttribute('data-certificate-layout'),'grid');assert.equal(await page.locator('[data-certificate-browse]').getAttribute('aria-expanded'),'true');
 await page.locator('[data-certificate-list]').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');
 await page.locator('[data-certificate-browse]').click();assert.equal(await page.locator('[data-certificate-browse]').getAttribute('aria-expanded'),'false');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('[data-certificates]').dataset.certificateLayout==='row');
 await page.evaluate(()=>{fixtureCertificateController.setVisible(false);fixtureCertificateController.setVisible(true);window.dispatchEvent(new Event('resize'));fixtureCertificateAbort.abort();fixtureCertificateController.dispose();fixtureCertificateController.setVisible(true);});
});
await check('Certificate media failure keeps captions and a focused retry returns the same certificate',async create=>{
 const {page,faults}=await create({reduced:true,failCertificates:true});await certificates(page);
 await page.locator('[data-certificates]').scrollIntoViewIfNeeded();await page.locator('[data-certificate-paper][data-media-state="error"]').first().waitFor();
 assert.match(await page.locator('[data-certificate-announcement]').innerText(),/could not be loaded/);
 const retry=page.locator('[data-certificate-retry]').first();await retry.focus();const id=await retry.evaluate(node=>node.closest('[data-certificate-id]').dataset.certificateId);
 faults.certificates=false;await retry.click();await page.waitForFunction(id=>[...document.querySelectorAll('[data-certificate-image]')].filter(node=>node.dataset.certificateId===id).every(node=>node.closest('[data-certificate-paper]').dataset.mediaState==='ready'),id);
 assert.equal(await page.locator(':focus').getAttribute('data-certificate-list'),'');assert.match(await page.locator('[data-certificate-image]').first().getAttribute('src'),/image-retry=1/);
 await page.evaluate(()=>{fixtureCertificateController.dispose();});
});
await check('Native dialog reopening, backdrop, reduced preference and explicit disposal retain focus and locks',async create=>{
 const {page}=await create();await page.evaluate(async()=>{
  const {bindDialog}=await import('/qa-original/src/clinic/dialog.js');document.querySelector('main').innerHTML='<button id="trigger">Open</button><dialog id="menu"><h2 tabindex="-1">Fixture heading</h2><button data-close>Close</button></dialog><dialog id="other"><button data-close>Other</button></dialog>';
  window.fixtureDialog=bindDialog(document.querySelector('#menu'));document.querySelector('#trigger').focus();fixtureDialog.open({focusHeading:true});
 });
 assert.equal(await page.locator(':focus').evaluate(node=>node.tagName),'H2');await page.locator('#menu [data-close]').click();await page.waitForTimeout(220);assert.equal(await page.locator('#menu').evaluate(node=>node.open),false);
 assert.equal(await page.locator(':focus').getAttribute('id'),'trigger');
 await page.evaluate(()=>{fixtureDialog.open();fixtureDialog.close();fixtureDialog.open();});await page.waitForTimeout(220);assert.equal(await page.locator('#menu').evaluate(node=>node.open),true);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{fixtureDialog.close();fixtureDialog.open();});await page.waitForTimeout(30);assert.equal(await page.locator('#menu').evaluate(node=>node.open),true);
 await page.evaluate(()=>{const dialog=document.querySelector('#menu'),bounds=dialog.getBoundingClientRect();dialog.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:bounds.left-5,clientY:bounds.top-5}));});await page.waitForTimeout(50);
 await page.evaluate(()=>{document.querySelector('#other').showModal();fixtureDialog.open();});assert.equal(await page.locator('#other').evaluate(node=>node.open),false);
 await page.evaluate(()=>{fixtureDialog.dispose();fixtureDialog.dispose();fixtureDialog.open();});assert.equal(await page.locator('#menu').evaluate(node=>node.open),false);assert.equal(await page.locator('html').evaluate(node=>node.classList.contains('dialog-open')),false);
});
await check('Privacy choice saves only refusal, handles blocked storage and releases owned panel/listeners',async create=>{
 for(const blockedStorage of [false,true]){const {page}=await create({reduced:true,blockedStorage});await page.evaluate(async()=>{
  const {createPreferences}=await import('/qa-original/src/clinic/visitor-preferences.js');window.fixturePreferences=createPreferences();fixturePreferences.open();
 });assert.equal(await page.locator('#privacy-panel').isVisible(),true);assert.equal(await page.locator('[data-allow]').isEnabled(),false);
 await page.locator('[data-deny]').click();assert.equal(await page.locator('#privacy-panel').isVisible(),false);assert.deepEqual(await page.evaluate(()=>{fixturePreferences.measurement.setVisible(true);fixturePreferences.measurement.setRoute('/');fixturePreferences.measurement.record('booking-click');return fixturePreferences.measurement.snapshot();}),[]);
 await page.evaluate(()=>{fixturePreferences.refresh();window.dispatchEvent(new StorageEvent('storage',{key:null}));fixturePreferences.open();});await page.locator('.privacy-close').click();assert.equal(await page.locator('#privacy-panel').isVisible(),false);
 await page.evaluate(()=>{fixturePreferences.dispose();});assert.equal(await page.locator('#privacy-panel').count(),0);}
});
await browser.close();for(const [file,hash] of Object.entries(fingerprints))assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),hash,'Original source changed');
const success=results.every(result=>result.pass);writeFileSync(resolve(out,'../'+out.split(sep).at(-1)+'-receipt.json'),JSON.stringify({successful:success,cases:results.length,results,originalSourceOwners:Object.keys(fingerprints).length,sourceHashesUnchanged:true,providerCalls:0,productMutations:0,testOnlyOriginalModuleFixtures:true},null,2)+'\n');process.exitCode=success?0:1;

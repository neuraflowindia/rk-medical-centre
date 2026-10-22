/** Disconnected final-render proof; never sends an enquiry or contacts providers. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const origin='http://127.0.0.1:4251',out=resolve(process.argv[2]);
const {chromium}=await import(pathToFileURL(resolve(process.env.BOOKING_BROWSER_NODE_MODULES,'playwright-core/index.mjs')).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.BOOKING_CHROME_EXECUTABLE,args:['--no-sandbox']});
const rows=[];mkdirSync(out,{recursive:true});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference'});
  await context.addCookies([{name:'clinic_qa_mode',value:'on',url:origin}]);
  let stateReads=0;
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname==='/api/service-state'){stateReads++;return route.fulfill({json:{enabled:true,activation_epoch:'891d05ec-8ab2-4a87-b537-1c30f2b694b6'}});}
   if(url.pathname==='/api/contact/policy')return route.fulfill({json:{version:1,receipt_key_id:'qa-current'}});
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,json:{code:'isolated_no_provider'}});
   return route.continue();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.clinicStartup={paints:[],shifts:[],actions:[]};
   new PerformanceObserver(list=>window.clinicStartup.paints.push(...list.getEntries().map(e=>({name:e.name,time:e.startTime})))).observe({type:'paint',buffered:true});
   new PerformanceObserver(list=>window.clinicStartup.shifts.push(...list.getEntries().filter(e=>!e.hadRecentInput).map(e=>({time:e.startTime,value:e.value})))).observe({type:'layout-shift',buffered:true});
   const timer=setInterval(()=>{const e=document.querySelector('.hero .actions');if(e){const r=e.getBoundingClientRect();window.clinicStartup.actions.push({time:performance.now(),height:r.height,width:r.width});}},40);
   setTimeout(()=>clearInterval(timer),4000);
  });
  await page.goto(origin+'/',{waitUntil:'networkidle'});await page.waitForFunction(()=>typeof window.designReview==='object');await page.waitForTimeout(4100);
  const startup=await page.evaluate(()=>window.clinicStartup),fcp=startup.paints.find(p=>p.name==='first-contentful-paint')?.time;
  assert(Number.isFinite(fcp),'Actual browser paint must be observed');
  const heights=startup.actions.filter(p=>p.time>=fcp).map(p=>Math.round(p.height));
  assert(heights.length>2);assert.equal(new Set(heights).size,1,'The CTA row must remain stable after first content paint');assert.equal(stateReads,1,'Native startup must perform exactly one shared state read');
  rows.push({page:'/',width,first_contentful_paint_ms:fcp,post_paint_action_heights:[...new Set(heights)],state_reads:stateReads,layout_shift:startup.shifts.reduce((sum,e)=>sum+e.value,0),scope:'Initial four seconds, synthetic immediate ON response; not field Core Web Vitals'});
  await page.goto(origin+'/contact',{waitUntil:'networkidle'});await page.waitForFunction(()=>typeof window.designReview==='object');
  for(const section of await page.locator('main section').all()){
   await section.scrollIntoViewIfNeeded();
   const box=await section.boundingBox();
   if(box&&box.height>900){for(let offset=0;offset<box.height;offset+=600){await section.evaluate((e,y)=>scrollTo(0,e.getBoundingClientRect().top+scrollY+y),offset);await page.waitForTimeout(180);}}
   await page.waitForTimeout(2800);
  }
  if(await page.locator('#visit-dialog[open]').count())await page.keyboard.press('Escape');
  const visible=await page.locator('[data-contact-form] input:not([type="hidden"]),[data-contact-form] textarea').evaluateAll(nodes=>nodes.filter(e=>!e.closest('[hidden]')).map(e=>({name:e.name,opacity:getComputedStyle(e).opacity,position:getComputedStyle(e).position,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
  assert(visible.length>=4);assert(visible.every(e=>e.opacity==='1'&&e.position==='static'&&e.width>200&&e.height>=44),'Every visible field must be legible and reachable');
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(400);await page.screenshot({path:resolve(out,width+'-contact.png'),fullPage:true});
  await page.addScriptTag({content:readFileSync(process.env.CLINIC_AXE_SCRIPT,'utf8')});
  const axe=await page.evaluate(()=>window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
  assert.deepEqual(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]);assert.deepEqual(errors,[]);
  rows.push({page:'/contact',width,visible_fields:visible,axe_violations:0,errors,screenshot:width+'-contact.png'});
  await context.close();
 }
 writeFileSync(resolve(out,'results.json'),JSON.stringify({passed:true,disconnected:true,provider_calls:0,real_messages:0,rows},null,2)+'\n');console.log(JSON.stringify({passed:true,observations:rows.length,real_messages:0}));
}finally{await browser.close();}

/** Actual original-HTML/browser utility identity, disconnected from all providers. */
import assert from 'node:assert/strict';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {writeFileSync} from 'node:fs';
const root=resolve(process.env.CLINIC_SOURCE_ROOT),origin=process.env.CLINIC_REVIEW_ORIGIN||'http://127.0.0.1:4252';
assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/);
const {utilityMetadata}=await import(pathToFileURL(resolve(root,'src/clinic/page-metadata.mjs')).href),{chromium}=await import(pathToFileURL(resolve(process.env.BOOKING_BROWSER_NODE_MODULES,'playwright-core/index.mjs')).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.BOOKING_CHROME_EXECUTABLE,args:['--no-sandbox']}),rows=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});await context.addCookies([{name:'clinic_qa_mode',value:'on',url:origin}]);
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();if(u.pathname==='/api/service-state')return r.fulfill({json:{enabled:true,activation_epoch:'891d05ec-8ab2-4a87-b537-1c30f2b694b6'}});if(u.pathname.startsWith('/api/'))return r.fulfill({status:503,json:{code:'isolated_metadata_no_provider'}});return r.continue();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/booking','/booking?doctor=sanjay','/booking-details','/booking-help']){
  const response=await page.goto(origin+path),raw=await response.text(),target=utilityMetadata[new URL(origin+path).pathname];assert.match(raw,/noindex, nofollow/);assert.doesNotMatch(raw,/rel=["']canonical["']|application\/ld\+json/);assert(raw.includes('<title>'+target.title+'</title>'));
  await page.locator('#clinic-booking-root').waitFor({state:'attached'});await page.waitForTimeout(350);
  const check=async()=>{assert.equal(await page.title(),target.title);assert.equal(await page.locator('link[rel=canonical],script[type="application/ld+json"],meta[property="og:url"],meta[name="twitter:url"]').count(),0);assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex, nofollow');};
  await check();await page.locator('.desktop-nav a[href="/"]').click();await page.waitForURL(origin+'/');await page.waitForFunction(()=>document.querySelector('link[rel=canonical]')?.href==='https://www.rkmedicalcentre.com/');await page.goBack();await page.locator('#clinic-booking-root').waitFor({state:'attached'});await check();
  rows.push({path,raw_utility_correct:true,runtime_correct:true,back_navigation_correct:true});
 }
 assert.deepEqual(errors,[]);writeFileSync(process.argv[2],JSON.stringify({passed:true,local_only:true,provider_calls:0,rows},null,2)+'\n');console.log(JSON.stringify({passed:true,cases:rows.length,provider_calls:0}));await context.close();
}finally{await browser.close();}

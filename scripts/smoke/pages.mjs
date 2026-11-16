#!/usr/bin/env node
/**
 * Browser smoke check of the built website: every public page, in booking ON and booking OFF,
 * at laptop and phone width, plus the booking screens. Development only; it uses the local
 * preview (scripts/dev-preview.mjs) and never touches the live site or the real back end.
 *
 * HOW TO USE IT (run from the website folder, after `npm run build:hosting`)
 *   PLAYWRIGHT_MODULE="/full/path/to/node_modules/playwright" npm run smoke
 *   node scripts/smoke/pages.mjs --playwright "/full/path/to/node_modules/playwright" --screenshots
 *
 *   Options
 *     --playwright <folder>   where the Playwright package is (or set PLAYWRIGHT_MODULE)
 *     --dist <folder>         built site to check (default: dist)
 *     --out <folder>          where results.json and pictures go (default: verification-results/smoke)
 *     --views <list>          widths x heights, comma separated (default: 1440x900,390x844)
 *     --screenshots           also save a full-page picture of every page in every state
 *
 * WHAT IT CHECKS ON EVERY PAGE
 *   the page opens (200) with its reviewed title; exactly one <main> and one <h1>; no sideways
 *   scrolling; no script errors and no failed requests; no broken pictures; the page says the
 *   right booking state; while booking is OFF no booking link or booking-only part is visible.
 *   Booking ON: /booking opens and shows the doctors; /booking-details opens.
 *   Booking OFF: /booking answers "Page not found".
 */
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createPreview,readManifest,BOOKING_COOKIE} from '../dev-preview.mjs';
import {pageMetadata,utilityMetadata} from '../../src/clinic/page-metadata.mjs';

const projectRoot=fileURLToPath(new URL('../..',import.meta.url));
export const DEFAULT_VIEWS=Object.freeze([{width:1440,height:900},{width:390,height:844}]);

/** "1440x900,390x844" → [{width:1440,height:900},{width:390,height:844}] */
export function parseViews(text){
 const views=String(text).split(',').map(item=>{
  const match=/^(\d{3,4})x(\d{3,4})$/.exec(item.trim());
  if(!match)throw new Error(`"${item}" is not a size like 1440x900`);
  return {width:Number(match[1]),height:Number(match[2])};
 });
 if(!views.length)throw new Error('At least one size is needed');
 return views;
}

/** Read the command line; the environment supplies the Playwright folder when no option does. */
export function parseSmokeArguments(argv,environment={}){
 const options={playwright:environment.PLAYWRIGHT_MODULE||'',dist:resolve(projectRoot,'dist'),
  out:resolve(projectRoot,'verification-results/smoke'),views:[...DEFAULT_VIEWS],screenshots:false};
 const args=[...argv];
 while(args.length){
  const name=args.shift();
  if(name==='--screenshots'){options.screenshots=true;continue;}
  const value=args.shift();
  if(value===undefined)throw new Error(`Missing value for ${name}`);
  if(name==='--playwright')options.playwright=value;
  else if(name==='--dist')options.dist=resolve(value);
  else if(name==='--out')options.out=resolve(value);
  else if(name==='--views')options.views=parseViews(value);
  else throw new Error(`Unknown option ${name}`);
 }
 return options;
}

/**
 * Every visit the check makes, in order: for each size and each booking state, the public pages,
 * then the booking screens (which must open while ON and be "not found" while OFF).
 */
export function planVisits({manifest,views=DEFAULT_VIEWS}){
 const visits=[];
 for(const view of views)for(const booking of ['on','off']){
  for(const path of manifest.public_paths)visits.push({view,booking,path,kind:'page',expectStatus:200,title:pageMetadata[path]?.title});
  for(const path of manifest.booking_paths.filter(item=>item!=='/booking-help'))
   visits.push({view,booking,path,kind:'booking',expectStatus:booking==='on'?200:404,title:booking==='on'?utilityMetadata[path]?.title:undefined});
 }
 return visits;
}

/** A file-safe name for one visit: "1440-on-home", "390-off-dr-parul-gupta". */
export function visitName({view,booking,path}){
 return `${view.width}-${booking}-${path==='/'?'home':path.slice(1).replaceAll('/','-')}`;
}

/**
 * Judge what the browser saw on one visit. Returns the list of problems in plain words;
 * an empty list means the visit passed.
 */
export function judge(visit,seen){
 const problems=[];
 if(seen.status!==visit.expectStatus)problems.push(`opened with ${seen.status}, expected ${visit.expectStatus}`);
 if(visit.expectStatus!==200)return problems;
 if(visit.title&&seen.title!==visit.title)problems.push(`title is "${seen.title}", expected "${visit.title}"`);
 if(seen.mains!==1)problems.push(`${seen.mains} <main> elements, expected 1`);
 if(seen.headings!==1)problems.push(`${seen.headings} <h1> elements, expected 1`);
 if(seen.overflow)problems.push('the page scrolls sideways');
 if(seen.bookingState!==visit.booking)problems.push(`page says booking is "${seen.bookingState}", expected "${visit.booking}"`);
 for(const error of seen.errors)problems.push(`script error: ${error}`);
 for(const failed of seen.failed)problems.push(`failed request: ${failed}`);
 for(const image of seen.broken)problems.push(`broken picture: ${image}`);
 if(visit.booking==='off'){
  if(seen.visibleBookingLinks>0)problems.push(`${seen.visibleBookingLinks} booking link(s) visible while booking is OFF`);
  if(seen.visibleBookingOnly>0)problems.push(`${seen.visibleBookingOnly} booking-only part(s) visible while booking is OFF`);
 }
 if(visit.kind==='booking'&&visit.path==='/booking'&&seen.bookingDoctors<1)problems.push('the booking screen did not show the doctors');
 if(visit.kind==='booking'&&!seen.bookingRoot)problems.push('the booking screen has no #clinic-booking-root');
 return problems;
}

/** One line per visit, then the totals. */
export function summarise(results){
 const failed=results.filter(result=>result.problems.length);
 const lines=results.map(result=>`${result.problems.length?'FAIL':'ok  '} ${visitName(result.visit).padEnd(34)} ${result.problems.join('; ')}`);
 lines.push(`${results.length-failed.length} of ${results.length} visits passed`);
 return {passed:failed.length===0,text:lines.join('\n')};
}

/** What the browser reports about the page it has open. Runs inside the page. */
export function inspectPage(){
 const shown=element=>!!element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden';
 return {
  title:document.title,
  mains:document.querySelectorAll('main').length,
  headings:document.querySelectorAll('h1').length,
  overflow:document.documentElement.scrollWidth>innerWidth+1,
  bookingState:document.documentElement.dataset.bookingState||'',
  broken:[...document.images].filter(image=>image.complete&&!image.naturalWidth&&image.getAttribute('src')).map(image=>image.getAttribute('src')),
  visibleBookingLinks:[...document.querySelectorAll('a[href^="/booking"]')].filter(shown).length,
  visibleBookingOnly:[...document.querySelectorAll('[data-booking-only]')].filter(shown).length,
  bookingRoot:!!document.querySelector('#clinic-booking-root'),
  bookingDoctors:document.querySelectorAll('#clinic-booking-root .doctor-choices input[type="radio"]').length
 };
}

/** Start the real browser from the Playwright package the options point to. */
export function launchBrowser(options){
 if(!options.playwright)throw new Error('Tell the check where Playwright is: --playwright <folder> or PLAYWRIGHT_MODULE.');
 const {chromium}=createRequire(import.meta.url)(resolve(options.playwright));
 return chromium.launch({headless:true});
}

/** Open every planned visit in a browser and judge it. `launch` can be replaced in tests. */
export async function runSmoke(options,{log=console.log,launch=launchBrowser}={}){
 const manifest=readManifest(options.dist),visits=planVisits({manifest,views:options.views});
 const browser=await launch(options),results=[];
 const preview=createPreview({dist:options.dist}),running=await preview.listen({port:0});
 mkdirSync(options.out,{recursive:true});
 try{
  let context=null,key='';
  for(const visit of visits){
   const wanted=`${visit.view.width}x${visit.view.height}-${visit.booking}`;
   if(wanted!==key){
    await context?.close();key=wanted;
    context=await browser.newContext({viewport:visit.view,reducedMotion:'no-preference'});
    await context.addCookies([{name:BOOKING_COOKIE,value:visit.booking,url:running.origin}]);
   }
   const page=await context.newPage(),errors=[],failed=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('console',message=>{if(message.type()==='error'&&!/Failed to load resource/.test(message.text()))errors.push(message.text());});
   page.on('response',response=>{
    const url=new URL(response.url());
    if(url.origin===running.origin&&response.status()>=400&&url.pathname!==visit.path&&response.headers()['x-preview']!=='not-simulated')
     failed.push(`${response.status()} ${url.pathname}`);
   });
   const response=await page.goto(running.origin+visit.path,{waitUntil:'load'});
   let seen={status:response.status(),errors,failed,broken:[]};
   if(response.status()===200){
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(visit.kind==='booking'?2500:900);
    seen={...seen,...await page.evaluate(inspectPage)};
    if(options.screenshots)await page.screenshot({path:resolve(options.out,visitName(visit)+'.png'),fullPage:true});
   }
   const problems=judge(visit,seen);
   results.push({visit,seen,problems});
   log(`${problems.length?'FAIL':'ok  '} ${visitName(visit)}${problems.length?' — '+problems.join('; '):''}`);
   await page.close();
  }
  await context?.close();
 }finally{
  await browser.close();await running.close();
  writeFileSync(resolve(options.out,'results.json'),JSON.stringify({checked:new Date().toISOString(),results},null,2)+'\n');
 }
 return summarise(results);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 runSmoke(parseSmokeArguments(process.argv.slice(2),process.env),{log:()=>{}}).then(summary=>{
  console.log(summary.text);process.exit(summary.passed?0:1);
 }).catch(error=>{console.error(error.message);process.exit(2);});
}

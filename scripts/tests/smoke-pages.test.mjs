import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {parseViews,parseSmokeArguments,planVisits,visitName,judge,summarise,runSmoke,launchBrowser,inspectPage,DEFAULT_VIEWS} from '../smoke/pages.mjs';
import {pageFile,BOOKING_COOKIE} from '../dev-preview.mjs';
import {pageMetadata,utilityMetadata} from '../../src/clinic/page-metadata.mjs';

const publicPaths=Object.keys(pageMetadata);
const manifest={version:1,installation_id:'test',public_paths:publicPaths,booking_paths:['/booking','/booking-details','/booking-help'],backend_paths:[],assets:{}};
const laptop={width:1440,height:900},phone={width:390,height:844};
const good=(visit,extra={})=>({status:200,title:visit.title,mains:1,headings:1,overflow:false,bookingState:visit.booking,errors:[],failed:[],broken:[],
 visibleBookingLinks:visit.booking==='on'?3:0,visibleBookingOnly:visit.booking==='on'?2:0,bookingRoot:visit.kind==='booking',bookingDoctors:visit.path==='/booking'?2:0,...extra});

function builtSite(t){
 const dist=mkdtempSync(join(tmpdir(),'rk-smoke-test-'));
 t.after(()=>rmSync(dist,{recursive:true,force:true}));
 const write=(name,text)=>{mkdirSync(resolve(dist,name,'..'),{recursive:true});writeFileSync(resolve(dist,name),text);};
 write('appointment-surface-manifest.json',JSON.stringify(manifest));
 for(const booking of ['on','off'])for(const path of publicPaths)write(pageFile(path,booking),'<html><main><h1>page</h1></main></html>');
 for(const path of manifest.booking_paths)write(pageFile(path,'on'),'<html><main><h1>booking</h1></main></html>');
 return dist;
}

test('sizes are read from text like 1440x900,390x844',()=>{
 assert.deepEqual(parseViews('1440x900, 390x844'),[laptop,phone]);
 assert.deepEqual(DEFAULT_VIEWS,[laptop,phone]);
 assert.throws(()=>parseViews('wide'),/not a size like 1440x900/);
 assert.throws(()=>parseViews(''),/not a size/);
});

test('the command line: defaults, the environment, every option, and plain refusals',()=>{
 const defaults=parseSmokeArguments([]);
 assert.equal(defaults.playwright,'');assert.match(defaults.dist,/dist$/);assert.match(defaults.out,/verification-results[\\/]smoke$/);
 assert.deepEqual(defaults.views,[laptop,phone]);assert.equal(defaults.screenshots,false);
 assert.equal(parseSmokeArguments([],{PLAYWRIGHT_MODULE:'/modules/playwright'}).playwright,'/modules/playwright');
 const chosen=parseSmokeArguments(['--playwright','/pw','--dist','/tmp/site','--out','/tmp/out','--views','320x740','--screenshots'],{PLAYWRIGHT_MODULE:'/other'});
 assert.deepEqual(chosen,{playwright:'/pw',dist:resolve('/tmp/site'),out:resolve('/tmp/out'),views:[{width:320,height:740}],screenshots:true});
 assert.throws(()=>parseSmokeArguments(['--speed','9']),/Unknown option --speed/);
 assert.throws(()=>parseSmokeArguments(['--dist']),/Missing value for --dist/);
});

test('the plan visits seven pages and two booking screens, in both states, at every size',()=>{
 const visits=planVisits({manifest});
 assert.equal(visits.length,2*2*(7+2));
 assert.deepEqual(planVisits({manifest,views:[phone]}).length,2*(7+2));
 assert.ok(visits.every(visit=>visit.path!=='/booking-help'),'the old alias is not visited separately');
 const pages=visits.filter(visit=>visit.kind==='page');
 assert.ok(pages.every(visit=>visit.expectStatus===200&&visit.title===pageMetadata[visit.path].title));
 const screens=visits.filter(visit=>visit.kind==='booking');
 assert.ok(screens.filter(visit=>visit.booking==='on').every(visit=>visit.expectStatus===200&&visit.title===utilityMetadata[visit.path].title));
 assert.ok(screens.filter(visit=>visit.booking==='off').every(visit=>visit.expectStatus===404&&visit.title===undefined));
 assert.equal(visitName({view:laptop,booking:'on',path:'/'}),'1440-on-home');
 assert.equal(visitName({view:phone,booking:'off',path:'/dr-parul-gupta'}),'390-off-dr-parul-gupta');
});

test('a healthy page passes; every kind of fault is named in plain words',()=>{
 const visits=planVisits({manifest,views:[laptop]});
 const page=visits.find(visit=>visit.path==='/'&&visit.booking==='on'),offPage=visits.find(visit=>visit.path==='/contact'&&visit.booking==='off');
 const screen=visits.find(visit=>visit.path==='/booking'&&visit.booking==='on'),offScreen=visits.find(visit=>visit.path==='/booking'&&visit.booking==='off');
 const details=visits.find(visit=>visit.path==='/booking-details'&&visit.booking==='on');
 for(const visit of [page,offPage,screen,details])assert.deepEqual(judge(visit,good(visit)),[]);
 assert.deepEqual(judge(offScreen,{status:404,errors:[],failed:[],broken:[]}),[]);
 assert.deepEqual(judge(offScreen,{status:200,errors:[],failed:[],broken:[]}),['opened with 200, expected 404']);
 assert.deepEqual(judge(page,good(page,{status:500})),['opened with 500, expected 200']);
 assert.deepEqual(judge(page,good(page,{title:'Home'})),[`title is "Home", expected "${page.title}"`]);
 assert.deepEqual(judge(page,good(page,{mains:2})),['2 <main> elements, expected 1']);
 assert.deepEqual(judge(page,good(page,{headings:0})),['0 <h1> elements, expected 1']);
 assert.deepEqual(judge(page,good(page,{overflow:true})),['the page scrolls sideways']);
 assert.deepEqual(judge(page,good(page,{bookingState:'off'})),['page says booking is "off", expected "on"']);
 assert.deepEqual(judge(page,good(page,{errors:['x is not defined'],failed:['404 /assets/a.js'],broken:['/clinic-assets/a.webp']})),
  ['script error: x is not defined','failed request: 404 /assets/a.js','broken picture: /clinic-assets/a.webp']);
 assert.deepEqual(judge(offPage,good(offPage,{visibleBookingLinks:2,visibleBookingOnly:1})),['2 booking link(s) visible while booking is OFF','1 booking-only part(s) visible while booking is OFF']);
 assert.deepEqual(judge(page,good(page,{visibleBookingLinks:9})),[],'booking links are expected while ON');
 assert.deepEqual(judge(screen,good(screen,{bookingDoctors:0,bookingRoot:false})),['the booking screen did not show the doctors','the booking screen has no #clinic-booking-root']);
 assert.deepEqual(judge({...page,title:undefined},good(page,{title:'anything'})),[],'a page without a reviewed title is not judged on its title');
});

test('the summary lists every visit and the totals',()=>{
 const visits=planVisits({manifest,views:[phone]});
 const results=visits.map((visit,index)=>({visit,problems:index===1?['the page scrolls sideways']:[]}));
 const summary=summarise(results);
 assert.equal(summary.passed,false);assert.match(summary.text,/FAIL 390-on-treatment\s+the page scrolls sideways/);assert.match(summary.text,/17 of 18 visits passed$/);
 assert.equal(summarise(results.filter(result=>!result.problems.length)).passed,true);
});

test('the page inspector reads what the check needs from a page',t=>{
 const saved={document:globalThis.document,innerWidth:globalThis.innerWidth,getComputedStyle:globalThis.getComputedStyle};
 t.after(()=>Object.assign(globalThis,saved));
 const element=(rects,visibility='visible')=>({getClientRects:()=>({length:rects}),visibility});
 const lists={main:[{}],h1:[{}],'a[href^="/booking"]':[element(1),element(0),element(1,'hidden')],'[data-booking-only]':[element(1),element(1)],
  '#clinic-booking-root .doctor-choices input[type="radio"]':[{},{}]};
 globalThis.document={title:'A page',documentElement:{scrollWidth:400,dataset:{bookingState:'on'}},
  images:[{complete:true,naturalWidth:0,getAttribute:()=>'/clinic-assets/missing.webp'},{complete:true,naturalWidth:10,getAttribute:()=>'/ok.webp'},{complete:false,naturalWidth:0,getAttribute:()=>'/later.webp'}],
  querySelectorAll:selector=>lists[selector]||[],querySelector:selector=>selector==='#clinic-booking-root'?{}:null};
 globalThis.innerWidth=390;globalThis.getComputedStyle=item=>({visibility:item.visibility});
 assert.deepEqual(inspectPage(),{title:'A page',mains:1,headings:1,overflow:true,bookingState:'on',broken:['/clinic-assets/missing.webp'],
  visibleBookingLinks:1,visibleBookingOnly:2,bookingRoot:true,bookingDoctors:2});
 globalThis.document.documentElement={scrollWidth:390,dataset:{}};
 assert.equal(inspectPage().overflow,false);assert.equal(inspectPage().bookingState,'');
});

/** A stand-in browser: it really asks the preview for each page, and reports a canned look at it. */
function fakeBrowser(look){
 const log={contexts:[],cookies:[],shots:[],closed:false};
 const browser={
  async newContext(options){
   const context={options,cookie:''};log.contexts.push(context);
   return {
    async addCookies(list){log.cookies.push(...list);context.cookie=list.map(item=>`${item.name}=${item.value}`).join('; ');},
    async newPage(){
     const handlers={};let current=null;
     return {
      on(name,handler){handlers[name]=handler;},
      async goto(url){
       const reply=await fetch(url,{headers:{cookie:context.cookie}});current={url,status:reply.status};
       look.onVisit?.({url,handlers,reply});
       return {status:()=>reply.status};
      },
      async evaluate(action){return action===inspectPage?look.seen(current,context):undefined;},
      async waitForTimeout(){},
      async screenshot({path}){log.shots.push(path);},
      async close(){}
     };
    },
    async close(){context.closed=true;}
   };
  },
  async close(){log.closed=true;}
 };
 return {browser,log};
}

test('a full run: four browser sessions, every visit judged, results written',async t=>{
 const dist=builtSite(t),out=join(dist,'out');
 const {browser,log}=fakeBrowser({seen:(current,context)=>{
  const path=new URL(current.url).pathname,booking=context.cookie.endsWith('=on')?'on':'off';
  const title=(pageMetadata[path]||utilityMetadata[path]).title;
  return {title,mains:1,headings:1,overflow:false,bookingState:booking,broken:[],visibleBookingLinks:0,visibleBookingOnly:0,bookingRoot:true,bookingDoctors:2};
 }});
 const said=[];
 const summary=await runSmoke({dist,out,views:[laptop,phone],screenshots:true},{log:line=>said.push(line),launch:async()=>browser});
 assert.equal(summary.passed,true);assert.match(summary.text,/36 of 36 visits passed$/);
 assert.equal(log.contexts.length,4);assert.deepEqual(log.contexts.map(context=>context.options.viewport.width),[1440,1440,390,390]);
 assert.deepEqual(log.cookies.map(cookie=>[cookie.name,cookie.value]),[[BOOKING_COOKIE,'on'],[BOOKING_COOKIE,'off'],[BOOKING_COOKIE,'on'],[BOOKING_COOKIE,'off']]);
 assert.ok(log.contexts.every(context=>context.closed)&&log.closed,'everything is closed afterwards');
 assert.equal(log.shots.length,32,'a picture of every page that opened (the four "not found" visits have none)');
 assert.equal(said.length,36);assert.ok(said.every(line=>line.startsWith('ok')));
 const written=JSON.parse(readFileSync(join(out,'results.json'),'utf8'));
 assert.equal(written.results.length,36);assert.ok(Number.isFinite(Date.parse(written.checked)));
});

test('a run with faults fails, names them, and still writes its results',async t=>{
 const dist=builtSite(t),out=join(dist,'out');
 const {browser}=fakeBrowser({
  onVisit({url,handlers}){
   if(!url.endsWith('/treatment'))return;
   handlers.pageerror({message:'boom'});
   handlers.console({type:()=>'error',text:()=>'Uncaught oops'});
   handlers.console({type:()=>'error',text:()=>'Failed to load resource: 404'});
   handlers.console({type:()=>'log',text:()=>'just a note'});
   const origin=new URL(url).origin;
   handlers.response({url:()=>origin+'/assets/missing.js',status:()=>404,headers:()=>({})});
   handlers.response({url:()=>origin+'/api/checkout',status:()=>503,headers:()=>({'x-preview':'not-simulated'})});
   handlers.response({url:()=>origin+'/treatment',status:()=>404,headers:()=>({})});
   handlers.response({url:()=>'https://elsewhere.example/font.css',status:()=>404,headers:()=>({})});
   handlers.response({url:()=>origin+'/assets/fine.js',status:()=>200,headers:()=>({})});
  },
  seen:current=>{
   const path=new URL(current.url).pathname;
   return {title:(pageMetadata[path]||utilityMetadata[path]).title,mains:1,headings:path==='/contact'?2:1,overflow:false,bookingState:'on',broken:[],
    visibleBookingLinks:0,visibleBookingOnly:0,bookingRoot:true,bookingDoctors:2};
  }
 });
 const summary=await runSmoke({dist,out,views:[phone],screenshots:false},{log:()=>{},launch:async()=>browser});
 assert.equal(summary.passed,false);
 assert.match(summary.text,/FAIL 390-on-treatment\s+script error: boom; script error: Uncaught oops; failed request: 404 \/assets\/missing\.js/);
 assert.match(summary.text,/FAIL 390-on-contact\s+2 <h1> elements, expected 1/);
 assert.match(summary.text,/FAIL 390-off-home\s+page says booking is "on", expected "off"/);
 assert.ok(existsSync(join(out,'results.json')));
 assert.equal(existsSync(join(out,'390-on-home.png')),false,'no pictures unless asked');
});

test('the real browser needs to be told where Playwright is',async t=>{
 const dist=builtSite(t);
 assert.throws(()=>launchBrowser({playwright:''}),/Tell the check where Playwright is/);
 assert.throws(()=>launchBrowser({playwright:join(dist,'no-such-module')}),/Cannot find module/);
 await assert.rejects(runSmoke({dist,out:join(dist,'out'),views:[phone],playwright:''}),/Tell the check where Playwright is/);
 await assert.rejects(runSmoke({dist:join(dist,'not-built'),out:join(dist,'out'),views:[phone]},{launch:async()=>({})}),/No built site/);
});

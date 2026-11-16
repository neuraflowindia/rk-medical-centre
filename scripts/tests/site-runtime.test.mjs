import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {tidyPath,resolveAddress,isBookingAddress,linkAction,createScrollMemory,addressAliases} from '../../src/site/runtime/router.mjs';
import {knownPaths} from '../../src/site/runtime/registry.mjs';
import {createView,watchPictures,releaseControls} from '../../src/site/runtime/render.mjs';
import {entryState,syncEntries,syncBookingState,bindBookingState,ENTRY_SELECTOR} from '../../src/site/runtime/booking-state.mjs';
import {createIsland,unavailableState} from '../../src/site/runtime/booking-island.mjs';
import {partBehaviours,bindClock} from '../../src/site/runtime/parts.mjs';
import {createMotion} from '../../src/site/motion/motion.mjs';
import {createSheets} from '../../src/site/parts/sheet/sheet.behaviour.mjs';
import {renderPublicDocument} from '../../src/clinic/public-document.mjs';
import {createPage,installGlobals,Event} from './support/mini-dom.mjs';
import {TEST_NOW} from './support/page-contract.mjs';

const shell=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const here={origin:'https://clinic.test',pathname:'/'};
const click=(more={})=>({button:0,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false,defaultPrevented:false,...more});
const link=(raw,more={})=>({href:new URL(raw,'https://clinic.test/').href,raw,target:'',download:false,...more});

test('addresses are tidied; unknown ones show Home; the older booking address opens "Find your booking"',()=>{
 assert.equal(tidyPath('/About-Clinic/'),'/about-clinic');assert.equal(tidyPath('/contact.html'),'/contact');assert.equal(tidyPath('/%E0%A4%A'),null);assert.equal(tidyPath('/a/../b'),null);
 assert.deepEqual(resolveAddress('/treatment',knownPaths),{path:'/treatment',found:true,rewrite:false});
 assert.deepEqual(resolveAddress('/Treatment/',knownPaths),{path:'/treatment',found:true,rewrite:true});
 assert.deepEqual(resolveAddress('/booking-help',knownPaths),{path:'/booking-details',found:true,rewrite:true});
 assert.deepEqual(resolveAddress('/nowhere',knownPaths),{path:'/',found:false,rewrite:false});
 assert.deepEqual(resolveAddress('/%',knownPaths),{path:'/',found:false,rewrite:false});
 assert.deepEqual(addressAliases,{'/booking-help':'/booking-details'});
 assert.equal(isBookingAddress('/booking?doctor=parul'),true);assert.equal(isBookingAddress('/contact'),false);
});

test('a click on a link: left to the browser, a place on this page, a booking screen, or another page',()=>{
 const act=(raw,linkMore,clickMore,from=here)=>linkAction(click(clickMore),link(raw,linkMore),from,knownPaths);
 assert.deepEqual(act('/treatment'),{kind:'page',path:'/treatment',hash:''});
 assert.deepEqual(act('/treatment?topic=thyroid#thyroid'),{kind:'page',path:'/treatment?topic=thyroid',hash:'#thyroid'});
 assert.deepEqual(act('/booking?doctor=sanjay'),{kind:'booking',path:'/booking?doctor=sanjay'});
 assert.deepEqual(act('/booking-help'),{kind:'booking',path:'/booking-details'});
 assert.deepEqual(act('#doctors'),{kind:'place',hash:'#doctors'});
 assert.deepEqual(act('/#reviews'),{kind:'place',hash:'#reviews',push:true},'a place on the page already shown');
 assert.deepEqual(act('/contact#privacy-notice',{}, {}, {origin:'https://clinic.test',pathname:'/contact'}),{kind:'place',hash:'#privacy-notice',push:true});
 for(const left of [act('#'),act('https://maps.app.goo.gl/x'),act('tel:+919415049410'),act('/studio'),act('/treatment',{target:'_blank'}),act('/treatment',{download:true}),
  act('/treatment',{},{button:1}),act('/treatment',{},{ctrlKey:true}),act('/treatment',{},{metaKey:true}),act('/treatment',{},{shiftKey:true}),act('/treatment',{},{altKey:true}),act('/treatment',{},{defaultPrevented:true}),
  linkAction(click(),null,here,knownPaths),linkAction(click(),{href:'http://[bad',raw:'x',target:''},here,knownPaths),act('/a/../b')])assert.deepEqual(left,{kind:'leave'});
 assert.deepEqual(act('/contact',{target:'_self'}),{kind:'page',path:'/contact',hash:''});
 const memory=createScrollMemory();
 assert.equal(memory.next(),1);assert.equal(memory.next(),2);memory.save(1,640);memory.save(undefined,5);assert.equal(memory.read(1),640);assert.equal(memory.read(9),0);
});

test('the main booking controls change words and address but never disappear; other booking links do',()=>{
 assert.deepEqual(entryState('header',true,'/booking'),{href:'/booking',spoken:'Book an appointment',hint:'Book an appointment online',label:'Book an appointment',icon:'calendar',current:true});
 assert.deepEqual(entryState('page',false),{href:'/contact',spoken:'Arrange a visit by calling the clinic',hint:'Call the clinic to arrange an appointment',label:'Arrange a visit',icon:'phone',current:false});
 const page=createPage({body:`<a id="head" href="/booking" data-booking-entry="header" data-booking-only hidden><span data-home-entry-icon="calendar"></span><span data-home-entry-icon="phone" hidden></span><span data-booking-on="Book an appointment" data-booking-off="Book an appointment">Book an appointment</span></a>
  <a id="hero" href="/booking" data-booking-entry="page"><span data-booking-on="Book an appointment" data-booking-off="Arrange a visit">Book an appointment</span></a>
  <a id="book" href="/booking?doctor=parul">Book with Dr. Parul</a><a id="other" href="/contact">Contact</a><div id="only" data-booking-only>only on</div><p id="offonly" data-booking-off-only hidden inert>only off</p>`});
 const $=id=>page.document.getElementById(id);
 assert.equal(syncBookingState(page.document,{enabled:false,route:'/'}),2);
 assert.equal($('head').getAttribute('href'),'/contact');assert.equal($('head').hidden,false);assert.equal($('head').hasAttribute('data-booking-only'),false);
 assert.equal($('head').getAttribute('aria-label'),'Book an appointment by calling the clinic');assert.equal($('head').querySelector('[data-home-entry-icon="phone"]').hidden,false);
 assert.equal($('hero').textContent,'Arrange a visit');assert.equal($('hero').getAttribute('title'),'Call the clinic to arrange an appointment');
 assert.equal($('book').hasAttribute('href'),false);assert.equal($('book').getAttribute('data-booking-href'),'/booking?doctor=parul');assert.ok($('book').hidden&&$('book').inert);
 assert.equal($('other').getAttribute('href'),'/contact');assert.ok($('only').hidden&&$('only').inert);assert.ok(!$('offonly').hidden&&!$('offonly').inert);
 syncBookingState(page.document,{enabled:true,route:'/booking'});
 assert.equal($('head').getAttribute('href'),'/booking');assert.equal($('head').getAttribute('aria-current'),'page');assert.equal($('hero').textContent,'Book an appointment');assert.equal($('hero').hasAttribute('aria-current'),false);
 assert.equal($('book').getAttribute('href'),'/booking?doctor=parul');assert.ok(!$('book').hidden&&!$('only').hidden&&$('offonly').hidden);
 assert.equal(syncEntries(page.document,true).size,2);assert.equal(ENTRY_SELECTOR,'[data-booking-entry]');
});

test('the booking state is followed for the life of the page and parts hear only real changes',()=>{
 const page=createPage({body:'<a id="book" href="/booking">Book</a>'});
 let snapshot={enabled:true},listeners=new Set();
 const state={getSnapshot:()=>snapshot,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);}};
 const booking=bindBookingState({state,displayAllowed:value=>value.enabled,windowObject:page.window,documentObject:page.document,route:()=>'/'});
 const heard=[],abort=new AbortController();booking.subscribe(value=>heard.push(value),{signal:abort.signal});
 booking.sync();assert.deepEqual(heard,[true]);assert.equal(booking.enabled(),true);
 page.window.dispatchEvent(new Event('booking:visibility',{bubbles:false}));assert.deepEqual(heard,[true],'a repaint is not a change');
 snapshot={enabled:false};for(const listener of listeners)listener();
 assert.deepEqual(heard,[true,false]);assert.equal(page.document.getElementById('book').hidden,true);
 abort.abort();snapshot={enabled:true};page.window.dispatchEvent(new Event('booking:visibility',{bubbles:false}));assert.deepEqual(heard,[true,false],'a stopped listener hears nothing');
 assert.equal(page.document.getElementById('book').hidden,false);
 booking.dispose();assert.equal(listeners.size,0);
});

test('the booking screens are mounted only while booking is admitted; otherwise the page shows its panel',async()=>{
 assert.equal(unavailableState({error:true,checking:true}),'error');assert.equal(unavailableState({checking:true}),'checking');assert.equal(unavailableState(),'unavailable');
 const page=createPage({body:'<div id="clinic-booking-root"></div>'}),node=page.document.getElementById('clinic-booking-root');
 let snapshot={enabled:false,verified:false,checking:true},listeners=new Set(),refreshed=0,mounted=[],cleaned=0,fail=false;
 const state={getSnapshot:()=>snapshot,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},refresh:()=>{refreshed++;return Promise.resolve();}};
 const change=next=>{snapshot=next;for(const listener of [...listeners])listener();};
 const admitted=value=>value.enabled&&value.verified&&!value.checking,display=value=>value.enabled;
 const load=()=>fail?Promise.reject(new Error('offline')):Promise.resolve({mountBooking:(target,options)=>{mounted.push(['booking',options.draft.doctor]);target.innerHTML='<form></form>';return()=>cleaned++;},mountBookingDetails:()=>{mounted.push(['details']);}});
 const island=createIsland({state,admissionAllowed:admitted,displayAllowed:display,draft:{doctor:'parul'},load});
 const abort=new AbortController();
 island.open(node,{kind:'booking',signal:abort.signal});
 assert.match(node.innerHTML,/data-booking-unavailable data-state="checking"/);assert.equal(node.querySelector('[data-booking-retry]').disabled,true);
 assert.equal(node.querySelectorAll('[data-call-row]').length,1,'only the chosen doctor\'s number');
 change({enabled:false,verified:true,checking:false});
 assert.match(node.innerHTML,/data-state="unavailable"/);node.querySelector('[data-booking-retry]').onclick();assert.equal(refreshed,1);
 change({enabled:true,verified:true,checking:false});
 assert.match(node.innerHTML,/Opening appointment booking/);assert.deepEqual(island.status(),{open:true,mounted:false,pending:true});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(mounted,[['booking','parul']]);assert.deepEqual(island.status(),{open:true,mounted:true,pending:false});
 abort.abort();assert.equal(cleaned,1);assert.deepEqual(island.status(),{open:false,mounted:false,pending:false});
 // loading fails: the panel says so and offers to try again
 fail=true;const second=new AbortController();island.open(node,{kind:'details',signal:second.signal});await new Promise(resolve=>setImmediate(resolve));
 assert.match(node.innerHTML,/data-state="error"/);
 fail=false;node.querySelector('[data-booking-retry]').onclick();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(mounted.at(-1),['details']);
 // booking is withdrawn while the screens are loading: nothing is mounted
 const third=new AbortController();island.open(node,{kind:'booking',signal:third.signal});snapshot={enabled:false,verified:true,checking:false};await new Promise(resolve=>setImmediate(resolve));
 assert.match(node.innerHTML,/data-state="unavailable"/);assert.equal(mounted.length,2);
 island.dispose();assert.equal(listeners.size,0);island.ensure();
});

test('a page is swapped inside the app, bound, and the page before it is stopped',()=>{
 const html=renderPublicDocument({path:'/',mode:'on',booking:false,html:shell}).replace(/<script\b[\s\S]*?<\/script>/g,'');
 const page=createPage({html:html.replace(/^<!doctype html>\s*<html[^>]*>/,'').replace(/<\/html>\s*$/,'')});
 const restore=installGlobals(page);let view=null;
 try{
  const app=page.document.querySelector('#app'),bound=[],prepared=[];
  let enabled=true;
  const booking={enabled:()=>enabled,subscribe(){},sync(){}};
  const motion=createMotion({documentObject:page.document,windowObject:page.window});
  const sheets=createSheets({documentObject:page.document});
  const services={reader:sheets.reader,menu:sheets.menu,viewer:sheets.viewer,call:sheets.call,motion,booking,navigate(){},announce(){}};
  view=createView({app,services,parts:[...partBehaviours,(root,context)=>bound.push(context.ctx.path)],booking,applyMetadata:path=>{page.document.title=path;},prepare:ctx=>{prepared.push(ctx.mode);sheets.refresh(ctx);},now:()=>TEST_NOW,windowObject:page.window});
  const before=app.innerHTML.length,first=view.show('/',{first:true});
  assert.equal(first.reused,true);assert.equal(app.innerHTML.length>before*0.9,true,'the printed page is bound as it is, never drawn twice');
  assert.equal(first.heading.getAttribute('tabindex'),'-1');assert.equal(page.document.title,'/');assert.deepEqual(prepared,['on']);
  assert.equal(page.document.querySelector('#menu-links').querySelectorAll('.menu__link').length,5);assert.ok(page.document.querySelector('#call-sheet-content [data-call-row="parul"]'));
  assert.equal(page.document.querySelectorAll('[data-unbound-control]').length,0);
  enabled=false;page.scroll(900);
  const second=view.show('/dr-parul-gupta',{search:'?a=1'});
  assert.equal(first.signal.aborted,true);assert.equal(second.reused,false);assert.equal(second.ctx.mode,'off');assert.equal(second.ctx.search,'?a=1');
  assert.equal(app.getAttribute('data-rendered-path'),'/dr-parul-gupta');assert.equal(app.getAttribute('data-display-mode'),'off');assert.equal(page.window.scrollY,0);
  assert.equal(app.querySelectorAll('h1').length,1);assert.equal(app.querySelectorAll('main').length,1);assert.equal(app.querySelectorAll('a[href^="/booking"]').length,0);
  assert.deepEqual(bound,['/','/dr-parul-gupta']);assert.equal(view.current(),second);assert.equal(view.generation(),2);
  const third=view.show('/treatment',{scroll:420});assert.equal(page.window.scrollY,420);assert.equal(third.main.getAttribute('data-page'),'treatments');
  view.stop();assert.equal(third.signal.aborted,true);motion.dispose();
 }finally{view?.stop();restore();}
});

test('pictures that fail leave their frame; locked controls are released except inside the message form',()=>{
 const page=createPage({body:'<img id="a" src="/x.webp"><form data-contact-form><input id="kept" disabled data-unbound-control></form><input id="freed" disabled data-unbound-control>'});
 watchPictures(page.document.body,{});page.document.getElementById('a').dispatchEvent(new Event('error',{bubbles:false}));
 assert.ok(page.document.getElementById('a').classList.contains('media-failed'));
 releaseControls(page.document.body);
 assert.equal(page.document.getElementById('freed').disabled,false);assert.equal(page.document.getElementById('kept').disabled,true);
 assert.equal(typeof bindClock,'function');assert.ok(Object.isFrozen(partBehaviours)&&partBehaviours.length>=10);
});

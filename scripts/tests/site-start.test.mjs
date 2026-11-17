import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {start,boot as bootSite} from '../../src/site/runtime/start.mjs';
import {MOTION_KEY} from '../../src/site/motion/motion.mjs';
import {preferenceKey} from '../../src/clinic/visitor-preferences.mjs';
import {renderPublicDocument} from '../../src/clinic/public-document.mjs';
import {createPage,installGlobals,Event} from './support/mini-dom.mjs';

const shell=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const inner=html=>html.replace(/<script\b[\s\S]*?<\/script>/g,'').replace(/^<!doctype html>\s*<html[^>]*>/,'').replace(/<\/html>\s*$/,'');
/** A booking state the test moves by hand, shaped like the booking package's own controller. */
function fakeState(initial){
 let snapshot=initial;const listeners=new Set(),calls={refresh:0,profile:[]};
 return {calls,getSnapshot:()=>snapshot,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
  refresh(){calls.refresh++;return Promise.resolve(snapshot);},setProfile(value){calls.profile.push(value);},start:()=>()=>{},
  set(next){snapshot=next;for(const listener of [...listeners])listener();}};
}
const admitted={enabled:true,verified:true,checking:false},closed={enabled:false,verified:true,checking:false};
const wait=()=>new Promise(resolve=>setImmediate(resolve));

function boot({path='/',mode='on',state=fakeState(mode==='on'?admitted:closed),document:printed=true,prepare=()=>{},begin=start}={}){
 const html=printed?renderPublicDocument({path:'/',mode,booking:false,html:shell}):shell;
 const page=createPage({url:'https://clinic.test'+path,html:inner(html),attributes:{lang:'en','data-booking-state':mode}});
 const restore=installGlobals(page);
 globalThis.MutationObserver=class{observe(){}disconnect(){}};
 prepare(page);
 const app=begin({windowObject:page.window,documentObject:page.document,state});
 return {page,app,state,$:selector=>page.document.querySelector(selector),end(){app?.dispose();restore();delete globalThis.MutationObserver;}};
}
/** A browser that refuses site storage: merely reading the property throws (Chrome with "block all cookies"). */
function refuseStorage(page){
 for(const name of ['localStorage','sessionStorage'])Object.defineProperty(page.window,name,{configurable:true,get(){throw new Error('Access is denied for this document.');}});
}
/** How many listeners the test page still holds, per event name. */
const listening=target=>[...target.listeners].filter(([,list])=>list.length).map(([type])=>type).sort();
const follow=(page,anchor,more)=>{const event=new Event('click',more);anchor.dispatchEvent(event);return event;};

test('the site starts on the printed page, then moves between pages without a new page request',async()=>{
 const {page,app,state,$,end}=boot();
 try{
  assert.equal(page.document.documentElement.getAttribute('data-booking-state'),'on');assert.equal(page.document.documentElement.getAttribute('data-motion'),'on');
  assert.equal($('#app').getAttribute('data-rendered-path'),'/');assert.ok($('#announce'));assert.equal(page.window.history.scrollRestoration,'manual');
  assert.equal(page.document.title,'Physician & Women\'s Health in Lucknow | R. K. Medical Centre');assert.deepEqual(state.calls.profile,['public']);
  assert.equal($('#menu-links').querySelectorAll('.menu__link').length,5);
  const event=follow(page,$('.site-header__link[href="/treatment"]'));
  assert.ok(event.defaultPrevented);assert.equal(page.window.location.pathname,'/treatment');assert.equal(app.route(),'/treatment');
  assert.equal($('#app').getAttribute('data-rendered-path'),'/treatment');assert.match(page.document.title,/^Treatments/);assert.equal($('#app').querySelectorAll('h1').length,1);
  page.frames(1);assert.equal(page.document.activeElement,$('main h1'),'focus moves to the new page\'s heading');assert.equal(page.window.scrollY,0);
  assert.equal($('.site-header__link[href="/treatment"]').getAttribute('aria-current'),'page');
  page.scroll(700);follow(page,$('.site-footer__link[href="/meet-doctor"]'));assert.equal(app.route(),'/meet-doctor');
  page.window.history.back();page.frames(2);
  assert.equal(app.route(),'/treatment');assert.equal(page.window.scrollY,700,'the place on the earlier page is kept');assert.match($('#announce').textContent,/^Treatments/);
  // a place on the page: scroll and focus, no page change
  $('main').innerHTML+='<a id="jump" href="#closing">jump</a>';
  const jump=follow(page,$('#jump'));assert.ok(jump.defaultPrevented);assert.equal(page.window.scrolledTo,$('#closing'));assert.equal(page.document.activeElement,$('#closing'));assert.equal($('#closing').getAttribute('tabindex'),'-1');
  // links the browser keeps: another site, a new tab, a call
  $('main').innerHTML+='<a id="out" href="https://maps.app.goo.gl/x">map</a><a id="tel" href="tel:+919415049410">call</a><span id="plain">text</span>';
  for(const id of ['out','tel'])assert.equal(follow(page,$('#'+id)).defaultPrevented,false);assert.equal(follow(page,$('#plain')).defaultPrevented,false);assert.equal(follow(page,$('.site-footer__link[href="/contact"]'),{ctrlKey:true}).defaultPrevented,false);
  // a link to a place on another page arrives at that place
  assert.equal(app.navigate('/#doctors'),true);page.frames(1);assert.equal(app.route(),'/');assert.equal(page.window.scrolledTo,$('#doctors'));
  assert.equal(app.navigate('/studio'),false,'an address that is not a page of the site is not drawn');
  app.navigate('/about-clinic',{replace:true});assert.equal(page.window.location.pathname,'/about-clinic');
  page.window.dispatchEvent(new Event('pageshow',{bubbles:false,persisted:true}));page.frames(1);assert.equal(app.route(),'/about-clinic');
  page.window.dispatchEvent(new Event('pageshow',{bubbles:false,persisted:false}));page.window.dispatchEvent(new Event('pagehide',{bubbles:false}));
  app.services.announce('Saved');page.frames(1);assert.equal($('#announce').textContent,'Saved');
 }finally{end();}
});

test('a booking link opens the booking screen only when booking is admitted right now; otherwise Contact',async()=>{
 const on=boot();
 try{
  follow(on.page,on.$('.site-footer__link[href="/booking"]'));await wait();
  assert.equal(on.state.calls.refresh,1,'the state is read again before booking opens');assert.equal(on.app.route(),'/booking');assert.deepEqual(on.state.calls.profile.slice(-1),['active']);
  assert.ok(on.$('.site-header--slim')&&on.$('#clinic-booking-root')&&!on.$('[data-action-bar]'));
  on.state.set(closed);assert.match(on.$('#clinic-booking-root').innerHTML,/data-booking-unavailable/);
 }finally{on.end();}
 const off=boot({mode:'off'});
 try{
  assert.equal(off.$('[data-header-appointment]').getAttribute('href'),'/contact');assert.equal(off.$('#app').querySelectorAll('a[href^="/booking"]').length,0);
  const pending=off.app.enterBooking('/booking?doctor=parul');off.app.navigate('/treatment');await pending;
  assert.equal(off.app.route(),'/treatment','a newer page change wins over a booking check still on its way');
 }finally{off.end();}
});

test('the older booking address is corrected; an unknown one shows Home; the bare shell is drawn in the browser',()=>{
 const help=boot({path:'/booking-help',document:false});
 try{assert.equal(help.page.window.location.pathname,'/booking-details');assert.equal(help.app.route(),'/booking-details');assert.ok(help.$('#clinic-booking-root'));assert.equal(help.$('#app').querySelectorAll('h1').length,1);}finally{help.end();}
 const lost=boot({path:'/nowhere',mode:'off',document:false});
 try{assert.equal(lost.app.route(),'/');assert.equal(lost.page.window.location.pathname,'/nowhere');assert.ok(lost.$('.page-home__hero'));assert.equal(lost.$('#app').getAttribute('data-display-mode'),'off');}finally{lost.end();}
});

test('a browser that refuses site storage gets the whole site; choices hold while the page stays open',()=>{
 const {page,app,$,end}=boot({prepare:refuseStorage});
 try{
  assert.throws(()=>page.window.localStorage,/denied/,'the test browser really refuses storage');
  assert.equal(page.document.documentElement.getAttribute('data-motion'),'on');assert.ok($('#announce'),'start-up ran to its end');
  assert.equal(app.route(),'/');assert.equal($('#menu-links').querySelectorAll('.menu__link').length,5,'the dialogs are drawn');
  // every control is bound: the motion control works and its choice is kept for this visit
  const toggle=$('[data-motion-toggle]');assert.equal(toggle.getAttribute('aria-pressed'),'false');
  toggle.click();assert.equal(page.document.documentElement.getAttribute('data-motion'),'paused');assert.equal(toggle.getAttribute('aria-pressed'),'true');
  assert.equal(app.services.motion.state(),'paused');
  follow(page,$('.site-header__link[href="/treatment"]'));assert.equal(app.route(),'/treatment');
  assert.equal(app.services.motion.state(),'paused','the choice is still held on the next page');assert.equal($('[data-motion-toggle]').getAttribute('aria-pressed'),'true');
  // another tab cannot change it (there is no shared store), and the event does not throw
  page.window.dispatchEvent(new Event('storage',{bubbles:false,key:MOTION_KEY}));assert.equal(app.services.motion.state(),'paused');
  // the privacy choice cannot be kept, and says so without throwing
  assert.equal(app.services.privacy.choose(false),null);
  $('[data-collection-notice]').click();assert.ok($('#reader').open,'the notice opens');$('#reader [data-close]').click();assert.ok(!$('#reader').open);
 }finally{end();}
});

test('where storage works, the choices are kept on the device',()=>{
 const {page,app,$,end}=boot();
 try{
  $('[data-motion-toggle]').click();assert.equal(page.window.localStorage.getItem(MOTION_KEY),'paused');
  const record=app.services.privacy.choose(false);assert.equal(record.measurement,false);assert.equal(JSON.parse(page.window.localStorage.getItem(preferenceKey)).measurement,false);
 }finally{end();}
});

test('a start-up that fails leaves the page exactly as it is without scripts, with nothing half bound',()=>{
 // the shell marked the document before the first paint, as the built page does
 const mark=page=>{page.document.documentElement.setAttribute('data-js','');page.document.documentElement.setAttribute('data-motion','on');};
 const reported=[];
 // 1. start-up throws midway (here: the page cannot be drawn because the history refuses)
 const broken=boot({prepare(page){mark(page);page.window.reportError=error=>reported.push(error);page.window.history.replaceState=()=>{throw new Error('history refused');};},begin:options=>bootSite(options)});
 try{
  assert.equal(broken.app,null,'boot reports the failure instead of throwing');assert.equal(reported.length,1);assert.match(reported[0].message,/history refused/);
  const root=broken.page.document.documentElement;
  assert.equal(root.hasAttribute('data-js'),false,'the scripts-off rules apply again');assert.equal(root.hasAttribute('data-motion'),false,'nothing is left moved or moving');
  assert.equal(broken.$('#announce'),null,'what start-up had added is removed');
  assert.deepEqual(listening(broken.page.window),[],'no listener of the site is left on the window');assert.deepEqual(listening(broken.page.document),[],'nor on the document: links are ordinary links again');
 }finally{broken.end();}
 // 2. no reportError in this browser: the console hears it; and a browser with neither stays quiet
 const said=[];
 const older=boot({prepare(page){mark(page);page.window.console={error:error=>said.push(error)};},begin:options=>bootSite({...options,begin(){throw new Error('could not start');}})});
 try{assert.equal(older.app,null);assert.equal(said.length,1);assert.equal(older.page.document.documentElement.hasAttribute('data-js'),false);}finally{older.end();}
 const silent=boot({prepare:mark,begin:options=>bootSite({...options,begin(){throw new Error('could not start');}})});
 try{assert.equal(silent.app,null);assert.equal(silent.page.document.documentElement.hasAttribute('data-motion'),false);}finally{silent.end();}
 // 3. a start that succeeds keeps the marks (and sets the scripts-on mark if the shell could not)
 const fine=boot({begin:options=>bootSite(options)});
 try{assert.ok(fine.app);assert.equal(fine.page.document.documentElement.hasAttribute('data-js'),true);assert.equal(fine.page.document.documentElement.getAttribute('data-motion'),'on');assert.equal(fine.app.route(),'/');}finally{fine.end();}
});

test('taking the site down stops everything it started, even if one part refuses to stop',()=>{
 const {page,app,$,end}=boot();
 try{
  assert.ok(listening(page.window).includes('popstate'));assert.ok(listening(page.document).includes('click'));
  // the announcer refuses to be removed: everything else must still be stopped
  $('#announce').remove=()=>{throw new Error('will not go');};
 }finally{end();}
 assert.deepEqual(listening(page.window),[]);assert.deepEqual(listening(page.document),[]);
 app.dispose();
});

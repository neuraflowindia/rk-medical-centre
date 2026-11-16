import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {start} from '../../src/site/runtime/start.mjs';
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

function boot({path='/',mode='on',state=fakeState(mode==='on'?admitted:closed),document:printed=true}={}){
 const html=printed?renderPublicDocument({path:'/',mode,booking:false,html:shell}):shell;
 const page=createPage({url:'https://clinic.test'+path,html:inner(html),attributes:{lang:'en','data-booking-state':mode}});
 const restore=installGlobals(page);
 globalThis.MutationObserver=class{observe(){}disconnect(){}};
 const app=start({windowObject:page.window,documentObject:page.document,state});
 return {page,app,state,$:selector=>page.document.querySelector(selector),end(){app.dispose();restore();delete globalThis.MutationObserver;}};
}
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

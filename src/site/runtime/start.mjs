// Boot. Runs once per page load: follow the booking state, bind the dialogs, start motion,
// then show the page for the address and keep showing pages as the visitor moves, without a
// new page request (each request on this host waits for a booking-state read).
//
// Two promises this file keeps:
//  1. Browser storage can never stop the site. Preferences go through `safeStorage`, which never
//     throws; where the browser refuses storage, a choice holds while the page stays open and is
//     simply not remembered afterwards.
//  2. A page is never left half alive. The shell marks the document as "scripts on" before the
//     first paint; if start-up fails for any reason, `boot` undoes whatever had begun and takes
//     that mark back, so the visitor gets exactly the page shown without scripts: every fallback
//     in place, ordinary links, no dead control.
import {bindVisibility} from '../../../appointment-system/browser/visibility.mjs';
import {productState,admissionAllowed,displayAllowed} from '../../clinic/product-state.mjs';
import {applyPageMetadata} from '../../clinic/page-metadata.mjs';
import {createDraft,applyBookingQuery} from '../../clinic/visit-draft.mjs';
import {savePreference} from '../../clinic/visitor-preferences.mjs';
import {createMotion} from '../motion/motion.mjs';
import {safeStorage} from '../lib/storage.mjs';
import {knownPaths,pageFor} from './registry.mjs';
import {resolveAddress,linkAction,createScrollMemory} from './router.mjs';
import {createView} from './render.mjs';
import {bindBookingState} from './booking-state.mjs';
import {createIsland} from './booking-island.mjs';
import {createSheets} from '../parts/sheet/sheet.behaviour.mjs';
import {partBehaviours} from './parts.mjs';

/** Stop everything in `stops`, newest first; one that fails never keeps the others running. */
function stopAll(stops){
 for(const stop of stops.splice(0).reverse()){try{stop();}catch{/* keep stopping the rest */}}
}

/**
 * Start the site. Everything from the browser can be replaced in tests. If anything fails on the
 * way, whatever had already begun is stopped again and the error is thrown on (see `boot`).
 */
export function start(options={}){
 const stops=[];
 try{return begin(options,stops);}
 catch(error){stopAll(stops);throw error;}
}

function begin({windowObject=window,documentObject=document,state=productState},stops){
 const {history,location}=windowObject,life=new AbortController(),forLife={signal:life.signal};
 stops.push(()=>life.abort());
 stops.push(bindVisibility({state,windowObject,documentObject,profile:'public'}));

 const first=resolveAddress(location.pathname,knownPaths);
 if(first.found&&first.rewrite)history.replaceState(history.state,'',first.path+location.search+location.hash);

 const announcer=documentObject.createElement('div');
 announcer.id='announce';announcer.className='visually-hidden';announcer.setAttribute('aria-live','polite');announcer.setAttribute('role','status');
 documentObject.body.append(announcer);
 stops.push(()=>announcer.remove());
 const announce=words=>{announcer.textContent='';windowObject.requestAnimationFrame(()=>{announcer.textContent=String(words);});};

 const app=documentObject.querySelector('#app'),draft=createDraft(),scrolls=createScrollMemory();
 // The one store for what the visitor chooses on this device (motion, privacy). It never throws.
 const storage=safeStorage(()=>windowObject.localStorage);
 const motion=createMotion({documentObject,windowObject,storage});
 stops.push(()=>motion.dispose());
 let route=first.path,intent=0;
 const booking=bindBookingState({state,displayAllowed,windowObject,documentObject,route:()=>route});
 stops.push(()=>booking.dispose());
 const island=createIsland({state,admissionAllowed,displayAllowed,draft});
 stops.push(()=>island.dispose());
 const sheets=createSheets({documentObject});
 // Visit measurement is not in use; the visitor's choice is still kept, as it always was.
 const privacy=Object.freeze({choose:value=>savePreference(storage,value)});

 const services={reader:sheets.reader,menu:sheets.menu,viewer:sheets.viewer,call:sheets.call,
  navigate,productState:state,booking,motion,announce,draft,privacy};
 const view=createView({app,services,parts:partBehaviours,booking,applyMetadata:path=>applyPageMetadata(path,documentObject),
  prepare:ctx=>sheets.refresh(ctx),windowObject});
 stops.push(()=>view.stop());

 history.scrollRestoration='manual';
 history.replaceState({...history.state,key:scrolls.next()},'');
 // The history entry now on screen: its scroll position is kept whenever the visitor leaves it,
 // by a link or by Back and Forward, so either way of returning lands where the page was left.
 let entryKey=history.state?.key;

 function show({focus=false,restore=null,hash='',firstLoad=false}={}){
  const resolved=resolveAddress(location.pathname,knownPaths);
  route=resolved.path;
  sheets.closeAll('navigate');
  const page=pageFor(route);
  state.setProfile(page.island?'active':'public');
  if(route==='/booking')applyBookingQuery(draft,location.search);
  const shown=view.show(route,{first:firstLoad,search:location.search,scroll:restore??0});
  booking.sync();
  if(page.island){const node=documentObject.querySelector('#clinic-booking-root');if(node)island.open(node,{kind:page.island,signal:shown.signal});}
  motion.observe(app,{signal:shown.signal});
  const turn=shown.generation;
  windowObject.requestAnimationFrame(()=>{
   if(turn!==view.generation())return;
   if(restore!==null){windowObject.scrollTo(0,restore);if(!firstLoad)announce(documentObject.title);return;}
   const target=hash?placeFor(hash):null;
   if(target){target.scrollIntoView({behavior:'instant',block:'start'});focusPlace(target);}
   else if(focus){windowObject.scrollTo(0,0);shown.heading?.focus({preventScroll:true});}
  });
 }

 function placeFor(hash){
  if(!hash||hash.length<2)return null;
  try{return documentObject.getElementById(decodeURIComponent(hash.slice(1)));}catch{return null;}
 }
 function focusPlace(target){
  if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
  target.focus({preventScroll:true});
 }
 function goToPlace(hash,{push=false}={}){
  const target=placeFor(hash);
  if(!target)return false;
  if(push){scrolls.save(entryKey,windowObject.scrollY);history.pushState({key:scrolls.next()},'',location.pathname+location.search+hash);entryKey=history.state?.key;}
  target.scrollIntoView({behavior:motion.allowed()?'smooth':'instant',block:'start'});
  focusPlace(target);
  return true;
 }

 /** Show another page of the site. `path` may carry a query and a #place. */
 function navigate(path,{replace=false}={}){
  intent++;
  const url=new URL(path,location.origin);
  const resolved=resolveAddress(url.pathname,knownPaths);
  if(!resolved.found)return false;
  scrolls.save(entryKey,windowObject.scrollY);
  const address=resolved.path+url.search+url.hash,entry={key:scrolls.next()};
  if(replace)history.replaceState(entry,'',address);else history.pushState(entry,'',address);
  entryKey=entry.key;
  show({focus:true,hash:url.hash});
  return true;
 }

 /** A booking screen opens only when booking is admitted right now; otherwise Contact. */
 async function enterBooking(path){
  const mine=++intent,turn=view.generation();
  await state.refresh({force:true});
  if(mine!==intent||turn!==view.generation())return;
  navigate(admissionAllowed(state.getSnapshot())?path:'/contact');
 }
 services.enterBooking=enterBooking;
 Object.freeze(services);

 documentObject.addEventListener('click',event=>{
  const anchor=event.target instanceof windowObject.Element?event.target.closest('a'):null;
  if(!anchor||!anchor.hasAttribute('href'))return;
  const action=linkAction(event,{href:anchor.href,raw:anchor.getAttribute('href'),target:anchor.target,download:anchor.hasAttribute('download')},
   {origin:location.origin,pathname:location.pathname},knownPaths);
  if(action.kind==='leave')return;
  event.preventDefault();
  if(action.kind==='place'){sheets.closeAll('navigate');goToPlace(action.hash,{push:!!action.push});}
  else if(action.kind==='booking')void enterBooking(action.path);
  else navigate(action.path+(action.hash||''));
 },forLife);

 windowObject.addEventListener('popstate',()=>{
  intent++;
  // the page being left is still on screen: remember where it stood before the other is shown
  scrolls.save(entryKey,windowObject.scrollY);entryKey=history.state?.key;
  // A part of the page that keeps its own history entries (the booking steps) may handle the move
  // itself: it listens for `site:history` on the window and prevents it. Then nothing is drawn again.
  if(!windowObject.dispatchEvent(new windowObject.CustomEvent('site:history',{cancelable:true})))return;
  show({restore:scrolls.read(entryKey)});
 },forLife);
 windowObject.addEventListener('pagehide',()=>{island.close();},forLife);
 // A page brought back from the browser's back/forward store is bound again where it stood.
 windowObject.addEventListener('pageshow',event=>{if(event.persisted)show({restore:windowObject.scrollY});},forLife);

 show({firstLoad:true,hash:location.hash});
 return Object.freeze({navigate,enterBooking,services,view,route:()=>route,
  /** Stop everything this start began (used when the app is taken down, and by tests). */
  dispose(){stopAll(stops);}});
}

/**
 * Start the site in the browser and never leave the page half alive: when start-up fails, the
 * document goes back to its scripts-off state (the marks the shell set before the first paint
 * are removed) and the failure is reported, not thrown. Returns the running site, or null.
 */
export function boot({windowObject=window,documentObject=document,begin:run=start,...rest}={}){
 const root=documentObject.documentElement;
 try{
  const site=run({windowObject,documentObject,...rest});
  if(!root.hasAttribute('data-js'))root.setAttribute('data-js','');
  return site;
 }catch(error){
  root.removeAttribute('data-js');root.removeAttribute('data-motion');
  if(typeof windowObject.reportError==='function')windowObject.reportError(error);
  else windowObject.console?.error?.(error);
  return null;
 }
}

if(typeof window!=='undefined'&&typeof document!=='undefined'&&document.querySelector('#app'))boot();

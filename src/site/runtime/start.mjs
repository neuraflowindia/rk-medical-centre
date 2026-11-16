// Boot. Runs once per page load: follow the booking state, bind the dialogs, start motion,
// then show the page for the address and keep showing pages as the visitor moves, without a
// new page request (each request on this host waits for a booking-state read).
import {bindVisibility} from '../../../appointment-system/browser/visibility.mjs';
import {productState,admissionAllowed,displayAllowed} from '../../clinic/product-state.mjs';
import {applyPageMetadata} from '../../clinic/page-metadata.mjs';
import {createDraft,applyBookingQuery} from '../../clinic/visit-draft.mjs';
import {savePreference} from '../../clinic/visitor-preferences.mjs';
import {createMotion} from '../motion/motion.mjs';
import {knownPaths,pageFor} from './registry.mjs';
import {resolveAddress,linkAction,createScrollMemory} from './router.mjs';
import {createView} from './render.mjs';
import {bindBookingState} from './booking-state.mjs';
import {createIsland} from './booking-island.mjs';
import {createSheets} from '../parts/sheet/sheet.behaviour.mjs';
import {partBehaviours} from './parts.mjs';

export function start({windowObject=window,documentObject=document,state=productState}={}){
 const {history,location}=windowObject,life=new AbortController(),forLife={signal:life.signal};
 const stopVisibility=bindVisibility({state,windowObject,documentObject,profile:'public'});

 const first=resolveAddress(location.pathname,knownPaths);
 if(first.found&&first.rewrite)history.replaceState(history.state,'',first.path+location.search+location.hash);

 const announcer=documentObject.createElement('div');
 announcer.id='announce';announcer.className='visually-hidden';announcer.setAttribute('aria-live','polite');announcer.setAttribute('role','status');
 documentObject.body.append(announcer);
 const announce=words=>{announcer.textContent='';windowObject.requestAnimationFrame(()=>{announcer.textContent=String(words);});};

 const app=documentObject.querySelector('#app'),draft=createDraft(),scrolls=createScrollMemory();
 const motion=createMotion({documentObject,windowObject});
 let route=first.path,intent=0;
 const booking=bindBookingState({state,displayAllowed,windowObject,documentObject,route:()=>route});
 const island=createIsland({state,admissionAllowed,displayAllowed,draft});
 const sheets=createSheets({documentObject});
 // Visit measurement is not in use; the visitor's choice is still kept, as it always was.
 const privacy=Object.freeze({choose:value=>savePreference(windowObject.localStorage,value)});

 const services={reader:sheets.reader,menu:sheets.menu,viewer:sheets.viewer,call:sheets.call,
  navigate,productState:state,booking,motion,announce,draft,privacy};
 const view=createView({app,services,parts:partBehaviours,booking,applyMetadata:path=>applyPageMetadata(path,documentObject),
  prepare:ctx=>sheets.refresh(ctx),windowObject});

 history.scrollRestoration='manual';
 history.replaceState({...history.state,key:scrolls.next()},'');

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
  if(push)history.pushState({key:scrolls.next()},'',location.pathname+location.search+hash);
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
  scrolls.save(history.state?.key,windowObject.scrollY);
  const address=resolved.path+url.search+url.hash,entry={key:scrolls.next()};
  if(replace)history.replaceState(entry,'',address);else history.pushState(entry,'',address);
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

 windowObject.addEventListener('popstate',()=>{intent++;show({restore:scrolls.read(history.state?.key)});},forLife);
 windowObject.addEventListener('pagehide',()=>{island.close();},forLife);
 // A page brought back from the browser's back/forward store is bound again where it stood.
 windowObject.addEventListener('pageshow',event=>{if(event.persisted)show({restore:windowObject.scrollY});},forLife);

 show({firstLoad:true,hash:location.hash});
 return Object.freeze({navigate,enterBooking,services,view,route:()=>route,
  /** Stop everything this start began (used when the app is taken down, and by tests). */
  dispose(){life.abort();view.stop();island.dispose();booking.dispose();motion.dispose();stopVisibility();announcer.remove();}});
}

if(typeof window!=='undefined'&&typeof document!=='undefined'&&document.querySelector('#app'))start();

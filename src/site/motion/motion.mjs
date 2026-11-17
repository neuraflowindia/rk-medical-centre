// Motion for the whole site, in one small module.
//
//  Entrances   `data-enter` on a part (words, "card", "photo", "rule" or "count"). A part follows
//              the scroll: it starts to settle when its top crosses 85% of the screen and is at
//              rest when it reaches 45%, so nothing is finished before it comes to the middle. It
//              runs once and never goes back; words move and never fade. Anything already on screen
//              when a page opens is simply in place. `data-enter-after="0.12"` starts a part a
//              little later than a neighbour beside it.
//                (plain)  words rise 16 px
//                card     a card or an object rises 28 px
//                photo    a photograph's frame rises, grows the last few per cent and unrolls downward
//                rule     a hairline draws from the left
//                count    a whole number counts up once, in about a second, as it arrives
//                         (the element holds the number alone: <span data-enter="count">30</span>)
//  Ambient     `data-ambient` on a slowly moving layer. A loop runs only while it is on screen,
//              the tab is visible and motion is allowed; at most two run at once, one on phones.
//                (plain)  a light: the page's own keyframes, played while `data-running` is set
//                float    a paper-cut object drifts ±6 px and ±1.5° (motion.css draws it); give two
//                         objects in one view different beats with style="--float-phase:-2s"
//                minor    a small pulse (the open dot)
//              When more want to run than a view allows, a light outranks a float, a float a pulse.
//  Preference  "Pause motion" in the footer. The choice is kept on the device under `rk-motion`.
//              The device's reduced-motion setting counts as paused until the visitor chooses to play.
//
// The script only ever writes one number per part (`--p`, 0 to 1), or a counting number's digits;
// motion.css turns `--p` into movement, and only under html[data-motion="on"]. A page without
// scripts is simply still.

import {safeStorage} from '../lib/storage.mjs';

export const MOTION_KEY='rk-motion';
/** A part starts when its top crosses this share of the screen height … */
export const ENTER_START=.85;
/** … and is at rest when its top reaches this share. */
export const ENTER_END=.45;
/** How closely the movement follows the scroll: the time, in ms, to close about two thirds of a gap. */
export const FOLLOW_MS=170;
/** How many ambient loops may run at once. */
export const LOOP_LIMIT=Object.freeze({phone:1,wide:2});
/** Phones are narrower than this. */
export const WIDE_FROM=768;
/** Which loop keeps its place when a view holds more than may run: a light, then a floating object, then a small pulse. */
export const LOOP_WEIGHT=Object.freeze({light:2,float:1.5,minor:1});
/** The weight of a loop from its `data-ambient` value ("" or anything unknown is a light). */
export function loopWeight(kind){return kind==='minor'?LOOP_WEIGHT.minor:kind==='float'?LOOP_WEIGHT.float:LOOP_WEIGHT.light;}
/** A number that counts up as it arrives takes this long, in ms … */
export const COUNT_MS=1100;
/** … and starts once this share of its own height has come into view from the foot of the screen. */
export const COUNT_SHOWN=.6;
/**
 * The number shown `elapsed` ms into a count up to `to` (pure): whole numbers, quick at first and
 * slower towards the end, never past `to`.
 */
export function countValue(to,elapsed,duration=COUNT_MS){
 if(!(duration>0)||elapsed>=duration)return to;
 const t=Math.max(0,elapsed)/duration;
 return Math.min(to,Math.round(to*(1-Math.pow(1-t,3))));
}
/** The whole number an element holds, or null when it holds anything else (then it does not count). */
export function countTarget(element){
 const words=String(element?.textContent??'').trim();
 return /^\d{1,6}$/.test(words)?Number(words):null;
}

/** The stored choice: 'paused', 'on', or null when the visitor has not chosen (or storage is closed). */
export function readPreference(storage){
 try{const value=storage?.getItem(MOTION_KEY);return value==='paused'||value==='on'?value:null;}catch{return null;}
}
/** Keep the choice on this device. Returns false when the browser could not keep it. */
export function writePreference(storage,value){
 if(value!=='paused'&&value!=='on')throw new RangeError('Motion is "on" or "paused"');
 try{return storage.setItem(MOTION_KEY,value)!==false;}catch{return false;}
}
/** The motion state from the stored choice and the device setting: a choice always wins. */
export function motionState(stored,reduced){
 if(stored==='paused'||stored==='on')return stored;
 return reduced?'paused':'on';
}
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
/** A soft landing: fast at first, slower at the end. */
export function soften(t){return 1-Math.pow(1-clamp(t,0,1),1.6);}
/**
 * Where on the page's scroll a part begins and how far the scroll must travel for it to come
 * to rest. `top` is the part's distance from the top of the page. A part too near the page's
 * end to reach the rest line still comes to rest by the time the page can scroll no further.
 */
export function partRange({top,viewport,maxScroll}){
 let end=top-viewport*ENTER_END,start=top-viewport*ENTER_START;
 if(end>maxScroll){end=maxScroll;start=Math.min(start,end-viewport*.3);}
 return {start,span:Math.max(1,end-start)};
}
/** How far along a part is for a scroll position (0 to 1). `after` delays its start by that share. */
export function partProgress({y,start,span,after=0}){
 return clamp((y-start)/span*(1+after)-after,0,1);
}
/** The share of the remaining gap to close in `dt` milliseconds. */
export function followShare(dt){return 1-Math.exp(-Math.max(0,dt)/FOLLOW_MS);}
/** Is the part already on screen (or above it) at this scroll position? Then it must not animate in. */
export function alreadyOnScreen(y,start){return y>start+4;}
/**
 * Which ambient loops run now. `visible` is a list of {key, ratio, weight}: `ratio` is how much
 * of the layer is on screen (0–1) and `weight` ranks kinds of loop (a light shaft outranks a
 * small pulse). The heaviest, most visible ones win; ties keep their page order.
 */
export function chooseRunning(visible,limit){
 if(!Number.isInteger(limit)||limit<=0)return [];
 return visible.map((item,index)=>({item,index}))
  .filter(({item})=>item.ratio>0)
  .sort((a,b)=>(b.item.weight??1)-(a.item.weight??1)||b.item.ratio-a.item.ratio||a.index-b.index)
  .slice(0,limit).map(({item})=>item.key);
}
/** The loop limit for a window width. */
export function loopLimit(width){return width<WIDE_FROM?LOOP_LIMIT.phone:LOOP_LIMIT.wide;}
/** The words and icon of the footer control for a state. */
export function toggleFace(state,words){
 return state==='paused'?{label:words.play,icon:'play',pressed:true}:{label:words.pause,icon:'pause',pressed:false};
}
/** A part's distance from the top of the page, unaffected by its own movement. */
export function pageTop(element){
 // A part laid out as "contents" has no box of its own: measure its first child instead.
 let node=element.offsetParent===null&&element.firstElementChild&&!element.offsetHeight?element.firstElementChild:element,y=0;
 for(;node;node=node.offsetParent)y+=node.offsetTop||0;
 return y;
}

/**
 * Start motion for the page. Everything from the browser can be replaced in tests.
 * Returns the service the parts use: state(), allowed(), set(), toggle(), subscribe(), observe().
 * The stored choice is read through `safeStorage`, so a browser that refuses storage cannot stop
 * the site: the choice then holds while the page stays open.
 */
export function createMotion({documentObject=document,windowObject=window,storage=safeStorage(()=>windowObject.localStorage),
 Observer=windowObject.IntersectionObserver,reducedQuery=windowObject.matchMedia?.('(prefers-reduced-motion: reduce)'),
 frame=callback=>windowObject.requestAnimationFrame(callback)}={}){
 const root=documentObject.documentElement,listeners=new Set();
 let state=motionState(readPreference(storage),!!reducedQuery?.matches);
 let ambientObserver=null,parts=[],ticking=false,lastTime=0,scope=null;
 const ambient=new Map();

 const allowed=()=>state==='on';
 const visible=()=>documentObject.visibilityState!=='hidden';

 function runLoops(){
  const running=new Set(allowed()&&visible()
   ?chooseRunning([...ambient].map(([key,entry])=>({key,ratio:entry.ratio,weight:entry.weight})),loopLimit(windowObject.innerWidth))
   :[]);
  for(const key of ambient.keys()){
   if(running.has(key)){if(!key.hasAttribute('data-running'))key.setAttribute('data-running','');}
   else if(key.hasAttribute('data-running'))key.removeAttribute('data-running');
  }
 }

 // ---- entrances that follow the scroll ----
 const show=(part,value)=>{const digits=String(value);if(part.element.textContent!==digits)part.element.textContent=digits;};
 const rest=part=>{part.done=true;part.element.style.removeProperty('--p');if(part.to!==null)show(part,part.to);};
 function measure(){
  const viewport=windowObject.innerHeight,maxScroll=Math.max(0,root.scrollHeight-viewport);
  for(const part of parts){
   if(part.done)continue;
   const top=pageTop(part.element);
   // a counting number starts when most of it has come into view, so it is not seen waiting at nought
   if(part.to!==null)part.start=Math.min(top-viewport+(part.element.offsetHeight||0)*COUNT_SHOWN,maxScroll-1);
   else Object.assign(part,partRange({top,viewport,maxScroll}));
  }
 }
 function tick(time){
  const dt=Math.min(64,time-(lastTime||time-16));lastTime=time;
  const share=followShare(dt),y=windowObject.scrollY;let active=false;
  for(const part of parts){
   if(part.done)continue;
   if(part.to!==null){
    // a count runs on the clock once it has begun, so it always reaches its number
    if(part.began===null){if(y<part.start)continue;part.began=time;}
    if(time-part.began>=COUNT_MS){rest(part);continue;}
    show(part,countValue(part.to,time-part.began));active=true;
    continue;
   }
   part.best=Math.max(part.best,partProgress({y,start:part.start,span:part.span,after:part.after}));
   part.current+=(part.best-part.current)*share;
   if(part.best>=1&&part.current>.997){rest(part);continue;}
   part.element.style.setProperty('--p',soften(part.current).toFixed(4));
   if(part.best-part.current>.002)active=true;
  }
  if(active)frame(tick);else{ticking=false;lastTime=0;}
 }
 function requestTick(){
  if(ticking||!allowed()||!parts.some(part=>!part.done))return;
  ticking=true;frame(tick);
 }
 /** Put every waiting part where it belongs for the current state and scroll position. */
 function arm(){
  if(!allowed()){for(const part of parts)if(!part.done)rest(part);return;}
  measure();
  const y=windowObject.scrollY;
  for(const part of parts){
   if(part.done)continue;
   if(alreadyOnScreen(y,part.start))rest(part);
   else if(part.to!==null){if(part.began===null)show(part,0);}
   else if(part.best===0)part.element.style.setProperty('--p','0');
  }
  requestTick();
 }

 function apply(){
  if(root.getAttribute('data-motion')!==state)root.setAttribute('data-motion',state);
  runLoops();arm();
 }

 function set(next,{keep=true}={}){
  if(next!=='on'&&next!=='paused')throw new RangeError('Motion is "on" or "paused"');
  if(keep)writePreference(storage,next);
  if(next===state)return state;
  state=next;apply();
  for(const listener of [...listeners])listener(state);
  return state;
 }

 function stopObserving(){
  ambientObserver?.disconnect();ambientObserver=null;
  for(const key of ambient.keys())key.removeAttribute('data-running');
  ambient.clear();
  for(const part of parts){part.element.style?.removeProperty('--p');if(part.to!==null&&!part.done)show(part,part.to);}
  parts=[];scope=null;
 }

 /** Watch one drawn page: what is already on screen stays put, the rest settles as it is scrolled to. */
 function observe(page,{signal}={}){
  stopObserving();scope=page;
  parts=[...page.querySelectorAll('[data-enter]')].map(element=>({element,after:Number(element.getAttribute('data-enter-after'))||0,current:0,best:0,done:false,start:0,span:1,
   // `to` is the number a counting part counts up to (null for every other part); `began` is when its count started
   to:element.getAttribute('data-enter')==='count'?countTarget(element):null,began:null}));
  const loops=[...page.querySelectorAll('[data-ambient]')];
  if(Observer&&loops.length){
   ambientObserver=new Observer(entries=>{
    for(const entry of entries){const record=ambient.get(entry.target);if(record)record.ratio=entry.isIntersecting?Math.max(entry.intersectionRatio,.001):0;}
    runLoops();
   },{threshold:[0,.25,.5,.75,1]});
   for(const element of loops){
    ambient.set(element,{ratio:0,weight:loopWeight(element.getAttribute('data-ambient'))});
    ambientObserver.observe(element);
   }
  }
  signal?.addEventListener('abort',()=>{if(scope===page)stopObserving();},{once:true});
  apply();
 }

 const onScroll=()=>requestTick();
 const onResize=()=>{runLoops();if(allowed()){measure();requestTick();}};
 const onVisibility=()=>runLoops();
 const onReduced=()=>{if(readPreference(storage)===null)set(motionState(null,!!reducedQuery.matches),{keep:false});};
 const onStorage=event=>{if(event.key===MOTION_KEY||event.key===null)set(motionState(readPreference(storage),!!reducedQuery?.matches),{keep:false});};
 windowObject.addEventListener('scroll',onScroll,{passive:true});
 windowObject.addEventListener('resize',onResize);
 windowObject.addEventListener('load',onResize);
 windowObject.addEventListener('storage',onStorage);
 documentObject.addEventListener('visibilitychange',onVisibility);
 reducedQuery?.addEventListener?.('change',onReduced);
 documentObject.fonts?.ready?.then(()=>{if(allowed()){measure();requestTick();}});

 return Object.freeze({
  state:()=>state,
  allowed,
  set:next=>set(next),
  toggle:()=>set(state==='on'?'paused':'on'),
  subscribe(listener,{signal}={}){
   listeners.add(listener);const stop=()=>listeners.delete(listener);
   signal?.addEventListener('abort',stop,{once:true});return stop;
  },
  observe,
  /** Call after something changed the page's height (a row opened, cards were swapped). */
  remeasure(){if(allowed()){measure();requestTick();}},
  running:()=>[...ambient.keys()].filter(key=>key.hasAttribute('data-running')),
  waiting:()=>parts.filter(part=>!part.done).length,
  dispose(){
   stopObserving();listeners.clear();
   windowObject.removeEventListener('scroll',onScroll);
   windowObject.removeEventListener('resize',onResize);
   windowObject.removeEventListener('load',onResize);
   windowObject.removeEventListener('storage',onStorage);
   documentObject.removeEventListener('visibilitychange',onVisibility);
   reducedQuery?.removeEventListener?.('change',onReduced);
  }
 });
}

// Motion for the whole site, in one small module.
//
//  Entrances   `data-enter` on an element (optional order: style="--i:2"). It starts when the
//              element's top passes 84% of the screen height, once. Words rise and never fade.
//              Anything already on screen when a page opens is in place at once.
//  Ambient     `data-ambient` on a slowly moving layer. A loop runs only while it is on screen,
//              the tab is visible and motion is allowed; at most two run at once, one on phones.
//  Preference  "Pause motion" in the footer. The choice is kept on the device under `rk-motion`.
//              The device's reduced-motion setting counts as paused until the visitor chooses to play.
//
// The styles in motion.css apply only under html[data-motion="on"], which this module sets,
// so a page without scripts is simply still.

export const MOTION_KEY='rk-motion';
/** Where an entrance starts: when the element's top crosses this share of the screen height. */
export const ENTER_LINE=.84;
/** How many ambient loops may run at once. */
export const LOOP_LIMIT=Object.freeze({phone:1,wide:2});
/** Phones are narrower than this. */
export const WIDE_FROM=768;

/** The stored choice: 'paused', 'on', or null when the visitor has not chosen (or storage is closed). */
export function readPreference(storage){
 try{const value=storage?.getItem(MOTION_KEY);return value==='paused'||value==='on'?value:null;}catch{return null;}
}
/** Keep the choice on this device. Returns false when it could not be kept. */
export function writePreference(storage,value){
 if(value!=='paused'&&value!=='on')throw new RangeError('Motion is "on" or "paused"');
 try{storage.setItem(MOTION_KEY,value);return true;}catch{return false;}
}
/** The motion state from the stored choice and the device setting: a choice always wins. */
export function motionState(stored,reduced){
 if(stored==='paused'||stored==='on')return stored;
 return reduced?'paused':'on';
}
/** Is the element already on screen when the page opens? Then it must not animate in. */
export function alreadyOnScreen(top,viewportHeight){
 return top<viewportHeight;
}
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

/**
 * Start motion for the page. Everything from the browser can be replaced in tests.
 * Returns the service the parts use: state(), allowed(), set(), toggle(), subscribe(), observe().
 */
export function createMotion({documentObject=document,windowObject=window,storage=windowObject.localStorage,
 Observer=windowObject.IntersectionObserver,reducedQuery=windowObject.matchMedia?.('(prefers-reduced-motion: reduce)')}={}){
 const root=documentObject.documentElement,listeners=new Set();
 let state=motionState(readPreference(storage),!!reducedQuery?.matches);
 let enterObserver=null,ambientObserver=null;
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

 function apply(){
  if(root.getAttribute('data-motion')!==state)root.setAttribute('data-motion',state);
  runLoops();
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
  enterObserver?.disconnect();ambientObserver?.disconnect();enterObserver=null;ambientObserver=null;
  for(const key of ambient.keys())key.removeAttribute('data-running');
  ambient.clear();
 }

 /** Watch one drawn page: mark what is already on screen, then let the rest enter on sight. */
 function observe(scope,{signal}={}){
  stopObserving();
  const height=windowObject.innerHeight;
  const waiting=[];
  for(const element of scope.querySelectorAll('[data-enter]')){
   if(element.hasAttribute('data-entered'))continue;
   if(!Observer||alreadyOnScreen(element.getBoundingClientRect().top,height))element.setAttribute('data-entered','');
   else waiting.push(element);
  }
  if(Observer&&waiting.length){
   enterObserver=new Observer(entries=>{
    for(const entry of entries){
     if(!entry.isIntersecting)continue;
     entry.target.setAttribute('data-entered','');enterObserver?.unobserve(entry.target);
    }
   },{rootMargin:`0px 0px -${Math.round((1-ENTER_LINE)*100)}% 0px`,threshold:0});
   for(const element of waiting)enterObserver.observe(element);
  }
  const loops=[...scope.querySelectorAll('[data-ambient]')];
  if(Observer&&loops.length){
   ambientObserver=new Observer(entries=>{
    for(const entry of entries){const record=ambient.get(entry.target);if(record)record.ratio=entry.isIntersecting?Math.max(entry.intersectionRatio,.001):0;}
    runLoops();
   },{threshold:[0,.25,.5,.75,1]});
   for(const element of loops){
    ambient.set(element,{ratio:0,weight:element.getAttribute('data-ambient')==='minor'?1:2});
    ambientObserver.observe(element);
   }
  }
  signal?.addEventListener('abort',stopObserving,{once:true});
  apply();
 }

 const onVisibility=()=>runLoops();
 const onResize=()=>runLoops();
 const onReduced=()=>{if(readPreference(storage)===null)set(motionState(null,!!reducedQuery.matches),{keep:false});};
 const onStorage=event=>{if(event.key===MOTION_KEY||event.key===null)set(motionState(readPreference(storage),!!reducedQuery?.matches),{keep:false});};
 documentObject.addEventListener('visibilitychange',onVisibility);
 windowObject.addEventListener('resize',onResize);
 windowObject.addEventListener('storage',onStorage);
 reducedQuery?.addEventListener?.('change',onReduced);

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
  running:()=>[...ambient.keys()].filter(key=>key.hasAttribute('data-running')),
  dispose(){
   stopObserving();listeners.clear();
   documentObject.removeEventListener('visibilitychange',onVisibility);
   windowObject.removeEventListener('resize',onResize);
   windowObject.removeEventListener('storage',onStorage);
   reducedQuery?.removeEventListener?.('change',onReduced);
  }
 });
}

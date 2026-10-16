import {sceneParts,matchingScene,IMPLEMENTED_SCENES} from './scene-definitions.mjs';

// Reading and controls remain available while each decorative scene owns its clock.
export function createMotion({onMovementChange=()=>{}}={}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),listeners=[],scenes=[];
 const measured=new WeakMap(),layoutPending=new Set(),idleTargets=new Map();
 let disposed=false,enabled=true,paneVisible=true,manualPause=false,frame=0,last=null,layoutTimer=0,windowLayout=false,phoneMode=innerWidth<768;
 const effective=()=>enabled&&!reduced.matches;
 const homeScene=s=>/^H[1-9](?:-|$)/.test(s.type);
 const localMedia=s=>['H3-card','H4-panel','H9-card'].includes(s.type);
 const listen=(target,name,fn)=>{target.addEventListener(name,fn);listeners.push(()=>target.removeEventListener(name,fn));};
 const formFocused=s=>!!document.activeElement?.closest('form')&&s.root.contains(document.activeElement);
 const rememberSize=root=>{const css=getComputedStyle(root);measured.set(root,[root.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),root.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)]);};
 const observer=new IntersectionObserver(entries=>{
  if(disposed)return;
  for(const entry of entries){
   const s=scenes.find(scene=>scene.sentinel===entry.target);if(!s)continue;
   const was=s.visible;s.ratio=entry.isIntersecting?entry.intersectionRatio:0;s.visible=entry.isIntersecting&&s.ratio>=.25;
   if(s.visible){if(s.ready)s.started=true;else prepare(s);}
   if(was&&!entry.isIntersecting&&s.started&&!manualPause&&paneVisible&&!document.hidden)finish(s);
  }
  sync();
 },{rootMargin:'0px 0px -8% 0px',threshold:[0,.25,.5,.75,1]});
 const idleObserver=new IntersectionObserver(entries=>{
  if(disposed)return;
  for(const entry of entries)for(const record of idleTargets.get(entry.target)||[])record.visible=entry.isIntersecting&&entry.intersectionRatio>=.25;
  sync();
 },{rootMargin:'0px 0px -8% 0px',threshold:[0,.25,.5,.75,1]});
 const sizeObserver=new ResizeObserver(entries=>{
  if(disposed)return;
  for(const entry of entries){
   const size=[entry.contentRect.width,entry.contentRect.height],old=measured.get(entry.target);measured.set(entry.target,size);
   if(old&&(Math.abs(old[0]-size[0])>.5||Math.abs(old[1]-size[1])>.5))layoutPending.add(entry.target);
  }
  if(layoutPending.size)queueLayout();
 });
 function render(s){
  for(const {animation,start} of s.animations)animation.currentTime=s.time-start;
  s.done=s.time>=s.duration;s.root.classList.toggle('is-finished',s.done);s.definition?.onFrame?.(s.time);
 }
 function cancel(s){
  s.generation++;
  if(s.sentinel){observer.unobserve(s.sentinel);s.sentinel.remove();s.sentinel=null;}
  for(const {animation} of s.animations)animation.cancel();
  for(const record of s.loops){
   record.animation.cancel();
   if(record.visibilityRoot){const owners=idleTargets.get(record.visibilityRoot);owners?.delete(record);if(owners?.size===0){idleObserver.unobserve(record.visibilityRoot);idleTargets.delete(record.visibilityRoot);}}
  }
  for(const [element,style] of s.styles)style===null?element.removeAttribute('style'):element.setAttribute('style',style);
  s.definition?.cleanup();s.animations=[];s.loops=[];s.styles.clear();s.definition=null;s.ready=false;s.loading=false;
 }
 function imagesReady(s){
  const owned=element=>element.closest('[data-motion-owner]')===s.root;
  const media=s.definition.media??[...s.root.querySelectorAll('img,svg image')].filter(owned);
  return Promise.all(media.map(element=>{
   if(element.tagName.toLowerCase()==='img'){element.loading='eager';return element.decode?.().catch(()=>{})||Promise.resolve();}
   return new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=element.getAttribute('href')||element.getAttribute('xlink:href')||'';if(img.complete)resolve();});
  }));
 }
 function prepare(s){
  if(disposed||s.ready||s.loading||!s.definition)return;
  s.loading=true;const generation=s.generation;
  imagesReady(s).then(()=>{
   if(disposed||s.generation!==generation)return;
   s.loading=false;s.ready=true;s.started=s.started||s.visible||s.done;sync();
  });
 }
 function snapshot(s){
  return {time:s.time,duration:s.duration,started:s.started,done:s.done,loops:new Map(s.loops.map(({animation,key,duration})=>{
   const time=animation.currentTime;return [key,typeof time==='number'&&time>=0?(time%duration)/duration:null];
  }))};
 }
 function build(s,{finishNow=false,resumeTime=0,state=null}={}){
  cancel(s);const generation=s.generation;s.error=null;s.visible=false;s.ratio=0;
  try{
   const c=sceneParts(s.root,phoneMode,s.type);s.definition=c;s.duration=c.duration;s.stage=c.stage||s.root;
   const fraction=state&&state.duration>0?Math.max(0,Math.min(1,state.time/state.duration)):0;
   s.time=finishNow||state?.done||!effective()?s.duration:state?fraction*s.duration:Math.min(resumeTime,s.duration);
   s.started=!!state?.started||finishNow||resumeTime>0;
   const initial=new Map();
   for(const track of [...c.tracks].sort((a,b)=>a.start-b.start)){
    const {element,frames,start,end}=track;if(!s.styles.has(element))s.styles.set(element,element.getAttribute('style'));
    if(!initial.has(element))initial.set(element,new Set());const seen=initial.get(element);
    for(const [key,value] of Object.entries(frames[0]))if(!['offset','easing','composite'].includes(key)&&!seen.has(key)){element.style[key]=String(value);seen.add(key);}
    const animation=element.animate(frames,{duration:end-start,fill:'forwards',easing:track.easing||'linear'});
    animation.pause();s.animations.push({animation,start});
   }
   c.loops.forEach((spec,index)=>{
    const key=spec.key??String(index),animation=spec.element.animate(spec.frames,{duration:spec.duration,iterations:Infinity,fill:'none',easing:spec.easing??'ease-in-out'});
    animation.pause();const phase=state?.loops.get(key);animation.currentTime=typeof phase==='number'?phase*spec.duration:-1;
    const record={animation,key,duration:spec.duration,pauseWhen:spec.pauseWhen,visibilityRoot:spec.visibilityRoot,visible:false};s.loops.push(record);
    if(spec.visibilityRoot){if(!idleTargets.has(spec.visibilityRoot)){idleTargets.set(spec.visibilityRoot,new Set());idleObserver.observe(spec.visibilityRoot);}idleTargets.get(spec.visibilityRoot).add(record);}
   });
   render(s);
   const box=s.stage.getBoundingClientRect(),rootBox=s.root.getBoundingClientRect();
   s.sentinel=document.createElement('span');s.sentinel.className='ch-visibility-sentinel';s.sentinel.setAttribute('aria-hidden','true');
   Object.assign(s.sentinel.style,{top:Math.max(0,box.top-rootBox.top)+'px',height:Math.max(32,Math.min(420,box.height||s.root.clientHeight))+'px'});
   s.root.append(s.sentinel);observer.observe(s.sentinel);
   // A below-fold Home panel keeps native lazy loading until its own art is reached.
   if(!localMedia(s))prepare(s);
   if(disposed||s.generation!==generation)return;
  }catch(error){
   s.error=error.message;cancel(s);s.ready=true;s.done=true;s.time=s.duration||0;s.root.classList.add('is-finished');console.error('Choreography '+s.id,error);
  }
 }
 function add(root,type,id=type){
  const s={root,type,id,generation:0,time:0,duration:0,ready:false,loading:false,visible:false,ratio:0,started:false,done:false,animations:[],loops:[],styles:new Map(),definition:null};
  root.dataset.motionOwner=id;scenes.push(s);rememberSize(root);sizeObserver.observe(root);return s;
 }
 function children(){
  for(const s of [...scenes])if(s.child){
   cancel(s);sizeObserver.unobserve(s.root);delete s.root.dataset.motionOwner;scenes.splice(scenes.indexOf(s),1);
  }
  const selectors={H3:'.care-card',H4:'.doctor-card',H9:'.home-benefit-card',D1:'.doctor-card',...(phoneMode?{A3:'.doctor-card',A2:'.care-explained>article'}:{})};
  for(const s of [...scenes])if(selectors[s.type])for(const [index,root] of [...s.root.querySelectorAll(selectors[s.type])].entries()){
   const key=s.type==='H9'?root.dataset.benefit:s.type==='H4'?root.dataset.doctor:s.type==='H3'?(root.dataset.careKey||root.querySelector('[data-scene-id]')?.dataset.sceneId?.replace(/^care-/,'')):String(index);
   const child=add(root,s.type+(['H3','H9'].includes(s.type)?'-card':'-panel'),s.type+'/'+(key||index));child.child=true;
  }
 }
 function queueLayout(all=false){
  windowLayout=windowLayout||all;clearTimeout(layoutTimer);layoutTimer=setTimeout(flushLayout,120);
 }
 function flushLayout(){
  layoutTimer=0;if(disposed)return;
  const all=windowLayout,targets=new Set(layoutPending),next=innerWidth<768,breakpointChanged=next!==phoneMode;
  windowLayout=false;layoutPending.clear();
  // Capture before replacing responsive children, including their independently running loops.
  const states=new Map(scenes.map(s=>[s.id,snapshot(s)]));
  if(breakpointChanged){phoneMode=next;children();}
  for(const s of scenes){
   if(!all&&!breakpointChanged&&!targets.has(s.root))continue;
   const state=states.get(s.id);
   if(homeScene(s))build(s,state?{state}:{});
   else if(all||breakpointChanged)build(s,{finishNow:true});
   else if(['T2','T3'].includes(s.type))build(s,{resumeTime:state?.time||0});
   else build(s,{finishNow:!!state&&(state.started||state.done)});
   rememberSize(s.root);
  }
  last=null;sync();
 }
 function finish(s){s.time=s.duration;s.started=true;render(s);}
 const running=s=>s.ready&&s.started&&s.visible&&!s.done&&!formFocused(s);
 function sync(){
  if(disposed)return;
  if(!effective())for(const s of scenes)if(!s.done)finish(s);
  for(const s of scenes){
   if(formFocused(s)&&s.ready&&!s.done)finish(s);
   // Below the desk on phones, the explanatory steps have their own visibility.
   if(s.ready&&!s.visible&&!s.done&&effective()&&!manualPause&&paneVisible&&!document.hidden&&s.loops.some(record=>record.visibilityRoot&&record.visible))finish(s);
   const play=s.ready&&s.done&&effective()&&!manualPause&&paneVisible&&!document.hidden&&!formFocused(s);
   for(const {animation,pauseWhen,visibilityRoot,visible} of s.loops){
    if(play&&(visibilityRoot?visible:s.visible)&&!pauseWhen?.()){if(animation.currentTime<0)animation.currentTime=0;if(animation.playState!=='running')animation.play();}
    else{if(animation.playState!=='paused')animation.pause();if(!effective())animation.currentTime=-1;}
   }
  }
  const needed=effective()&&!manualPause&&paneVisible&&!document.hidden&&scenes.some(running);
  if(needed&&!frame)frame=requestAnimationFrame(tick);
  if(!needed){cancelAnimationFrame(frame);frame=0;last=null;}
 }
 function tick(now){
  frame=0;const delta=last===null?0:Math.max(0,Math.min(80,now-last));last=now;
  for(const s of scenes)if(running(s)){s.time=Math.min(s.duration,s.time+delta);render(s);}sync();
 }
 function settle(id){if(disposed)return;for(const s of scenes)if(matchingScene(s,id))finish(s);sync();}
 function pause(){manualPause=true;sync();}
 function play(id){
  if(disposed)return false;if(!effective()){settle(id);return false;}manualPause=false;
  for(const s of scenes)if(matchingScene(s,id)){s.time=0;s.started=true;for(const {animation} of s.loops){animation.pause();animation.currentTime=-1;}render(s);if(s.visible)prepare(s);}sync();return true;
 }
 function seek(id,percent){
  if(disposed)return false;if(!effective()){settle(id);return false;}manualPause=true;
  const amount=Math.max(0,Math.min(100,Number(percent)||0))/100;
  for(const s of scenes)if(matchingScene(s,id)){s.time=s.duration*amount;s.started=true;for(const {animation} of s.loops){animation.pause();animation.currentTime=-1;}render(s);}sync();return true;
 }
 function unmountScene(id){for(const s of scenes)if(matchingScene(s,id))cancel(s);sync();}
 function refreshScene(id,{replay=true}={}){
  if(disposed)return;
  for(const s of scenes)if(matchingScene(s,id)){rememberSize(s.root);layoutPending.delete(s.root);build(s,{finishNow:!replay});}sync();
 }
 function setVisible(value){paneVisible=!!value;last=null;sync();}
 function preferenceChanged(){onMovementChange({enabled,reduced:reduced.matches,effective:effective()});}
 function setMovement(value){enabled=!!value;if(!effective())settle();preferenceChanged();sync();}
 listen(reduced,'change',()=>{settle();preferenceChanged();sync();});
 for(const root of document.querySelectorAll('[data-section-scene]'))add(root,root.dataset.sectionScene);
 children();for(const s of scenes)build(s);
 listen(window,'resize',()=>queueLayout(true));
 listen(document,'choreography:interaction',sync);
 listen(document,'visibilitychange',()=>{last=null;sync();});
 listen(document,'focusin',sync);listen(document,'focusout',()=>queueMicrotask(sync));
 listen(window,'pagehide',()=>setVisible(false));listen(window,'pageshow',()=>setVisible(true));
 preferenceChanged();sync();
 return {play,pause,seek,settle,setVisible,setMovement,refreshScene,unmountScene,
  coverage:()=>IMPLEMENTED_SCENES,
  status:()=>scenes.map(s=>({id:s.id,type:s.type,time:s.time,duration:s.duration,done:s.done,visible:s.visible,ratio:s.ratio,ready:s.ready,tracks:s.animations.length,loops:s.loops.length,error:s.error,movement:enabled,reduced:reduced.matches,paused:manualPause,paneVisible})),
  dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);clearTimeout(layoutTimer);layoutPending.clear();observer.disconnect();idleObserver.disconnect();sizeObserver.disconnect();for(const fn of listeners)fn();for(const s of scenes){cancel(s);delete s.root.dataset.motionOwner;}idleTargets.clear();}
 };
}

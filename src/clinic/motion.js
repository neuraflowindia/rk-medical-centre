import {sceneParts,matchingScene,IMPLEMENTED_SCENES} from './scene-definitions.mjs';

// Text and controls never belong to a reveal track. Each decorative act has its
// own clock; a neighbouring section or a focused form cannot stall that clock.
export function createMotion({onMovementChange=()=>{}}={}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),listeners=[],scenes=[];
 let disposed=false,enabled=true,paneVisible=true,manualPause=false,frame=0,last=null,resizeTimer=0,layoutTimer=0,phoneMode=innerWidth<768;
 const measured=new WeakMap(),layoutPending=new Set();
 const effective=()=>enabled&&!reduced.matches;
 const listen=(target,name,fn)=>{target.addEventListener(name,fn);listeners.push(()=>target.removeEventListener(name,fn));};
 const formFocused=s=>!!document.activeElement?.closest('form')&&s.root.contains(document.activeElement);
 const observer=new IntersectionObserver(entries=>{
  if(disposed)return;
  for(const e of entries){const s=scenes.find(x=>x.sentinel===e.target);if(!s)continue;
   const was=s.visible;s.ratio=e.isIntersecting?e.intersectionRatio:0;s.visible=e.isIntersecting&&s.ratio>=.25;
   if(s.visible&&s.ready)s.started=true;
   if(was&&!e.isIntersecting&&s.started&&!manualPause&&paneVisible&&!document.hidden)finish(s);
  }sync();
 },{rootMargin:'0px 0px -8% 0px',threshold:[0,.25,.5,.75,1]});
 const sizeObserver=new ResizeObserver(entries=>{
  if(disposed)return;
  for(const entry of entries){const size=[entry.contentRect.width,entry.contentRect.height],old=measured.get(entry.target);measured.set(entry.target,size);if(!old)continue;const widthChanged=Math.abs(old[0]-size[0])>.5,heightChanged=Math.abs(old[1]-size[1])>.5;
   // Topic handoffs now dock in the real preparation rows. Their measured
   // positions must refresh when fonts or text change the section height.
   if(widthChanged||heightChanged)layoutPending.add(entry.target);
  }
  if(!layoutPending.size)return;clearTimeout(layoutTimer);layoutTimer=setTimeout(()=>{if(disposed)return;for(const s of scenes)if(layoutPending.has(s.root)){const topic=['T2','T3'].includes(s.type);build(s,topic?{resumeTime:s.time}:{finishNow:s.started||s.done});}layoutPending.clear();sync();},120);
 });
 function render(s){
  for(const {animation,start} of s.animations)animation.currentTime=s.time-start;
  s.done=s.time>=s.duration;s.root.classList.toggle('is-finished',s.done);s.definition?.onFrame?.(s.time);
 }
 function cancel(s){
  s.generation++;if(s.sentinel){observer.unobserve(s.sentinel);s.sentinel.remove();s.sentinel=null;}
  for(const {animation} of s.animations)animation.cancel();for(const a of s.loops)a.cancel();
  for(const [el,style] of s.styles)style===null?el.removeAttribute('style'):el.setAttribute('style',style);
  s.definition?.cleanup();s.animations=[];s.loops=[];s.styles.clear();s.definition=null;s.ready=false;
 }
 function imagesReady(root){
  const images=[...root.querySelectorAll('img')].map(img=>{img.loading='eager';return img.decode?.().catch(()=>{})||Promise.resolve();});
  for(const el of root.querySelectorAll('svg image'))images.push(new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=el.getAttribute('href')||el.getAttribute('xlink:href')||'';if(img.complete)resolve();}));
  return Promise.all(images);
 }
 function build(s,{finishNow=false,resumeTime=0}={}){
  cancel(s);const generation=s.generation;s.error=null;
  try{
   const c=sceneParts(s.root,phoneMode,s.type);s.definition=c;s.duration=c.duration;s.stage=c.stage||s.root;s.time=finishNow||!effective()?s.duration:Math.min(resumeTime,s.duration);s.started=false;
   const initial=new Map();
   for(const track of [...c.tracks].sort((a,b)=>a.start-b.start)){
    const {element,frames,start,end}=track;if(!s.styles.has(element))s.styles.set(element,element.getAttribute('style'));
    if(!initial.has(element))initial.set(element,new Set());const seen=initial.get(element);
    for(const [key,value] of Object.entries(frames[0]))if(!['offset','easing','composite'].includes(key)&&!seen.has(key)){element.style[key]=String(value);seen.add(key);}
    // Negative local time has no effect; forwards fill retains a completed
    // segment without a future segment overwriting the current one.
    const animation=element.animate(frames,{duration:end-start,fill:'forwards',easing:track.easing||'linear'});
    animation.pause();s.animations.push({animation,start});
   }
   for(const spec of c.loops){const a=spec.element.animate(spec.frames,{duration:spec.duration,iterations:Infinity,fill:'none',easing:'ease-in-out'});a.pause();a.currentTime=-1;s.loops.push(a);}
   render(s);
   const box=s.stage.getBoundingClientRect(),rootBox=s.root.getBoundingClientRect();
   s.sentinel=document.createElement('span');s.sentinel.className='ch-visibility-sentinel';s.sentinel.setAttribute('aria-hidden','true');
   Object.assign(s.sentinel.style,{top:Math.max(0,box.top-rootBox.top)+'px',height:Math.max(32,Math.min(420,box.height||s.root.clientHeight))+'px'});
   s.root.append(s.sentinel);observer.observe(s.sentinel);
   imagesReady(s.root).then(()=>{if(disposed||s.generation!==generation)return;s.ready=true;s.started=s.visible||finishNow||resumeTime>0;sync();});
  }catch(error){s.error=error.message;cancel(s);s.ready=true;s.done=true;s.time=s.duration||0;s.root.classList.add('is-finished');console.error('Choreography '+s.id,error);}
 }
 function add(root,type,id=type){const s={root,type,id,generation:0,time:0,duration:0,ready:false,visible:false,ratio:0,started:false,done:false,animations:[],loops:[],styles:new Map(),definition:null};scenes.push(s);const css=getComputedStyle(root);measured.set(root,[root.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),root.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)]);sizeObserver.observe(root);return s;}
 function children(){
  for(const s of [...scenes])if(s.child){cancel(s);sizeObserver.unobserve(s.root);scenes.splice(scenes.indexOf(s),1);}
  const selectors=phoneMode?{H3:'.care-card',H4:'.doctor-card',D1:'.doctor-card',A3:'.doctor-card',A2:'.care-explained>article'}:{D1:'.doctor-card'};
  for(const s of [...scenes])if(selectors[s.type])for(const [i,root]of [...s.root.querySelectorAll(selectors[s.type])].entries()){
   const child=add(root,s.type+(s.type==='H3'?'-card':'-panel'),s.type+'/'+i);child.child=true;
  }
 }
 function finish(s){s.time=s.duration;s.started=true;render(s);}
 const running=s=>s.ready&&s.started&&s.visible&&!s.done&&!formFocused(s);
 function sync(){
  if(disposed)return;
  if(!effective())for(const s of scenes)if(!s.done)finish(s);
  for(const s of scenes){
   if(formFocused(s)&&s.ready&&!s.done)finish(s);
   const play=s.ready&&s.done&&s.visible&&effective()&&!manualPause&&paneVisible&&!document.hidden&&!formFocused(s);
   for(const a of s.loops){if(play){if(a.currentTime<0)a.currentTime=0;if(a.playState!=='running')a.play();}else{if(a.playState!=='paused')a.pause();if(!effective())a.currentTime=-1;}}
  }
  const needed=effective()&&!manualPause&&paneVisible&&!document.hidden&&scenes.some(running);
  if(needed&&!frame)frame=requestAnimationFrame(tick);
  if(!needed){cancelAnimationFrame(frame);frame=0;last=null;}
 }
 function tick(now){frame=0;const delta=last===null?0:Math.max(0,Math.min(80,now-last));last=now;
  for(const s of scenes)if(running(s)){s.time=Math.min(s.duration,s.time+delta);render(s);}sync();
 }
 function settle(id){if(disposed)return;for(const s of scenes)if(matchingScene(s,id))finish(s);sync();}
 function pause(){manualPause=true;sync();}
 function play(id){if(disposed)return false;if(!effective()){settle(id);return false;}manualPause=false;
  for(const s of scenes)if(matchingScene(s,id)){s.time=0;s.started=true;for(const a of s.loops){a.pause();a.currentTime=-1;}render(s);}sync();return true;
 }
 function seek(id,percent){if(disposed)return false;if(!effective()){settle(id);return false;}manualPause=true;
  const amount=Math.max(0,Math.min(100,Number(percent)||0))/100;
  for(const s of scenes)if(matchingScene(s,id)){s.time=s.duration*amount;s.started=true;for(const a of s.loops){a.pause();a.currentTime=-1;}render(s);}sync();return true;
 }
 function unmountScene(id){for(const s of scenes)if(matchingScene(s,id))cancel(s);sync();}
 function refreshScene(id,{replay=true}={}){if(disposed)return;for(const s of scenes)if(matchingScene(s,id)){const css=getComputedStyle(s.root);measured.set(s.root,[s.root.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),s.root.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)]);layoutPending.delete(s.root);build(s,{finishNow:!replay});}sync();}
 function setVisible(value){paneVisible=!!value;last=null;sync();}
 function preferenceChanged(){onMovementChange({enabled,reduced:reduced.matches,effective:effective()});}
 function setMovement(value){enabled=!!value;if(!effective())settle();preferenceChanged();sync();}
 function resize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(disposed)return;const next=innerWidth<768;if(next!==phoneMode){phoneMode=next;children();}for(const s of scenes)build(s,{finishNow:true});sync();},120);}
 listen(reduced,'change',()=>{settle();preferenceChanged();sync();});
 for(const root of document.querySelectorAll('[data-section-scene]'))add(root,root.dataset.sectionScene);
 children();for(const s of scenes)build(s);
 listen(window,'resize',resize);
 listen(document,'visibilitychange',()=>{last=null;sync();});
 listen(document,'focusin',sync);listen(document,'focusout',()=>queueMicrotask(sync));
 listen(window,'pagehide',()=>setVisible(false));listen(window,'pageshow',()=>setVisible(true));
 preferenceChanged();sync();
 return {play,pause,seek,settle,setVisible,setMovement,refreshScene,unmountScene,
  coverage:()=>IMPLEMENTED_SCENES,
  status:()=>scenes.map(s=>({id:s.id,type:s.type,time:s.time,duration:s.duration,done:s.done,visible:s.visible,ratio:s.ratio,ready:s.ready,tracks:s.animations.length,loops:s.loops.length,error:s.error,movement:enabled,reduced:reduced.matches,paused:manualPause,paneVisible})),
  dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);clearTimeout(resizeTimer);clearTimeout(layoutTimer);layoutPending.clear();observer.disconnect();sizeObserver.disconnect();for(const fn of listeners)fn();for(const s of scenes)cancel(s);}
 };
}

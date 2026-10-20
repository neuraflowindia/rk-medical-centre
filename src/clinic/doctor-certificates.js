import {certificatesFor} from './certificate-catalogue.mjs';
import {doctors,escapeHTML as e} from './model.mjs';

function certificateFigure(item,{mixed=false,decorative=false}={}){
 const first=item.variants[0],largest=item.variants.at(-1);
 const image=`<img data-certificate-image data-certificate-id="${e(item.id)}" src="${e(first.src)}" srcset="${item.variants.map(v=>`${e(v.src)} ${v.width}w`).join(', ')}" sizes="(max-width:767px) 200px, (max-width:1199px) 216px, 232px" width="${largest.width}" height="${largest.height}" alt="${decorative?'':e(doctors[item.doctor].name+' — '+item.description)}" loading="lazy" decoding="async">`;
 return `<figure class="doctor-certificate" data-certificate-id="${e(item.id)}"><div class="certificate-paper" data-certificate-paper data-media-state="loading">${image}<span class="certificate-loading" aria-hidden="true">Loading certificate…</span>${decorative?'':`<div class="certificate-image-error" data-certificate-error hidden><span>Image unavailable</span><button type="button" data-certificate-retry aria-label="Try loading ${e(item.title)} again">Try again</button></div>`}</div><figcaption>${mixed?`<span class="certificate-person">${e(doctors[item.doctor].name)}</span>`:''}<strong class="certificate-title">${e(item.title)}</strong><span class="certificate-issuer">${e(item.issuer)}</span></figcaption></figure>`;
}

export function certificateCollection(doctor='mixed'){
 const mixed=doctor==='mixed',items=certificatesFor(doctor);
 if(!items.length)return '';
 const title=mixed?'The doctors’ certificates':`${doctors[doctor].name}’s certificates`;
 const introduction=mixed?'A look at their training, professional memberships and awards.':doctor==='sanjay'?'A few certificates from his training and professional memberships.':'A few certificates from her training, fellowships and awards.';
 const listId=`certificates-${doctor}-list`,headingId=`certificates-${doctor}-title`;
 const group=mixed?`<div class="certificate-marquee-group" data-certificate-group>${items.map(item=>certificateFigure(item,{mixed:true,decorative:true})).join('')}</div>`:'';
 return `<div class="doctor-certificates ${mixed?'certificates-mixed':'certificates-profile'}" data-certificates data-certificate-doctor="${e(doctor)}" data-certificate-layout="row" data-motion-owner="certificates-${e(doctor)}" role="region" aria-labelledby="${headingId}"><div class="certificate-heading"><div><h2 id="${headingId}">${e(title)}</h2><p>${e(introduction)}</p></div>${mixed?`<button class="certificate-browse" type="button" data-certificate-browse aria-expanded="false" aria-controls="${listId}"><span data-certificate-browse-label>Browse all ${items.length}</span><span data-certificate-browse-arrow aria-hidden="true">↓</span></button>`:''}</div><ul class="certificate-list" data-certificate-list id="${listId}" tabindex="0" aria-label="${e(title)}">${items.map(item=>`<li>${certificateFigure(item,{mixed})}</li>`).join('')}</ul>${mixed?`<div class="certificate-viewport" data-certificate-viewport aria-hidden="true" hidden><div class="certificate-track" data-certificate-track>${group}${group}</div></div>`:''}<p class="sr-only" data-certificate-announcement role="status" aria-live="polite"></p></div>`;
}

// This component owns its media and its clock. Doctor scenes never wait for it.
export function bindDoctorCertificates({signal,visible=true}={}){
 const root=document.querySelector('[data-certificates]');
 const empty={setVisible(){},dispose(){}};
 if(!root||signal?.aborted)return empty;
 const mixed=root.dataset.certificateDoctor==='mixed';
 const items=certificatesFor(root.dataset.certificateDoctor);
 const byId=new Map(items.map(item=>[item.id,item]));
 const list=root.querySelector('[data-certificate-list]');
 const viewport=root.querySelector('[data-certificate-viewport]');
 const track=root.querySelector('[data-certificate-track]');
 const group=root.querySelector('[data-certificate-group]');
 const browse=root.querySelector('[data-certificate-browse]');
 const announcement=root.querySelector('[data-certificate-announcement]');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const abort=new AbortController();
 const media=new Map([...root.querySelectorAll('[data-certificate-image]')].map(image=>[image,{status:'loading',timer:0,generation:0}]));
 let disposed=false,primed=false,intersecting=false,paneVisible=!!visible,reading=false,hovering=false;
 let animation=null,duration=0,phase=0,elapsedHold=0,resizeFrame=0,lastLayout='',retryNumber=0;
 let motionFailed=!mixed||typeof track?.animate!=='function'||typeof IntersectionObserver!=='function';

 function remember(){
  const time=Number(animation?.currentTime);
  if(animation&&Number.isFinite(time)&&duration>0){
   elapsedHold=Math.min(1500,Math.max(0,time));
   phase=time<1500?0:((time-1500)%duration+duration)%duration/duration;
  }
 }
 function stop(){remember();animation?.cancel();animation=null;}
 function hasFailure(){return [...media.values()].some(state=>state.status==='error');}
 function imagesReady(){return primed&&[...media.values()].every(state=>state.status==='ready');}
 function renderLayout(){
  // A focused list is never hidden while an image finishes or a preference changes.
  const canTravel=mixed&&!reading&&!preference.matches&&!motionFailed&&!hasFailure()&&imagesReady()&&!list.contains(document.activeElement);
  const next=reading?'grid':canTravel?'marquee':'row';
  if(next!==lastLayout){
   lastLayout=next;root.dataset.certificateLayout=next;
   list.classList.toggle('certificate-list-accessible',next==='marquee');
   list.tabIndex=next==='marquee'?-1:0;
   if(viewport)viewport.hidden=next!=='marquee';
  }
  if(browse){
   // The shared visibility binding watches child changes. Unchanged text must
   // not trigger a visibility → modal observer → text-write feedback loop.
   const expanded=String(reading),label=browse.querySelector('[data-certificate-browse-label]'),arrow=browse.querySelector('[data-certificate-browse-arrow]');
   const wording=reading?'Close certificate list':`Browse all ${items.length}`,symbol=reading?'↑':'↓';
   if(browse.getAttribute('aria-expanded')!==expanded)browse.setAttribute('aria-expanded',expanded);
   if(label.textContent!==wording)label.textContent=wording;
   if(arrow.textContent!==symbol)arrow.textContent=symbol;
  }
  return next;
 }
 function sync(){
  if(disposed)return;
  const layout=renderLayout();
  const active=document.activeElement;
  const focused=root.contains(active)&&active.matches(':focus-visible');
  const blocked=!!document.querySelector('dialog[open],#privacy-panel:not([hidden])');
  const play=layout==='marquee'&&intersecting&&paneVisible&&!document.hidden&&!hovering&&!focused&&!blocked;
  if(animation){if(play&&animation.playState!=='running')animation.play();else if(!play&&animation.playState!=='paused')animation.pause();}
  const movement=play&&animation?'running':'still';
  if(root.dataset.certificateMotion!==movement)root.dataset.certificateMotion=movement;
 }
 function rebuild(){
  resizeFrame=0;
  if(disposed)return;
  if(renderLayout()!=='marquee'){sync();return;}
  const distance=group.getBoundingClientRect().width;
  if(!Number.isFinite(distance)||distance<=0)return;
  stop();
  duration=distance/(innerWidth<768?12:16)*1000;
  try{
   animation=track.animate([{transform:'translate3d(0,0,0)'},{transform:`translate3d(${-distance}px,0,0)`}],{duration,delay:1500,iterations:Infinity,easing:'linear',fill:'both'});
   animation.pause();animation.currentTime=elapsedHold+phase*duration;sync();
  }catch{
   animation?.cancel();animation=null;motionFailed=true;sync();
  }
 }
 function scheduleRebuild(){if(!disposed&&!resizeFrame)resizeFrame=requestAnimationFrame(rebuild);}
 function imageState(image,status){
  if(disposed)return;
  const state=media.get(image);if(!state)return;
  clearTimeout(state.timer);state.timer=0;state.status=status;
  const paper=image.closest('[data-certificate-paper]');
  const retry=paper.querySelector('[data-certificate-retry]');
  if(status==='ready'&&retry===document.activeElement)list.focus({preventScroll:true});
  if(paper.dataset.mediaState!==status)paper.dataset.mediaState=status;
  const error=paper.querySelector('[data-certificate-error]');if(error&&error.hidden!==(status!=='error'))error.hidden=status!=='error';
  const failed=hasFailure();
  const message=failed?'A certificate image could not be loaded. Its caption is still available, and you can try the image again.':'';
  if(announcement.textContent!==message)announcement.textContent=message;
  sync();if(imagesReady())scheduleRebuild();
 }
 function watch(image){
  const state=media.get(image);if(!state)return;
  const generation=++state.generation;
  clearTimeout(state.timer);state.timer=0;
  image.loading='eager';
  if(image.complete){imageState(image,image.naturalWidth?'ready':'error');return;}
  state.timer=setTimeout(()=>{if(state.generation===generation)imageState(image,'error');},15000);
 }
 function prime(){
  if(disposed||primed)return;
  primed=true;
  for(const image of media.keys())watch(image);
  sync();if(imagesReady())scheduleRebuild();
 }
 function onImageEvent(event){
  if(disposed||!media.has(event.target))return;
  const image=event.target;
  // Ignore a superseded resource event while the image's new request is pending.
  if(image.complete)imageState(image,image.naturalWidth?'ready':'error');
 }
 function retryCertificate(id){
  const item=byId.get(id);if(!item)return;
  retryNumber++;
  // The list stays focused/visible when the retry control is replaced by an image.
  list.focus({preventScroll:true});
  for(const [image,state] of media){
   if(image.dataset.certificateId!==id)continue;
   clearTimeout(state.timer);state.status='loading';
   const paper=image.closest('[data-certificate-paper]');paper.dataset.mediaState='loading';
   const error=paper.querySelector('[data-certificate-error]');if(error)error.hidden=true;
   const path=variant=>variant.src+'?image-retry='+retryNumber;
   image.srcset=item.variants.map(v=>`${path(v)} ${v.width}w`).join(', ');
   image.src=path(item.variants[0]);
   watch(image);
  }
  sync();
 }
 root.addEventListener('load',onImageEvent,{capture:true,signal:abort.signal});
 root.addEventListener('error',onImageEvent,{capture:true,signal:abort.signal});
 root.addEventListener('click',event=>{const button=event.target.closest('[data-certificate-retry]');if(button&&root.contains(button))retryCertificate(button.closest('[data-certificate-id]').dataset.certificateId);},{signal:abort.signal});
 root.addEventListener('focusin',sync,{signal:abort.signal});
 root.addEventListener('focusout',()=>queueMicrotask(()=>{sync();scheduleRebuild();}),{signal:abort.signal});
 root.addEventListener('keydown',()=>queueMicrotask(sync),{signal:abort.signal});
 root.addEventListener('keyup',sync,{signal:abort.signal});
 root.addEventListener('pointerdown',()=>queueMicrotask(sync),{signal:abort.signal});
 if(browse)browse.addEventListener('click',()=>{reading=!reading;sync();scheduleRebuild();},{signal:abort.signal});
 if(viewport){
  root.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'||event.pointerType==='pen'){hovering=true;sync();}},{signal:abort.signal});
  const leave=()=>{hovering=false;sync();};
  root.addEventListener('pointerleave',leave,{signal:abort.signal});
  root.addEventListener('pointercancel',leave,{signal:abort.signal});
 }
 const onPreference=()=>{sync();scheduleRebuild();};
 preference.addEventListener('change',onPreference,{signal:abort.signal});
 document.addEventListener('visibilitychange',sync,{signal:abort.signal});
 window.addEventListener('resize',scheduleRebuild,{signal:abort.signal});
 const visibilityObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting;sync();}):null;
 const admissionObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{if(entries[0].isIntersecting){prime();admissionObserver.disconnect();}},{rootMargin:'400px 0px'}):null;
 visibilityObserver?.observe(root);admissionObserver?.observe(root);
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(scheduleRebuild):null;
 if(viewport)resizeObserver?.observe(viewport);
 const modalObserver=new MutationObserver(sync);
 modalObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','hidden']});
 document.fonts?.ready.then(scheduleRebuild,()=>{});
 for(const image of media.keys())if(image.complete)imageState(image,image.naturalWidth?'ready':'error');
 if(!admissionObserver)prime();

 function dispose(){
  if(disposed)return;
  disposed=true;cancelAnimationFrame(resizeFrame);stop();
  for(const state of media.values())clearTimeout(state.timer);
  visibilityObserver?.disconnect();admissionObserver?.disconnect();resizeObserver?.disconnect();modalObserver.disconnect();abort.abort();
  signal?.removeEventListener('abort',dispose);
 }
 signal?.addEventListener('abort',dispose,{once:true});
 sync();
 return {setVisible(value){if(disposed)return;paneVisible=!!value;sync();},dispose};
}

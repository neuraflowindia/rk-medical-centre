import {clinicPhotos,clinicAlbum} from './client-media.mjs';
import {photoFigure} from './clinic-photos.js';

const PHOTO_DEADLINE=15000;
const VIEWER_DURATION=150;

/** Owns photographs only. Existing factual/illustration scenes never wait here. */
export function bindClinicPhotos({signal}={}){
 const root=document.querySelector('main');
 if(!root||signal?.aborted)return ()=>{};
 const abort=new AbortController(),ownSignal=abort.signal;
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const album=clinicAlbum.filter(id=>Object.hasOwn(clinicPhotos,id));
 const observed=new Map();
 let disposed=false,dialog=null,viewer=null,opener=null,selectedIndex=0;
 let request=null,requestGeneration=0,animation=null,closing=false;
 const imageObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries){if(!entry.isIntersecting)continue;imageObserver.unobserve(entry.target);observed.get(entry.target)?.startDeadline();}
 },{rootMargin:'300px'}):null;

 function syncScrollLock(){document.documentElement.classList.toggle('dialog-open',!!document.querySelector('dialog[open]'));}
 function stopAnimation(){animation?.cancel();animation=null;}
 function releaseImage(image){const item=observed.get(image);if(!item)return;imageObserver?.unobserve(image);item.abort.abort();clearTimeout(item.timer);observed.delete(image);}
 function restoreButton(item){
  if(!item.button||!item.failed)return;
  if(item.previousLabel===null)item.button.removeAttribute('aria-label');else item.button.setAttribute('aria-label',item.previousLabel);
  item.button.classList.remove('is-photo-retry');item.failed=false;
 }
 function watchImage(image){
  if(disposed||observed.has(image))return;
  const photo=clinicPhotos[image.dataset.clientPhotoImage];
  if(!photo)return;
  const identity=image.closest('[data-doctor-photo-frame]');
  const frame=identity||image.closest('[data-photo-frame]');
  if(!frame)return;
  const button=image.closest('button[data-photo-open],button[data-photo-select]');
  let failure=frame.querySelector('[data-photo-error]');
  if(!identity&&!failure){
   failure=document.createElement('span');failure.dataset.photoError='';failure.className='clinic-photo-error';failure.hidden=true;
   const status=document.createElement('span');status.setAttribute('role','status');status.textContent='Photo unavailable';
   const retry=document.createElement('span');retry.className='clinic-photo-retry-label';retry.textContent='Retry photo';
   failure.append(status,retry);frame.append(failure);
  }
  const item={abort:new AbortController(),timer:null,frame,identity,button,failure,failed:false,previousLabel:button?.getAttribute('aria-label')??null,startDeadline:null};
  observed.set(image,item);
  const current=()=>!disposed&&observed.get(image)===item&&root.contains(image);
  function hideFailure(){
   if(!failure)return;
   if(failure.contains(document.activeElement)){
    const target=button||frame.closest('figure')||frame;
    if(target===frame||target.tagName==='FIGURE')target.tabIndex=-1;
    target.focus({preventScroll:true});
   }
   failure.hidden=true;
  }
  function ready(){
   if(!current()||!image.naturalWidth)return;
   clearTimeout(item.timer);item.timer=null;imageObserver?.unobserve(image);
   frame.dataset.photoState='ready';frame.classList.remove('is-photo-loading','is-photo-unavailable');frame.removeAttribute('aria-busy');
   image.hidden=false;hideFailure();restoreButton(item);
  }
  function failed(){
   if(!current())return;
   clearTimeout(item.timer);item.timer=null;imageObserver?.unobserve(image);
   frame.dataset.photoState='error';frame.classList.remove('is-photo-loading');frame.classList.add('is-photo-unavailable');frame.removeAttribute('aria-busy');
   image.hidden=true;
   if(identity)return;
   if(failure)failure.hidden=false;
   if(button){item.failed=true;button.classList.add('is-photo-retry');button.setAttribute('aria-label',`Retry photo: ${photo.caption}`);}
  }
  item.startDeadline=()=>{
   if(!current()||item.timer!==null||frame.dataset.photoState==='ready'||frame.dataset.photoState==='error')return;
   item.timer=setTimeout(failed,PHOTO_DEADLINE);
  };
  image.addEventListener('load',ready,{signal:item.abort.signal});
  image.addEventListener('error',failed,{signal:item.abort.signal});
  frame.dataset.photoState='loading';frame.classList.add('is-photo-loading');frame.classList.remove('is-photo-unavailable');frame.setAttribute('aria-busy','true');
  hideFailure();
  if(image.complete){if(image.naturalWidth)ready();else failed();}
  else if(image.loading==='lazy'&&imageObserver)imageObserver.observe(image);
  else item.startDeadline();
 }
 function watchWithin(container){container.querySelectorAll('img[data-client-photo-image]').forEach(watchImage);}
 function sourceSet(photo){return photo.sources.map(source=>`${source.src} ${source.width}w`).join(', ');}
 function retryURL(value,stamp){const url=new URL(value,location.href);url.searchParams.set('photo-retry',stamp);return url.href;}
 function retryPageImage(button){
  const container=button.matches('[data-photo-retry]')?button.closest('[data-photo-frame]'):button;
  const image=container?.querySelector('img[data-client-photo-image]'),item=observed.get(image);
  if(!image||!item||item.frame.dataset.photoState!=='error')return false;
  const photo=clinicPhotos[image.dataset.clientPhotoImage],replacement=image.cloneNode(false),stamp=String(Date.now());
  restoreButton(item);releaseImage(image);replacement.hidden=false;
  replacement.loading='eager';replacement.removeAttribute('src');replacement.removeAttribute('srcset');
  replacement.srcset=photo.sources.map(source=>`${retryURL(source.src,stamp)} ${source.width}w`).join(', ');
  replacement.src=retryURL(photo.src,stamp);image.replaceWith(replacement);watchImage(replacement);return true;
 }

 function selectGallery(gallery,id,{replace=true}={}){
  if(!album.includes(id))return;
  const stage=gallery.querySelector('[data-gallery-stage]');
  if(!stage)return;
  if(replace&&gallery.dataset.selectedPhoto!==id){
   const previous=stage.querySelector('figure'),sizes=previous?.querySelector('img')?.getAttribute('sizes');
   const template=document.createElement('template');template.innerHTML=photoFigure(id,{sizes:sizes||'(min-width: 1376px) 832px, (min-width: 1024px) 62vw, calc(100vw - 40px)'});
   const next=template.content.firstElementChild;
   if(previous)next.classList.add(...previous.classList);
   stage.querySelectorAll('img[data-client-photo-image]').forEach(releaseImage);
   stage.replaceChildren(next);watchWithin(stage);
  }
  gallery.dataset.selectedPhoto=id;
  gallery.querySelectorAll('[data-photo-select]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.photoSelect===id)));
  gallery.querySelectorAll('[data-gallery-open]').forEach(button=>button.dataset.photoOpen=id);
  let status=gallery.querySelector('[data-photo-selection-status]');
  if(!status){status=document.createElement('span');status.className='sr-only';status.dataset.photoSelectionStatus='';status.setAttribute('role','status');gallery.append(status);}
  if(replace)status.textContent=`${clinicPhotos[id].caption} selected`;
 }

 function cancelRequest({remove=false}={}){
  requestGeneration++;
  if(!request)return;
  clearTimeout(request.timer);request.abort.abort();
  if(remove){request.image.removeAttribute('srcset');request.image.removeAttribute('src');request.image.remove();}
  request=null;
 }
 function hideViewerFailure(){
  if(viewer.failure.contains(document.activeElement)&&dialog?.open)viewer.close.focus({preventScroll:true});
  viewer.failure.hidden=true;
 }
 function loadViewer({retry=false}={}){
  cancelRequest({remove:true});
  const photo=clinicPhotos[album[selectedIndex]];
  if(!photo||!viewer)return;
  const generation=requestGeneration,image=new Image(),requestAbort=new AbortController();
  request={image,abort:requestAbort,timer:null};const own=request;
  const current=()=>!disposed&&request===own&&requestGeneration===generation;
  viewer.slot.replaceChildren(image);viewer.frame.dataset.photoState='loading';viewer.frame.setAttribute('aria-busy','true');
  viewer.loading.hidden=false;hideViewerFailure();
  viewer.caption.textContent=photo.caption;viewer.count.textContent=`${selectedIndex+1} of ${album.length}`;
  viewer.previous.disabled=album.length<2;viewer.next.disabled=album.length<2;
  image.alt=photo.alt;image.width=photo.width;image.height=photo.height;image.hidden=true;image.decoding='async';image.loading='eager';
  image.sizes='(min-width: 1212px) 1148px, calc(100vw - 64px)';
  function ready(){
   if(!current()||!image.naturalWidth)return;
   clearTimeout(own.timer);own.timer=null;viewer.frame.dataset.photoState='ready';viewer.frame.removeAttribute('aria-busy');
   viewer.loading.hidden=true;hideViewerFailure();image.hidden=false;
  }
  function failed(){
   if(!current())return;
   clearTimeout(own.timer);own.timer=null;viewer.frame.dataset.photoState='error';viewer.frame.removeAttribute('aria-busy');
   viewer.loading.hidden=true;viewer.failure.hidden=false;image.hidden=true;
  }
  image.addEventListener('load',ready,{signal:requestAbort.signal});image.addEventListener('error',failed,{signal:requestAbort.signal});
  own.timer=setTimeout(failed,PHOTO_DEADLINE);
  const stamp=retry?String(Date.now()):null;
  image.srcset=stamp?photo.sources.map(source=>`${retryURL(source.src,stamp)} ${source.width}w`).join(', '):sourceSet(photo);
  image.src=stamp?retryURL(photo.src,stamp):photo.src;
  if(image.complete)queueMicrotask(()=>{if(!current())return;if(image.naturalWidth)ready();else failed();});
 }
 function step(amount){if(closing||!dialog?.open||album.length<2)return;selectedIndex=(selectedIndex+amount+album.length)%album.length;loadViewer();}
 function finishClose(){stopAnimation();if(dialog?.open)dialog.close();}
 function closeViewer(reason='dismiss'){
  if(!dialog?.open)return;
  dialog.dataset.closeReason=reason;
  if(closing&&reason==='dismiss')return;
  closing=true;cancelRequest();stopAnimation();
  if(reason==='navigate'||preference.matches||typeof dialog.animate!=='function'){finishClose();return;}
  const own=dialog.animate([{opacity:1},{opacity:0}],{duration:VIEWER_DURATION,easing:'ease-out',fill:'forwards'});
  animation=own;own.finished.then(()=>{if(animation===own)finishClose();},()=>{});
 }
 function ensureViewer(){
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.id='clinic-photo-viewer';dialog.className='clinic-photo-viewer';dialog.setAttribute('aria-label','Clinic photographs');
  dialog.innerHTML='<div class="clinic-photo-viewer-shell"><div class="clinic-photo-viewer-top"><p class="clinic-photo-viewer-count" data-viewer-count></p><button type="button" class="clinic-photo-viewer-close" data-viewer-close aria-label="Close photo viewer">Close <span aria-hidden="true">×</span></button></div><div class="clinic-photo-viewer-stage" data-viewer-frame><div class="clinic-photo-viewer-image" data-viewer-image></div><p class="clinic-photo-viewer-loading" data-viewer-loading role="status">Opening photograph…</p><div class="clinic-photo-viewer-failure" data-viewer-failure hidden><p role="status">Photo unavailable</p><button type="button" data-viewer-retry>Retry photo</button></div></div><p class="clinic-photo-viewer-caption" data-viewer-caption aria-live="polite"></p><div class="clinic-photo-viewer-navigation"><button type="button" data-viewer-previous aria-label="Previous photograph"><span aria-hidden="true">←</span> Previous</button><button type="button" data-viewer-next aria-label="Next photograph">Next <span aria-hidden="true">→</span></button></div></div>';
  document.body.append(dialog);
  viewer={frame:dialog.querySelector('[data-viewer-frame]'),slot:dialog.querySelector('[data-viewer-image]'),loading:dialog.querySelector('[data-viewer-loading]'),failure:dialog.querySelector('[data-viewer-failure]'),caption:dialog.querySelector('[data-viewer-caption]'),count:dialog.querySelector('[data-viewer-count]'),previous:dialog.querySelector('[data-viewer-previous]'),next:dialog.querySelector('[data-viewer-next]'),close:dialog.querySelector('[data-viewer-close]')};
  viewer.close.addEventListener('click',()=>closeViewer(),{signal:ownSignal});
  viewer.previous.addEventListener('click',()=>step(-1),{signal:ownSignal});viewer.next.addEventListener('click',()=>step(1),{signal:ownSignal});
  dialog.querySelector('[data-viewer-retry]').addEventListener('click',()=>loadViewer({retry:true}),{signal:ownSignal});
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeViewer();},{signal:ownSignal});
  dialog.addEventListener('keydown',event=>{
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();step(event.key==='ArrowLeft'?-1:1);}
   if(event.key==='Tab'){
    const controls=[...dialog.querySelectorAll('button:not(:disabled)')].filter(button=>button.getClientRects().length);
    const first=controls[0],last=controls.at(-1);
    if(first&&event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus({preventScroll:true});}
    else if(last&&!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus({preventScroll:true});}
   }
  },{signal:ownSignal});
  dialog.addEventListener('click',event=>{
   if(event.target!==dialog)return;
   const bounds=dialog.getBoundingClientRect();
   if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeViewer();
  },{signal:ownSignal});
  dialog.addEventListener('close',()=>{
   if(dialog.open)return;
   stopAnimation();cancelRequest();closing=false;syncScrollLock();
   if(!disposed&&dialog.dataset.closeReason!=='navigate'&&opener?.isConnected&&!document.querySelector('dialog[open]'))opener.focus({preventScroll:true});
   opener=null;
  },{signal:ownSignal});
 }
 function openViewer(id,trigger){
  if(disposed||!album.includes(id))return;
  ensureViewer();stopAnimation();closing=false;
  document.querySelectorAll('dialog[open]').forEach(other=>{if(other===dialog)return;other.dataset.closeReason='navigate';other.close();});
  opener=trigger;selectedIndex=album.indexOf(id);dialog.dataset.closeReason='';loadViewer();
  if(!dialog.open)dialog.showModal();syncScrollLock();viewer.close.focus({preventScroll:true});
  if(!preference.matches&&typeof dialog.animate==='function'){
   const own=dialog.animate([{opacity:0},{opacity:1}],{duration:VIEWER_DURATION,easing:'ease-out'});
   animation=own;own.finished.then(()=>{if(animation===own)animation=null;},()=>{});
  }
 }
 root.addEventListener('click',event=>{
  const button=event.target.closest('button[data-photo-open],button[data-photo-select],button[data-photo-retry]');
  if(!button||!root.contains(button))return;
  event.preventDefault();
  if(retryPageImage(button))return;
  if(button.hasAttribute('data-photo-select')){const gallery=button.closest('[data-clinic-gallery]');if(gallery)selectGallery(gallery,button.dataset.photoSelect);}
  else if(button.hasAttribute('data-photo-open'))openViewer(button.dataset.photoOpen,button);
 },{signal:ownSignal});
 preference.addEventListener('change',()=>{if(!preference.matches)return;if(closing)finishClose();else stopAnimation();},{signal:ownSignal});
 root.querySelectorAll('[data-clinic-gallery]').forEach(gallery=>{
  const selected=gallery.querySelector('[data-gallery-open]')?.dataset.photoOpen||gallery.querySelector('[data-gallery-stage] img')?.dataset.clientPhotoImage||album[0];
  selectGallery(gallery,selected,{replace:false});
 });
 watchWithin(root);

 function dispose(){
  if(disposed)return;disposed=true;
  signal?.removeEventListener('abort',dispose);imageObserver?.disconnect();
  for(const image of [...observed.keys()])releaseImage(image);
  stopAnimation();cancelRequest({remove:true});
  if(dialog){dialog.dataset.closeReason='navigate';if(dialog.open)dialog.close();dialog.remove();}
  opener=null;abort.abort();syncScrollLock();
 }
 signal?.addEventListener('abort',dispose,{once:true});
 return dispose;
}

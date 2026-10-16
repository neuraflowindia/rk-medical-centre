import {homeReviewItems} from './home-review-data.mjs';
import {escapeHTML as e} from './model.mjs';
import {solidIcon} from './ui.js';

function initials(name){return name.trim().split(/\s+/u).slice(0,2).map(part=>Array.from(part)[0]||'').join('');}

function reviewCard(review,index){
 return `<div class="home-review-card" data-home-review-index="${index}"><figure class="home-review-surface"><figcaption class="home-review-identity"><span class="home-review-avatar" aria-hidden="true">${e(initials(review.name))}</span><span class="home-review-person"><strong>${e(review.name)}</strong><span class="home-review-context">Patient feedback</span></span><span class="home-review-quote" aria-hidden="true">${solidIcon('quote')}</span></figcaption><blockquote>${e(review.text)}</blockquote><div class="home-review-details"><span class="home-review-topic">${solidIcon(review.icon)}<span>${e(review.topic)}</span></span></div></figure></div>`;
}

export function homeReviews(){
 const count=homeReviewItems.length;
 const cards=homeReviewItems.map(reviewCard).join('');
 return `<div class="home-reviews" data-home-reviews><div class="home-review-tools"><span class="home-review-count">${solidIcon('quote')}<strong>${count} patient reviews</strong></span><button class="text-link home-review-toggle" type="button" data-home-review-toggle aria-expanded="false" aria-controls="home-review-list" aria-describedby="home-review-reading-hint">Read all ${count} reviews <span aria-hidden="true">↗</span></button><span class="home-review-accessible-note" id="home-review-reading-hint">Open all ${count} reviews in a list that stays still.</span></div><div class="home-review-viewport" data-home-review-viewport aria-hidden="true"><div class="home-review-track" data-home-review-track><div class="home-review-group" data-home-review-group>${cards}</div><div class="home-review-group" aria-hidden="true">${cards}</div></div></div><ol class="home-review-list home-review-list-collapsed" id="home-review-list" aria-label="All ${count} patient reviews">${homeReviewItems.map((review,index)=>`<li>${reviewCard(review,index)}</li>`).join('')}</ol></div>`;
}

// One component clock; every reason to pause is composed in sync().
// No click/arrow/drag action advances the continuously moving rail.
export function bindHomeReviews({signal,visible=true}={}){
 const root=document.querySelector('[data-home-reviews]');
 if(!root||signal?.aborted)return {setVisible(){},dispose(){}};
 const viewport=root.querySelector('[data-home-review-viewport]');
 const track=root.querySelector('[data-home-review-track]');
 const group=root.querySelector('[data-home-review-group]');
 const list=root.querySelector('#home-review-list');
 const toggle=root.querySelector('[data-home-review-toggle]');
 const readingHint=root.querySelector('#home-review-reading-hint');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const abort=new AbortController();
 let disposed=false,paneVisible=!!visible,intersecting=false,hovering=false,reading=false;
 let animation=null,duration=0,phase=0,resizeFrame=0,motionFailed=typeof track.animate!=='function';

 function rememberPhase(){
  if(animation&&duration>0){const time=Number(animation.currentTime);if(Number.isFinite(time))phase=((time%duration)+duration)%duration/duration;}
 }
 function stopAnimation(){rememberPhase();animation?.cancel();animation=null;}
 function isReading(){return reading||preference.matches||motionFailed;}
 function sync(){
  if(disposed)return;
  const active=document.activeElement;
  // Pointer-click focus must not keep the rail stopped after the mouse leaves.
  const focused=root.contains(active)&&active.matches(':focus-visible');
  const blockedByDialog=!!document.querySelector('dialog[open],#privacy-panel:not([hidden])');
  const play=paneVisible&&intersecting&&!document.hidden&&!hovering&&!focused&&!blockedByDialog&&!isReading();
  if(animation){if(play){if(animation.playState!=='running')animation.play();}else if(animation.playState!=='paused')animation.pause();}
 }
 function renderReading(){
  if(disposed)return;
  const open=isReading();
  viewport.hidden=open;
  list.classList.toggle('home-review-list-collapsed',!open);
  toggle.hidden=preference.matches||motionFailed;
  toggle.setAttribute('aria-expanded',String(open));
  toggle.innerHTML=`${open?'Show fewer reviews':`Read all ${homeReviewItems.length} reviews`} <span aria-hidden="true">${open?'↑':'↗'}</span>`;
  readingHint.textContent=open?'Return to the moving review cards.':`Open all ${homeReviewItems.length} reviews in a list that stays still.`;
  root.classList.toggle('home-reviews-reading',open);
  sync();
 }
 function rebuild(){
  resizeFrame=0;
  if(disposed||isReading())return;
  const distance=group.getBoundingClientRect().width;
  if(!Number.isFinite(distance)||distance<=0)return;
  stopAnimation();
  const speed=innerWidth<768?14:20;
  duration=distance/speed*1000;
  try{
   animation=track.animate([{transform:'translate3d(0,0,0)'},{transform:`translate3d(${-distance}px,0,0)`}],{duration,iterations:Infinity,easing:'linear'});
   animation.pause();animation.currentTime=phase*duration;sync();
  }catch{
   animation?.cancel();animation=null;motionFailed=true;renderReading();
  }
 }
 function scheduleRebuild(){if(!disposed&&!resizeFrame)resizeFrame=requestAnimationFrame(rebuild);}
 function onPreferenceChange(){renderReading();if(!isReading())scheduleRebuild();}
 function onEnter(event){if(event.pointerType==='mouse'||event.pointerType==='pen'){hovering=true;sync();}}
 function onLeave(){hovering=false;sync();}
 viewport.addEventListener('pointerenter',onEnter,{signal:abort.signal});
 viewport.addEventListener('pointerleave',onLeave,{signal:abort.signal});
 viewport.addEventListener('pointercancel',onLeave,{signal:abort.signal});
 root.addEventListener('focusin',sync,{signal:abort.signal});
 root.addEventListener('focusout',()=>queueMicrotask(sync),{signal:abort.signal});
 root.addEventListener('keydown',()=>queueMicrotask(sync),{signal:abort.signal});
 root.addEventListener('keyup',sync,{signal:abort.signal});
 root.addEventListener('pointerdown',()=>queueMicrotask(sync),{signal:abort.signal});
 document.addEventListener('visibilitychange',sync,{signal:abort.signal});
 preference.addEventListener('change',onPreferenceChange,{signal:abort.signal});
 toggle.addEventListener('click',()=>{reading=!reading;renderReading();if(!isReading())scheduleRebuild();},{signal:abort.signal});
 const observer=new IntersectionObserver(entries=>{if(disposed)return;for(const entry of entries)if(entry.target===viewport)intersecting=entry.isIntersecting;sync();},{threshold:0});
 observer.observe(viewport);
 const resizeObserver=new ResizeObserver(scheduleRebuild);
 resizeObserver.observe(viewport);resizeObserver.observe(group);
 const modalObserver=new MutationObserver(sync);
 modalObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','hidden']});
 document.fonts?.ready.then(scheduleRebuild,()=>{});

 function dispose(){
  if(disposed)return;disposed=true;
  cancelAnimationFrame(resizeFrame);resizeFrame=0;stopAnimation();
  observer.disconnect();resizeObserver.disconnect();modalObserver.disconnect();abort.abort();
  signal?.removeEventListener('abort',dispose);
 }
 signal?.addEventListener('abort',dispose,{once:true});
 renderReading();scheduleRebuild();
 return {setVisible(value){if(disposed)return;paneVisible=!!value;sync();},dispose};
}

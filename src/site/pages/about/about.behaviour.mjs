// About the clinic: the page's own behaviour. The shared parts on the page bind themselves
// (runtime/parts.mjs): the shelf's arrows, the call button, "All certificates", the closing.
// What is the page's own: a walk photograph opens large in the shared viewer dialog, with its
// step's words and the way to its neighbours.
// Everything added here stops when `signal` aborts; the file imports cleanly outside a browser.
import {walk} from '../../../clinic/page-content/about.mjs';
import {viewerStep} from '../../parts/certificate-frame/certificate-frame.behaviour.mjs';
import {walkSlide} from './about.mjs';

const ARROWS=Object.freeze({'-1':'[data-walk-previous]','1':'[data-walk-next]'});

/** The step a control or a slide names (pure): a whole number inside the walk, else the first step. */
export function stepIndex(value,total=walk.steps.length){
 const index=Number.parseInt(value,10);
 return Number.isInteger(index)&&index>=0&&index<total?index:0;
}
/** Which way a key moves through the photographs (pure): 1, -1, or 0 for any other key. */
export function keyDirection(key){
 return key==='ArrowRight'?1:key==='ArrowLeft'?-1:0;
}

/**
 * Open the viewer on one step of the walk. Previous and Next stop at either end (the arrow there
 * reads as unavailable); ← and → do the same; focus stays on the arrow that was pressed.
 * WAITING: request about-04 — this step-through repeats the certificate viewer's; it becomes one
 * call when the shared one accepts any slide.
 */
export function openWalkViewer(services,{index=0,trigger=null,signal}={}){
 const viewer=services?.viewer,total=walk.steps.length;
 if(!viewer||!total)return;
 let at=stepIndex(index,total);
 const arrow=direction=>viewer.content()?.querySelector(ARROWS[direction])||null;
 // Give the two arrows of the slide now in the viewer their state and their job.
 const wire=()=>{
  for(const direction of [-1,1]){
   const button=arrow(direction);
   if(!button)continue;
   button.disabled=viewerStep(at,direction,total)===at;
   button.addEventListener('click',()=>move(direction,true));
  }
 };
 const draw=()=>{
  const content=viewer.content();
  if(!content)return;
  content.innerHTML=walkSlide(at);wire();
 };
 const move=(direction,pressed=false)=>{
  const to=viewerStep(at,direction,total);
  if(to===at)return;
  at=to;draw();
  if(!pressed)return;
  // The pressed arrow was redrawn: give it the focus back, or its neighbour when it is now at an end.
  const same=arrow(direction),other=arrow(-direction);
  (same&&!same.disabled?same:other)?.focus?.();
 };
 viewer.open({title:walk.label,html:walkSlide(at),trigger});
 wire();
 const node=viewer.node();
 if(!node)return;
 const onKey=event=>{
  const direction=keyDirection(event.key);
  if(!direction)return;
  event.preventDefault();move(direction);
 };
 node.addEventListener('keydown',onKey,{signal});
 node.addEventListener('close',()=>node.removeEventListener('keydown',onKey),{once:true,signal});
}

export function bindAbout(root,{signal,services}={}){
 if(!root||!services?.viewer)return;
 for(const control of root.querySelectorAll('[data-view-step]')){
  const open=()=>openWalkViewer(services,{index:stepIndex(control.getAttribute('data-view-step')),trigger:control,signal});
  control.addEventListener('click',open,{signal});
  // For a pointer the photograph itself opens the same view; the button stays the one keyboard stop.
  control.closest('[data-step-photo]')?.querySelector('.photo-figure__frame')?.addEventListener('click',open,{signal});
 }
}

// About the clinic: the page's own behaviour. The shared parts on the page bind themselves
// (runtime/parts.mjs): the shelf's arrows, the call button, the certificates, the closing.
// What is the page's own: a walk photograph opens large in the shared viewer, with its step's
// words; the viewer's own step-through moves between the three (arrows, ← and →, flat ends).
// Everything added here stops when `signal` aborts; the file imports cleanly outside a browser.
import {walk} from '../../../clinic/page-content/about.mjs';
import {openViewerWalk} from '../../parts/certificate-frame/certificate-frame.behaviour.mjs';
import {walkSlide} from './about.mjs';

/** The step a control names (pure): a whole number inside the walk, else the first step. */
export function stepIndex(value,total=walk.steps.length){
 const index=Number.parseInt(value,10);
 return Number.isInteger(index)&&index>=0&&index<total?index:0;
}

/** Open the shared viewer on one step of the walk. */
export function openWalkViewer(services,{index=0,trigger=null,signal}={}){
 openViewerWalk(services,{total:walk.steps.length,index:stepIndex(index),title:walk.label,draw:walkSlide,trigger,signal});
}

export function bindAbout(root,{signal,services}={}){
 if(!root||!services?.viewer)return;
 for(const control of root.querySelectorAll('[data-view-step]')){
  const open=()=>openWalkViewer(services,{index:control.getAttribute('data-view-step'),trigger:control,signal});
  control.addEventListener('click',open,{signal});
  // For a pointer the photograph itself opens the same view; the button stays the one keyboard stop.
  control.closest('[data-step-photo]')?.querySelector('.photo-figure__frame')?.addEventListener('click',open,{signal});
 }
}

// About the clinic: the page's own behaviour. The shared parts on the page bind themselves
// (runtime/parts.mjs): the shelf's arrows, the call button, the certificates, the closing.
// What is the page's own: a walk photograph opens large in the shared viewer, with its step's
// words; the viewer's own step-through moves between the three (arrows, ← and →, flat ends).
// And one of the two framed certificates opens all the certificates at itself, like the link below them.
// Everything added here stops when `signal` aborts; the file imports cleanly outside a browser.
import {walk} from '../../../clinic/page-content/about.mjs';
import {openCertificateViewer,openViewerWalk,viewerItems,viewerTitle} from '../../parts/certificate-frame/certificate-frame.behaviour.mjs';
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

/**
 * Open the viewer on every certificate, standing at the one with this id (the first, if the id
 * is unknown), headed as the whole set is headed everywhere.
 */
export function openAllCertificatesAt(services,{id='',trigger=null,signal}={}){
 const items=viewerItems();
 openCertificateViewer(services,{items,index:Math.max(0,items.findIndex(item=>item.id===id)),title:viewerTitle(),trigger,signal});
}

export function bindAbout(root,{signal,services}={}){
 if(!root||!services?.viewer)return;
 for(const control of root.querySelectorAll('[data-view-step]')){
  const open=()=>openWalkViewer(services,{index:control.getAttribute('data-view-step'),trigger:control,signal});
  control.addEventListener('click',open,{signal});
  // For a pointer the photograph itself opens the same view; the button stays the one keyboard stop.
  control.closest('[data-step-photo]')?.querySelector('.photo-figure__frame')?.addEventListener('click',open,{signal});
 }
 // WAITING: request about-09 — a shared frame opens "its wall's documents", which here would be
 // two under the heading "All certificates". Until the frame takes a set of its own, this page
 // hears the click first (on the way down to the frame) and opens the ten itself.
 root.querySelector('[data-about-documents]')?.addEventListener('click',event=>{
  const control=event.target?.closest?.('[data-view-certificate]');
  if(!control)return;
  event.stopPropagation();
  openAllCertificatesAt(services,{id:control.getAttribute('data-view-certificate'),trigger:control,signal});
 },{signal,capture:true});
}

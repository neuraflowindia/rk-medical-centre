// The certificate viewer: one shared dialog. A framed document marked as a control opens it on
// itself; "All certificates" opens it on the whole catalogue. Arrow keys and the two round
// buttons move between documents.
import {certificateCatalogue} from '../../../clinic/certificate-catalogue.mjs';
import {doctors} from '../../../clinic/model.mjs';
import {certificateViewer} from './certificate-frame.mjs';

export const viewerWords=Object.freeze({all:'All certificates',of:name=>`Certificates of ${name}`});

/** Which document a move lands on (pure): it stops at either end rather than wrapping. */
export function viewerStep(index,direction,total){
 if(total<=0)return -1;
 return Math.max(0,Math.min(total-1,index+direction));
}
/** The documents a viewer walks through (pure): one doctor's, or all ten. */
export function viewerItems(doctor='',catalogue=certificateCatalogue){
 return doctor?catalogue.filter(item=>item.doctor===doctor):[...catalogue];
}
/** The viewer's heading for a set (pure). */
export function viewerTitle(doctor=''){
 return doctor&&Object.hasOwn(doctors,doctor)?viewerWords.of(doctors[doctor].name):viewerWords.all;
}

/** How far a finger must travel sideways for a swipe to turn the page. */
export const SWIPE_MIN=40;
/**
 * Which way a finished touch turns the viewer (pure): 1 (next) for a swipe to the left, -1
 * (previous) for one to the right, 0 when the touch was short or mostly up and down.
 */
export function swipeDirection({dx=0,dy=0},min=SWIPE_MIN){
 if(Math.abs(dx)<min||Math.abs(dx)<Math.abs(dy)*1.5)return 0;
 return dx<0?1:-1;
}

/**
 * Step through `total` slides in the viewer. `draw(index)` returns one slide's markup, with its own
 * [data-viewer-previous] / [data-viewer-next] buttons if there is more than one. The ends are flat
 * (no wrapping); ← and → move, and so does a sideways swipe; focus stays on the arrow that was pressed.
 */
export function openViewerWalk(services,{total,index=0,title='',draw,trigger=null,signal}={}){
 if(!services?.viewer||!(total>0)||typeof draw!=='function')return;
 let at=Math.max(0,Math.min(total-1,index));
 const arrow=direction=>services.viewer.content()?.querySelector(direction<0?'[data-viewer-previous]':'[data-viewer-next]');
 const paint=()=>{
  const content=services.viewer.content();
  if(!content)return;
  content.innerHTML=draw(at);
  const previous=arrow(-1),next=arrow(1);
  if(previous){previous.disabled=at===0;previous.addEventListener('click',()=>move(-1));}
  if(next){next.disabled=at===total-1;next.addEventListener('click',()=>move(1));}
 };
 const move=direction=>{
  const to=viewerStep(at,direction,total);
  if(to===at)return;
  const focused=arrow(direction)===services.viewer.node()?.ownerDocument?.activeElement;
  at=to;paint();
  if(focused){const again=arrow(direction);(again&&!again.disabled?again:services.viewer.content()?.querySelector('button:not(:disabled)'))?.focus();}
 };
 services.viewer.open({title,html:draw(at),trigger});
 paint();
 const node=services.viewer.node();
 const onKey=event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}else if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}};
 let touch=null;
 const point=event=>event.changedTouches?.[0]||null;
 const onTouchStart=event=>{const first=point(event);touch=first&&(event.touches?.length??1)===1?{x:first.clientX,y:first.clientY}:null;};
 const onTouchEnd=event=>{
  const last=point(event);
  if(!touch||!last)return;
  const direction=swipeDirection({dx:last.clientX-touch.x,dy:last.clientY-touch.y});touch=null;
  if(direction)move(direction);
 };
 node?.addEventListener('keydown',onKey,{signal});
 node?.addEventListener('touchstart',onTouchStart,{signal,passive:true});
 node?.addEventListener('touchend',onTouchEnd,{signal,passive:true});
 node?.addEventListener('close',()=>{node.removeEventListener('keydown',onKey);node.removeEventListener('touchstart',onTouchStart);node.removeEventListener('touchend',onTouchEnd);},{once:true});
}

/** Open the viewer on certificates `items` at `index`. */
export function openCertificateViewer(services,{items,index=0,title=viewerWords.all,trigger=null,signal}={}){
 if(!items?.length)return;
 openViewerWalk(services,{total:items.length,index,title,draw:at=>certificateViewer(items,at),trigger,signal});
}

/**
 * What a framed document opens (pure): `set` 'all' = every certificate, standing at this one;
 * otherwise the documents of its own wall (`wallIds`), headed by their doctor if they share one.
 */
export function viewerPlan({id,set='',wallIds=[]},catalogue=certificateCatalogue){
 if(set==='all'){
  const items=viewerItems('',catalogue);
  return {items,index:Math.max(0,items.findIndex(item=>item.id===id)),title:viewerTitle()};
 }
 const items=wallIds.map(wanted=>catalogue.find(item=>item.id===wanted)).filter(Boolean);
 return {items,index:Math.max(0,items.findIndex(item=>item.id===id)),title:viewerTitle(items.length&&items.every(item=>item.doctor===items[0].doctor)?items[0].doctor:'')};
}

export function bindCertificates(root,{signal,services}={}){
 if(!services?.viewer)return;
 const plain=event=>!(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0);
 // "All certificates": a link to Meet the doctors that, with scripts, opens the viewer instead.
 for(const opener of root.querySelectorAll('[data-open-certificates]')){
  opener.addEventListener('click',event=>{
   if(!plain(event))return;
   const doctor=opener.getAttribute('data-open-certificates')||'';
   event.preventDefault();openCertificateViewer(services,{items:viewerItems(doctor),title:viewerTitle(doctor),trigger:opener,signal});
  },{signal});
 }
 // A framed document that is a control is printed as a link to its own picture (what it does
 // without scripts). Here it becomes the button that opens the viewer on itself.
 for(const control of root.querySelectorAll('[data-view-certificate]')){
  if(control.tagName==='A')control.setAttribute('role','button');
  control.setAttribute('aria-haspopup','dialog');
  const open=event=>{
   if(!plain(event))return;
   event.preventDefault();
   const wall=control.closest('[data-certificate-wall]')||root;
   const plan=viewerPlan({id:control.getAttribute('data-view-certificate'),set:control.getAttribute('data-view-set')||'',
    wallIds:[...wall.querySelectorAll('[data-view-certificate]')].map(item=>item.getAttribute('data-view-certificate'))});
   openCertificateViewer(services,{...plan,trigger:control,signal});
  };
  control.addEventListener('click',open,{signal});
  // a link turned button also answers the space bar
  control.addEventListener('keydown',event=>{if(event.key===' '&&control.tagName==='A')open(event);},{signal});
 }
}

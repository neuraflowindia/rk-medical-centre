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

/** Open the viewer on `items` at `index`. */
export function openCertificateViewer(services,{items,index=0,title=viewerWords.all,trigger=null,signal}={}){
 if(!services?.viewer||!items?.length)return;
 let at=Math.max(0,Math.min(items.length-1,index));
 const draw=()=>{
  const content=services.viewer.content();
  if(!content)return;
  content.innerHTML=certificateViewer(items,at);
  const previous=content.querySelector('[data-viewer-previous]'),next=content.querySelector('[data-viewer-next]');
  if(previous){previous.disabled=at===0;previous.addEventListener('click',()=>move(-1));}
  if(next){next.disabled=at===items.length-1;next.addEventListener('click',()=>move(1));}
 };
 const move=direction=>{
  const to=viewerStep(at,direction,items.length);
  if(to===at)return;
  const focused=services.viewer.content()?.querySelector(direction<0?'[data-viewer-previous]':'[data-viewer-next]')===services.viewer.node()?.ownerDocument?.activeElement;
  at=to;draw();
  if(focused){const again=services.viewer.content()?.querySelector(direction<0?'[data-viewer-previous]':'[data-viewer-next]');(again&&!again.disabled?again:services.viewer.content()?.querySelector('button:not(:disabled)'))?.focus();}
 };
 services.viewer.open({title,html:certificateViewer(items,at),trigger});
 draw();
 const node=services.viewer.node();
 const onKey=event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}else if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}};
 node?.addEventListener('keydown',onKey,{signal});
 node?.addEventListener('close',()=>node.removeEventListener('keydown',onKey),{once:true});
}

export function bindCertificates(root,{signal,services}={}){
 if(!services?.viewer)return;
 // "All certificates": a link to Meet the doctors that, with scripts, opens the viewer instead.
 for(const opener of root.querySelectorAll('[data-open-certificates]')){
  opener.addEventListener('click',event=>{
   if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0)return;
   const doctor=opener.getAttribute('data-open-certificates')||'';
   event.preventDefault();openCertificateViewer(services,{items:viewerItems(doctor),title:viewerTitle(doctor),trigger:opener,signal});
  },{signal});
 }
 // A framed document that is a control opens the viewer on itself, among its wall's documents.
 for(const control of root.querySelectorAll('[data-view-certificate]')){
  control.addEventListener('click',()=>{
   const wall=control.closest('[data-certificate-wall]')||root;
   const ids=[...wall.querySelectorAll('[data-view-certificate]')].map(item=>item.getAttribute('data-view-certificate'));
   const items=ids.map(id=>certificateCatalogue.find(item=>item.id===id)).filter(Boolean);
   openCertificateViewer(services,{items,index:Math.max(0,ids.indexOf(control.getAttribute('data-view-certificate'))),
    title:viewerTitle(items.every(item=>item.doctor===items[0]?.doctor)?items[0]?.doctor:''),trigger:control,signal});
  },{signal});
 }
}

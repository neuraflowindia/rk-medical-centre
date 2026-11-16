// One place that opens and closes the site's dialogs: the reader, the menu, the certificate
// viewer and the call sheet (phone) / call panel (laptop). Parts ask through `services`.
import {bindDialog} from '../../../clinic/dialog.js';
import {callSheet as callWords} from '../../../clinic/page-content/shared.mjs';
import {menuLinks} from '../menu/menu.mjs';
import {callSheet} from '../action-bar/action-bar.mjs';

export function createSheets({documentObject=document,motion=null}={}){
 const find=id=>documentObject.querySelector('#'+id);
 const nodes={reader:find('reader'),menu:find('menu'),viewer:find('viewer'),call:find('call-sheet')};
 const controllers=Object.fromEntries(Object.entries(nodes).filter(([,node])=>node).map(([name,node])=>[name,bindDialog(node,{motion})]));
 const opener=new Map();
 const remember=(name,trigger)=>{
  const node=nodes[name];if(!node)return;
  opener.get(name)?.setAttribute?.('aria-expanded','false');
  if(trigger?.hasAttribute?.('aria-expanded')){trigger.setAttribute('aria-expanded','true');opener.set(name,trigger);}
 };
 for(const [name,node] of Object.entries(nodes)){
  node?.addEventListener('close',()=>{opener.get(name)?.setAttribute?.('aria-expanded','false');opener.delete(name);});
 }

 const reader=Object.freeze({
  /** Show a titled reader. `html` is ready markup; `label` adds a class for the kind of content. */
  open({title,html,trigger=null,kind=''}){
   if(!nodes.reader)return;
   find('reader-title').textContent=title;
   const content=find('reader-content');content.innerHTML=html;content.scrollTop=0;
   nodes.reader.setAttribute('data-kind',kind);
   remember('reader',trigger);controllers.reader.open({focusHeading:true});
  },
  close:reason=>controllers.reader?.close(reason),
  content:()=>find('reader-content'),
  node:()=>nodes.reader
 });
 const menu=Object.freeze({
  open({trigger=null}={}){if(!nodes.menu)return;remember('menu',trigger);controllers.menu.open();},
  close:reason=>controllers.menu?.close(reason),
  node:()=>nodes.menu
 });
 const viewer=Object.freeze({
  open({title,html,trigger=null}){
   if(!nodes.viewer)return;
   find('viewer-title').textContent=title;find('viewer-content').innerHTML=html;
   remember('viewer',trigger);controllers.viewer.open({focusHeading:true});
  },
  close:reason=>controllers.viewer?.close(reason),
  content:()=>find('viewer-content'),
  node:()=>nodes.viewer
 });
 const call=Object.freeze({
  /** Open the call sheet; `doctor` points at that doctor's row. */
  open({doctor='',trigger=null}={}){
   if(!nodes.call)return;
   for(const row of nodes.call.querySelectorAll('[data-call-row]'))row.classList.toggle('is-pointed',!!doctor&&row.getAttribute('data-call-row')===doctor);
   remember('call',trigger);controllers.call.open();
   if(doctor)nodes.call.querySelector(`[data-call-row="${doctor}"]`)?.focus({preventScroll:true});
  },
  close:reason=>controllers.call?.close(reason),
  node:()=>nodes.call
 });

 return Object.freeze({reader,menu,viewer,call,
  /** Redraw what depends on the page: the menu's links and the call sheet's rows. */
  refresh(ctx){
   const links=find('menu-links');if(links)links.innerHTML=menuLinks(ctx);
   const rows=find('call-sheet-content');if(rows)rows.innerHTML=callSheet(ctx);
   const title=find('call-title');if(title&&title.textContent!==callWords.title)title.textContent=callWords.title;
  },
  closeAll(reason='navigate'){for(const controller of Object.values(controllers))controller.close(reason);}
 });
}

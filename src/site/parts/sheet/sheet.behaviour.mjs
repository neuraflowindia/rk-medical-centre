// One place that opens and closes the site's dialogs: the reader, the menu, the certificate
// viewer and the call sheet (phone) / call panel (laptop). Parts ask through `services`.
import {bindDialog} from '../../../clinic/dialog.js';
import {callSheet as callWords} from '../../../clinic/page-content/shared.mjs';
import {menuLinks} from '../menu/menu.mjs';
import {callSheet} from '../action-bar/action-bar.mjs';

export function createSheets({documentObject=document}={}){
 const find=id=>documentObject.querySelector('#'+id);
 const nodes={reader:find('reader'),menu:find('menu'),viewer:find('viewer'),call:find('call-sheet')};
 const controllers=Object.fromEntries(Object.entries(nodes).filter(([,node])=>node).map(([name,node])=>[name,bindDialog(node,{documentObject})]));
 const openers=new Map();
 // A control that says whether its sheet is open (the menu button) is kept true to the sheet.
 const remember=(name,trigger)=>{
  openers.get(name)?.setAttribute('aria-expanded','false');openers.delete(name);
  if(trigger?.hasAttribute?.('aria-expanded')){trigger.setAttribute('aria-expanded','true');openers.set(name,trigger);}
 };
 for(const [name,node] of Object.entries(nodes)){
  node?.addEventListener('close',()=>{
   openers.get(name)?.setAttribute('aria-expanded','false');openers.delete(name);
   for(const pointed of node.querySelectorAll('.is-pointed'))pointed.classList.remove('is-pointed');
  });
 }
 const setText=(id,words)=>{const node=find(id);if(node&&node.textContent!==words)node.textContent=words;};

 const reader=Object.freeze({
  /** Show a titled reader. `html` is ready markup; `kind` names the content ("reviews" gets the tall sheet). */
  open({title,html,trigger=null,kind='notice'}){
   if(!nodes.reader)return;
   setText('reader-title',title);
   const content=find('reader-content');content.innerHTML=html;content.scrollTop=0;
   nodes.reader.setAttribute('data-kind',kind);
   remember('reader',trigger);controllers.reader.open({focusHeading:true,trigger});
  },
  close:reason=>controllers.reader?.close(reason),
  content:()=>find('reader-content'),
  setTitle:title=>setText('reader-title',title),
  node:()=>nodes.reader
 });
 const menu=Object.freeze({
  open({trigger=null}={}){if(!nodes.menu)return;remember('menu',trigger);controllers.menu.open({trigger});},
  close:reason=>controllers.menu?.close(reason),
  node:()=>nodes.menu
 });
 const viewer=Object.freeze({
  open({title,html,trigger=null}){
   if(!nodes.viewer)return;
   setText('viewer-title',title);find('viewer-content').innerHTML=html;
   remember('viewer',trigger);controllers.viewer.open({focusHeading:true,trigger});
  },
  close:reason=>controllers.viewer?.close(reason),
  content:()=>find('viewer-content'),
  node:()=>nodes.viewer
 });
 const call=Object.freeze({
  /** Open the call sheet; `doctor` points at that doctor's row. */
  open({doctor='',trigger=null}={}){
   if(!nodes.call)return;
   remember('call',trigger);controllers.call.open({trigger});
   const row=doctor?nodes.call.querySelector(`[data-call-row="${doctor}"]`):null;
   if(row){row.classList.add('is-pointed');row.focus({preventScroll:true});}
  },
  close:reason=>controllers.call?.close(reason),
  node:()=>nodes.call
 });

 return Object.freeze({reader,menu,viewer,call,
  /** Redraw what depends on the page: the menu's links and the call sheet's rows. */
  refresh(ctx){
   const links=find('menu-links');if(links)links.innerHTML=menuLinks(ctx);
   const rows=find('call-sheet-content');if(rows)rows.innerHTML=callSheet(ctx);
   setText('call-title',callWords.title);
  },
  closeAll(reason='navigate'){for(const controller of Object.values(controllers))controller.close(reason);},
  anyOpen:()=>Object.values(controllers).some(controller=>controller.isOpen())
 });
}

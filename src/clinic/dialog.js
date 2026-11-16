// One controller per <dialog>: open it as a modal, close it by its own button, by Escape or by a
// tap on the dimmed page, and give focus back to whatever opened it. How a dialog arrives and
// leaves is drawn by the stylesheet (and follows the site's motion setting there); this file
// only decides what is open and where focus goes.
export function bindDialog(dialog,{documentObject=dialog.ownerDocument||globalThis.document}={}){
 const abort=new AbortController(),signal=abort.signal,root=documentObject.documentElement;
 let trigger=null,disposed=false;
 const mark=()=>root.classList.toggle('dialog-open',!!documentObject.querySelector('dialog[open]'));

 /** `reason` "navigate" closes without giving focus back (the page is changing). */
 function close(reason='dismiss'){
  if(!dialog.open)return;
  dialog.setAttribute('data-close-reason',reason);
  dialog.close();
 }
 for(const control of dialog.querySelectorAll('[data-close]'))control.addEventListener('click',()=>close(),{signal});
 // A tap on the dimmed page around the dialog closes it.
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();
 },{signal});
 dialog.addEventListener('close',()=>{
  mark();
  const reason=dialog.getAttribute('data-close-reason');
  if(reason!=='navigate'&&trigger?.isConnected)trigger.focus({preventScroll:true});
  trigger=null;
 },{signal});

 return Object.freeze({
  /**
   * Show the dialog. Focus goes to its heading (`focusHeading`, for dialogs that are read) or
   * to its close button; `trigger` is where focus returns afterwards (default: what has focus now).
   */
  open({focusHeading=false,trigger:from=null}={}){
   if(disposed||dialog.open)return;
   for(const other of documentObject.querySelectorAll('dialog[open]')){other.setAttribute('data-close-reason','navigate');other.close();}
   trigger=from||documentObject.activeElement;
   dialog.setAttribute('data-close-reason','');
   dialog.showModal();mark();
   (focusHeading?dialog.querySelector('h2'):dialog.querySelector('[data-close]'))?.focus({preventScroll:true});
  },
  close,
  isOpen:()=>dialog.open,
  dispose(){
   if(disposed)return;
   disposed=true;
   if(dialog.open){dialog.setAttribute('data-close-reason','navigate');dialog.close();}
   mark();abort.abort();
  }
 });
}

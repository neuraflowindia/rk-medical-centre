export function bindDialog(dialog){
 const abort=new AbortController(),signal=abort.signal,preference=matchMedia('(prefers-reduced-motion: reduce)');
 let trigger=null,closing=false,animation=null,disposed=false;
 const stop=()=>{animation?.cancel();animation=null;};
 const finishClose=()=>{stop();if(dialog.open)dialog.close();};
 function close(reason='dismiss'){
  if(!dialog.open)return;
  dialog.dataset.closeReason=reason;
  if(reason==='navigate'||preference.matches){closing=true;finishClose();return;}
  if(closing)return;
  closing=true;stop();
  const own=dialog.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(8px) scale(.98)'}],{duration:180,easing:'cubic-bezier(.32,.72,0,1)',fill:'forwards'});
  animation=own;own.finished.then(()=>{if(animation===own)finishClose();},()=>{});
 }
 dialog.querySelector('[data-close]').addEventListener('click',()=>close(),{signal});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();},{signal});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();},{signal});
 dialog.addEventListener('close',()=>{
  if(dialog.open)return; // Ignore a queued close event after an immediate reopen.
  closing=false;stop();document.documentElement.classList.toggle('dialog-open',!!document.querySelector('dialog[open]'));
  const reason=dialog.dataset.closeReason;dialog.dispatchEvent(new CustomEvent('restoring',{detail:reason}));
  if(reason!=='navigate'&&trigger?.isConnected)trigger.focus({preventScroll:true});
 },{signal});
 preference.addEventListener('change',()=>{if(preference.matches){if(closing)finishClose();else stop();}},{signal});
 return {
  open({focusHeading=false}={}){
   if(disposed)return;
   if(dialog.open){if(closing){stop();closing=false;dialog.dataset.closeReason='';}return;}
   document.querySelectorAll('dialog[open]').forEach(d=>{d.dataset.closeReason='navigate';d.close();});
   stop();trigger=document.activeElement;dialog.dataset.closeReason='';closing=false;dialog.showModal();document.documentElement.classList.add('dialog-open');
   (focusHeading?dialog.querySelector('h2'):dialog.querySelector('[data-close]'))?.focus({preventScroll:true});
   if(!preference.matches)animation=dialog.animate([{opacity:.2,transform:dialog.id==='menu'?'translateY(-32px) scale(.96)':'translateY(16px) scale(.96)'},{opacity:1,transform:'none'}],{duration:dialog.id==='menu'?300:260,easing:'cubic-bezier(.32,.72,0,1)'});
  },close,
  dispose(){if(disposed)return;disposed=true;const wasOpen=dialog.open;stop();dialog.dataset.closeReason='navigate';if(wasOpen)dialog.close();document.documentElement.classList.toggle('dialog-open',!!document.querySelector('dialog[open]'));if(wasOpen)dialog.dispatchEvent(new CustomEvent('restoring',{detail:'navigate'}));abort.abort();}
 };
}

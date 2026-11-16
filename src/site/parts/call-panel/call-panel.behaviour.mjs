// Every "Call" control on a page opens the same dialog: a bottom sheet on phones, a panel on
// laptops. A doctor's own Call button dials at once on a touch device (the number is the action)
// and opens the panel, pointing at that doctor's row, where a tel: link would be a dead end.

/** What a Call control should do (pure): 'dial' leaves the link alone, 'open' shows the sheet or panel. */
export function callAction({doctor='',touch=false}){
 return doctor&&touch?'dial':'open';
}

export function bindCallPanel(root,{signal,services,windowObject=globalThis.window}={}){
 if(!services?.call||!windowObject)return;
 // One listener for every Call control, wherever it is drawn (the page, the menu sheet).
 const everywhere=root.ownerDocument||root;
 const open=(event,opener)=>{
  const doctor=opener.getAttribute('data-open-call')||'';
  if(callAction({doctor,touch:windowObject.matchMedia('(hover: none)').matches})==='dial')return;
  event.preventDefault();
  // Opened from inside the menu, focus goes back to the menu button, not to a control that is gone.
  const inMenu=opener.closest('dialog'),trigger=inMenu?everywhere.querySelector('[data-open-menu]'):opener;
  services.call.open({doctor,trigger});
 };
 everywhere.addEventListener('click',event=>{
  const opener=event.target.closest?.('[data-open-call]');
  if(opener&&!event.defaultPrevented&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&!(event.button>0))open(event,opener);
 },{signal});
 everywhere.addEventListener('keydown',event=>{
  const opener=event.key===' '?event.target.closest?.('a[data-open-call]'):null;
  if(opener)open(event,opener);
 },{signal});
}

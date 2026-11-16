// Every "Call" control on a page opens the same dialog: a bottom sheet on phones, a panel on
// laptops. A doctor's own Call button dials at once on a touch device (the number is the action)
// and opens the panel, pointing at that doctor's row, where a tel: link would be a dead end.

/** What a Call control should do (pure): 'dial' leaves the link alone, 'open' shows the sheet or panel. */
export function callAction({doctor='',touch=false}){
 return doctor&&touch?'dial':'open';
}

export function bindCallPanel(root,{signal,services,windowObject=globalThis.window}={}){
 if(!services?.call||!windowObject)return;
 for(const opener of root.querySelectorAll('[data-open-call]')){
  opener.addEventListener('click',event=>{
   const doctor=opener.getAttribute('data-open-call')||'';
   if(callAction({doctor,touch:windowObject.matchMedia('(hover: none)').matches})==='dial')return;
   event.preventDefault();services.call.open({doctor,trigger:opener});
  },{signal});
 }
}

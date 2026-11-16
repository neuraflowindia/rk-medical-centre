// When the phone action bar shows. It must never double the page's own buttons or cover a
// dialog or the keyboard, so it is hidden: until the page's first main buttons have left the
// screen; over the closing section and the footer; on pages that ask for it late until their
// first screen has passed; and while any dialog or sheet is open.

/** Should the bar be shown (pure)? Every field is a plain fact about the page right now. */
export function barVisible({leadInView=false,leadPassed=true,closingInView=false,footerInView=false,dialogOpen=false,typing=false}){
 if(dialogOpen||typing)return false;
 if(leadInView||!leadPassed)return false;
 return !closingInView&&!footerInView;
}

export function bindActionBar(root,{signal,services,windowObject=globalThis.window}={}){
 const bar=root.querySelector('[data-action-bar]');
 if(!bar||!windowObject)return;
 const documentObject=windowObject.document;
 const Observer=windowObject.IntersectionObserver;
 const facts={leadInView:false,leadPassed:true,closingInView:false,footerInView:false,dialogOpen:false,typing:false};
 const lead=root.querySelector('[data-bar-lead]'),closing=root.querySelector('[data-closing]'),footer=root.querySelector('[data-site-footer]');
 const paint=()=>{
  facts.dialogOpen=!!documentObject.querySelector('dialog[open]');
  const typing=documentObject.activeElement;
  facts.typing=!!typing&&/^(INPUT|TEXTAREA|SELECT)$/.test(typing.tagName||'');
  const show=barVisible(facts);
  if(bar.classList.contains('is-shown')!==show){bar.classList.toggle('is-shown',show);bar.inert=!show;}
 };
 if(Observer){
  const observer=new Observer(entries=>{
   for(const entry of entries){
    if(entry.target===lead){facts.leadInView=entry.isIntersecting;facts.leadPassed=!entry.isIntersecting&&entry.boundingClientRect.bottom<=0;}
    else if(entry.target===closing)facts.closingInView=entry.isIntersecting;
    else if(entry.target===footer)facts.footerInView=entry.isIntersecting;
   }
   paint();
  },{threshold:0});
  if(lead){facts.leadInView=true;facts.leadPassed=false;observer.observe(lead);}
  if(closing)observer.observe(closing);
  if(footer)observer.observe(footer);
  signal?.addEventListener('abort',()=>observer.disconnect(),{once:true});
 }
 documentObject.addEventListener('focusin',paint,{signal});
 documentObject.addEventListener('focusout',paint,{signal});
 for(const dialog of documentObject.querySelectorAll('dialog')){dialog.addEventListener('toggle',paint,{signal});dialog.addEventListener('close',paint,{signal});}
 paint();
}

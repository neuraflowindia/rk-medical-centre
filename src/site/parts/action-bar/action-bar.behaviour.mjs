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
  if(bar.classList.contains('is-shown')!==show)bar.classList.toggle('is-shown',show);
  // A hidden bar must not be reachable by keyboard or assistive technology either.
  if(bar.inert===show)bar.inert=!show;
 };
 if(Observer){
  const watch=(node,onChange,rootMargin='0px')=>{
   if(!node)return;
   const observer=new Observer(entries=>{onChange(entries[entries.length-1]);paint();},{threshold:0,rootMargin});
   observer.observe(node);signal?.addEventListener('abort',()=>observer.disconnect(),{once:true});
  };
  // The page's own first buttons count as "in view" until they have left through the top edge.
  if(lead){facts.leadInView=true;facts.leadPassed=false;watch(lead,entry=>{facts.leadInView=entry.isIntersecting;facts.leadPassed=!entry.isIntersecting&&entry.boundingClientRect.top<=0;});}
  watch(closing,entry=>{facts.closingInView=entry.isIntersecting;},'0px 0px -22% 0px');
  watch(footer,entry=>{facts.footerInView=entry.isIntersecting;});
 }
 documentObject.addEventListener('focusin',paint,{signal});
 documentObject.addEventListener('focusout',paint,{signal});
 for(const dialog of documentObject.querySelectorAll('dialog')){dialog.addEventListener('toggle',paint,{signal});dialog.addEventListener('close',paint,{signal});}
 paint();
}

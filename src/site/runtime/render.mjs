// The whole visible app as text: icon sprite, header, <main>, the page, footer and the phone
// action bar. The same function prints the pages at build time (for both booking states) and
// draws them in the browser, so what a visitor sees first is what the script would draw.
import {sprite} from '../icons/icons.mjs';
import {siteHeader} from '../parts/site-header/site-header.mjs';
import {siteFooter} from '../parts/site-footer/site-footer.mjs';
import {actionBar} from '../parts/action-bar/action-bar.mjs';
import {suppressBookingLinks} from '../../clinic/booking-links.mjs';
import {pageFor} from './registry.mjs';

/** What every template receives: {path, mode: 'on' | 'off', now: Date, search: ''}. */
export function pageContext({path,mode,now=new Date(),search=''}){
 if(mode!=='on'&&mode!=='off')throw new RangeError('The booking state must be "on" or "off"');
 if(!(now instanceof Date)||Number.isNaN(now.getTime()))throw new RangeError('A page needs a valid time');
 pageFor(path);
 return Object.freeze({path,mode,now,search:String(search||'')});
}

/** The inside of `#app` for one page in one booking state. Exactly one <main>; the page brings the one <h1>. */
export function renderApp(ctx){
 const page=pageFor(ctx.path);
 return sprite()
  +siteHeader(ctx,{chrome:page.chrome})
  +`<main id="main" tabindex="-1" data-page="${page.id}">${page.render(ctx)}</main>`
  +siteFooter(ctx)
  +(page.chrome==='slim'?'':actionBar(ctx));
}

const bare=(html,name,when)=>when?html.replace(new RegExp(`\\s${name}(?=[\\s>])(?!\\s+hidden)`,'g'),` ${name} hidden inert`):html;
/**
 * Put markup into its booking state (contract 2.3): parts marked `data-booking-only` are hidden
 * and inert while booking is OFF, parts marked `data-booking-off-only` while it is ON, and while
 * OFF every booking link loses its address. Used for the built documents and again in the
 * browser for anything drawn after a page change.
 */
export function applyBookingMode(html,mode){
 const off=mode!=='on';
 let output=bare(html,'data-booking-only',off);
 output=bare(output,'data-booking-off-only',!off);
 return off?suppressBookingLinks(output):output;
}

/**
 * Built documents only: until scripts run, a form posts nowhere dangerous and its controls
 * cannot be used. The runtime releases `data-unbound-control` once the page is bound.
 */
export function lockUnboundControls(html){
 return html.replace(/<form\b(?![^>]*\bmethod=)/g,'<form method="post"')
  .replace(/<(input|select|textarea)\b(?![^>]*\bdisabled\b)/g,'<$1 disabled data-unbound-control')
  .replace(/<button\b((?=[^>]*type="submit")(?![^>]*\bdisabled\b)[^>]*)>/g,'<button$1 disabled data-unbound-control>');
}

/** After a page is drawn: pictures that fail to load leave their frame instead of a broken mark. */
export function watchPictures(root,{signal}={}){
 for(const img of root.querySelectorAll('img')){
  if(img.complete&&!img.naturalWidth&&img.getAttribute('src'))img.classList.add('media-failed');
  else img.addEventListener('error',()=>img.classList.add('media-failed'),{signal,once:true});
 }
}

/** Controls printed disabled for the script-less document become usable once the page is bound. */
export function releaseControls(root){
 for(const control of root.querySelectorAll('[data-unbound-control]')){
  // The message form releases its own controls when its handlers are ready (contract 2.5).
  if(control.closest('[data-contact-form]'))continue;
  control.disabled=false;control.removeAttribute('data-unbound-control');
 }
}

/**
 * The browser side: swap the page inside `#app`, bind the shared parts and the page's own
 * behaviour, and stop everything of the previous page first. `parts` is the list of shared
 * behaviours (each `(root, {signal, ctx, services})`); they find their own markup or do nothing.
 */
export function createView({app,services,parts=[],booking,applyMetadata=()=>{},now=()=>new Date(),windowObject=window}){
 let scope=null,generation=0,current=null;
 function show(path,{first=false,search='',scroll=0}={}){
  generation++;scope?.abort();scope=new AbortController();
  const signal=scope.signal,mode=booking.enabled()?'on':'off';
  const ctx=pageContext({path,mode,now:now(),search});
  // The first page is the one the server printed: it is bound as it is, never drawn twice.
  const reuse=first&&app.getAttribute('data-rendered-path')===path;
  if(!reuse){
   app.innerHTML=applyBookingMode(renderApp(ctx),mode);
   app.setAttribute('data-rendered-path',path);app.setAttribute('data-display-mode',mode);
   windowObject.scrollTo(0,scroll);
  }
  const main=app.querySelector('#main'),heading=main?.querySelector('h1')||null;
  heading?.setAttribute('tabindex','-1');
  applyMetadata(path);
  const context=Object.freeze({signal,ctx,services});
  for(const bind of parts)bind(app,context);
  pageFor(path).bind?.(main,context);
  releaseControls(app);
  watchPictures(app,{signal});
  current=Object.freeze({path,ctx,main,heading,signal,generation,reused:reuse});
  return current;
 }
 return Object.freeze({show,current:()=>current,generation:()=>generation,stop(){scope?.abort();scope=null;}});
}

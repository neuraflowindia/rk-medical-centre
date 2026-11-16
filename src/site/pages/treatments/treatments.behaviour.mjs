// Treatments: the page's own behaviour. The shared parts on the page bind themselves (runtime/parts.mjs).
// Everything added here stops when `signal` aborts; the file imports cleanly outside a browser.
//
// One row is open at a time. Below 1024 px a row opens in place, directly under itself: the
// tapped row stays where the finger is (a row closing above it must not push it away), then the
// page moves just enough to show the panel's buttons. From 1024 px the open row's panel stands
// beside the index and one row is always chosen. The decisions are small pure functions; the
// wiring below only reads the page and applies them.
import {arrivalFor,rowById,rowIds,showingLabel} from '../../../clinic/page-content/treatments.mjs';

/** From this width the open row's panel stands beside the index (the stylesheet's own breakpoint). */
export const PAIRED_FROM=1024;
/** Space kept clear under the header, and above the lower edge of the screen, when a row is brought into view. */
export const CLEARANCE=Object.freeze({top:12,bottom:16,bar:32});

/** Is the panel beside the index at this window width? */
export function paired(width){return Number.isFinite(width)&&width>=PAIRED_FROM;}

/**
 * Which row is open after the visitor chooses one (pure).
 * Beside the index one row is always chosen; in place, choosing the open row closes it.
 */
export function nextOpen({current=null,chosen,beside=false}){
 if(!rowIds.includes(chosen))return current;
 if(beside)return chosen;
 return chosen===current?null:chosen;
}

/**
 * Which row is open when the page is first bound (pure): the one the address asks for, else the
 * one the page was drawn with, else (beside the index only) the first.
 */
export function startingRow({arrival=null,drawn=null,beside=false}){
 if(rowIds.includes(arrival))return arrival;
 if(rowIds.includes(drawn))return drawn;
 return beside?rowIds[0]:null;
}

/**
 * How far to scroll after a row has opened in place (pure). All positions are measured from the
 * top of the screen. Positive moves the page up (scrolls down).
 *   rowTop          the opened row's top edge
 *   panelBottom     the lower edge of its panel
 *   viewportHeight  the screen's height
 *   topLine         the lowest point the header covers, plus a little air
 *   bottomReserve   what the lower edge of the screen hides (the phone action bar), plus a little air
 * A row hidden under the header comes down to the top line. Otherwise the page moves up only as
 * far as the panel needs, and never so far that the row itself would go under the header.
 */
export function revealScroll({rowTop,panelBottom,viewportHeight,topLine=0,bottomReserve=0}){
 if(![rowTop,panelBottom,viewportHeight,topLine,bottomReserve].every(Number.isFinite)||viewportHeight<=0)return 0;
 if(rowTop<topLine)return Math.round(rowTop-topLine);
 const over=panelBottom-(viewportHeight-bottomReserve);
 if(over<=0)return 0;
 return Math.round(Math.min(over,rowTop-topLine));
}

/**
 * How far to scroll after a row is chosen with its panel beside the index (pure). The panel keeps
 * to a line under the header; near the end of the index it is carried up past that line. Then the
 * page moves down just enough to bring the whole panel back. Negative moves the page down (scrolls up).
 */
export function besideScroll({panelTop,stickyLine}){
 if(![panelTop,stickyLine].every(Number.isFinite))return 0;
 return panelTop<stickyLine-1?Math.round(panelTop-stickyLine):0;
}

/** The address of the page with a row open ("/treatment#thyroid") or with none ("/treatment"). */
export function addressFor(pathname,row){return row?`${pathname}#${row}`:pathname;}

/** Did the address name its place with a query (the older links), which this page tidies into a #place? */
export function arrivedByQuery({search='',hash=''}){
 const byHash=arrivalFor({hash}),all=arrivalFor({search,hash});
 return !byHash.row&&!byHash.group&&!!(all.row||all.group);
}

const topOf=element=>element.getBoundingClientRect().top;

export function bindTreatments(root,{signal,ctx,services,windowObject=globalThis.window}={}){
 const index=root?.querySelector?.('[data-topics]');
 if(!index||!windowObject)return null;
 const documentObject=windowObject.document,{history,location}=windowObject;
 const items=new Map([...index.querySelectorAll('[data-topic]')].map(item=>[item.getAttribute('data-topic'),
  Object.freeze({item,row:item.querySelector('[data-topic-row]'),panel:item.querySelector('[data-topic-panel]')})]));
 const wide=windowObject.matchMedia?.(`(min-width: ${PAIRED_FROM}px)`);
 const beside=()=>wide?wide.matches:paired(windowObject.innerWidth);
 const motionAllowed=()=>services?.motion?.allowed?.()??false;
 let current=null;

 /** Put the page into the state "this row is open" (or none). `arriving` marks a row the visitor has just opened. */
 function apply(next,{arriving=false}={}){
  for(const [id,{item,row}] of items){
   const open=id===next;
   if(open)item.setAttribute('data-open','');else item.removeAttribute('data-open');
   if(open&&arriving)item.setAttribute('data-arriving','');else item.removeAttribute('data-arriving');
   row?.setAttribute('aria-expanded',open?'true':'false');
  }
  current=next;
 }

 /** After a row has opened in place: show its panel's buttons, without losing the row under the header. */
 function reveal(id){
  const entry=items.get(id);
  if(!entry?.row||!entry.panel)return 0;
  const header=documentObject.querySelector('.site-header'),bar=documentObject.querySelector('[data-action-bar]');
  const barShown=!!bar&&windowObject.getComputedStyle(bar).display!=='none';
  const by=revealScroll({rowTop:topOf(entry.row),panelBottom:entry.panel.getBoundingClientRect().bottom,viewportHeight:windowObject.innerHeight,
   topLine:(header?.offsetHeight||0)+CLEARANCE.top,bottomReserve:barShown?bar.offsetHeight+CLEARANCE.bar:CLEARANCE.bottom});
  if(by)windowObject.scrollBy({top:by,left:0,behavior:motionAllowed()?'smooth':'instant'});
  return by;
 }
 /** After a row has been chosen beside the index: bring its panel back whole if the end of the index has carried it up. */
 function revealBeside(id){
  const panel=items.get(id)?.panel;
  if(!panel)return 0;
  const by=besideScroll({panelTop:topOf(panel),stickyLine:Number.parseFloat(windowObject.getComputedStyle(panel).top)});
  if(by)windowObject.scrollBy({top:by,left:0,behavior:motionAllowed()?'smooth':'instant'});
  return by;
 }

 /** The visitor chose a row. */
 function choose(id){
  const side=beside(),next=nextOpen({current,chosen:id,beside:side});
  if(next===current)return current;
  const row=items.get(id)?.row,before=!side&&row?topOf(row):null;
  apply(next,{arriving:true});
  if(before!==null){
   // The row that closed may have been above this one: put the tapped row back under the finger.
   const moved=topOf(row)-before;
   if(Math.abs(moved)>.5)windowObject.scrollBy({top:moved,left:0,behavior:'instant'});
  }
  history.replaceState(history.state,'',addressFor(location.pathname,next));
  if(next){
   services?.announce?.(showingLabel(rowById(next).title));
   if(side)revealBeside(next);else reveal(next);
  }
  return current;
 }

 const arrival=arrivalFor({search:location.search,hash:location.hash});
 const drawn=index.querySelector('[data-topic][data-open]')?.getAttribute('data-topic')||null;
 apply(startingRow({arrival:arrival.row,drawn,beside:beside()}));
 // From here the page's own state decides what is open, not the address the browser arrived with.
 index.setAttribute('data-topics-bound','');

 if(arrivedByQuery({search:location.search,hash:location.hash})){
  // An older link (?topic=, ?service=, ?area=): tidy the address into the page's own place and
  // bring that place into view. Two frames, so it runs after the runtime has settled the new page.
  const place=arrival.row||arrival.group,target=documentObject.getElementById(place);
  history.replaceState(history.state,'',addressFor(location.pathname,place));
  const frame=callback=>windowObject.requestAnimationFrame(callback);
  if(target)frame(()=>frame(()=>{
   if(signal?.aborted)return;
   target.scrollIntoView({behavior:'instant',block:'start'});
   if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
   target.focus({preventScroll:true});
  }));
 }

 index.addEventListener('click',event=>{
  const row=event.target?.closest?.('[data-topic-row]');
  if(!row||event.defaultPrevented||event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  // The row is a link to its own place; with scripts the page opens it here instead.
  event.preventDefault();
  choose(row.closest('[data-topic]')?.getAttribute('data-topic'));
 },{signal});

 // Turning a phone, or widening a window: beside the index a row must always be chosen.
 const onWidth=()=>{if(beside()&&!current)apply(startingRow({beside:true}));};
 wide?.addEventListener?.('change',onWidth,{signal});

 return Object.freeze({choose,open:()=>current,reveal});
}

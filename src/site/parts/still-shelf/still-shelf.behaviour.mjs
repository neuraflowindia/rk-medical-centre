// Moving a shelf. The decisions are pure; the wiring reads the row's real sizes.

/**
 * Where the row should scroll to for one step (pure). `direction` is 1 (next) or -1 (previous);
 * a step is one card and its gap, never past either end.
 */
export function shelfStep({scrollLeft,step,max,direction}){
 const target=scrollLeft+direction*step;
 return Math.max(0,Math.min(max,Math.round(target)));
}
/** Which arrows are at an end and must read as unavailable (pure). */
export function shelfEnds({scrollLeft,max,slack=2}){
 return {atStart:scrollLeft<=slack,atEnd:scrollLeft>=max-slack};
}

/** Can the row not move at all (pure)? Then its arrows are not shown. */
export function shelfStill(max,slack=2){return max<=slack;}
/** Which card stands at the row's start (pure): the one whose left edge is nearest; the last one at the row's end. */
export function shelfIndex({lefts,start,scrollLeft,max,slack=2}){
 if(!lefts.length)return -1;
 if(max>0&&scrollLeft>=max-slack)return lefts.length-1;
 let best=0,distance=Infinity;
 lefts.forEach((left,index)=>{const gap=Math.abs(left-start);if(gap<distance){distance=gap;best=index;}});
 return best;
}

/** The last card that stands wholly inside the row's visible width, counted from `from` (pure). */
export function shelfLast({rights,end,from=0,slack=2}){
 let last=from;
 for(let index=from;index<rights.length;index++){if(rights[index]<=end+slack)last=index;else break;}
 return last;
}
/**
 * How far the row must move for a card to stand wholly in view (pure): negative moves it back,
 * positive on, 0 when it is already inside (or wider than the row, when its start is what counts).
 */
export function revealShift({itemLeft,itemRight,start,end,slack=1}){
 if(itemLeft<start-slack)return Math.round(itemLeft-start);
 if(itemRight>end+slack)return Math.round(Math.min(itemRight-end,itemLeft-start));
 return 0;
}
/**
 * Keep whatever takes the keyboard's focus inside a row wholly in view: the browser only brings
 * the focused control to the row's edge, which can leave its card half outside.
 */
export function keepFocusInView(row,{signal,smooth=()=>false}={}){
 if(!row)return;
 row.addEventListener('focusin',event=>{
  const target=event.target;
  if(!target||target===row)return;
  let card=target;
  while(card.parentElement&&card.parentElement!==row)card=card.parentElement;
  if(card.parentElement!==row)return;
  const style=globalThis.getComputedStyle?.(row),pad=parseFloat(style?.paddingLeft||'0')||0,padEnd=parseFloat(style?.paddingRight||'0')||pad;
  const box=row.getBoundingClientRect(),item=card.getBoundingClientRect();
  const shift=revealShift({itemLeft:item.left,itemRight:item.right,start:box.left+pad,end:box.right-padEnd});
  if(shift)row.scrollTo({left:Math.max(0,row.scrollLeft+shift),behavior:smooth()?'smooth':'instant'});
 },{signal});
}

/**
 * Wire one row and its two arrows. `item()` gives the card whose width is one step (default: the
 * row's first shown card); `onMove({index,last,total})` reports where the row stands (the first
 * and the last card wholly in view); `smooth()` says whether the move may glide. Returns
 * `refresh`, to call after the row's cards change.
 * A row that cannot move gives up its place in the keyboard's order (its cards keep theirs).
 */
export function bindShelf(row,{previous,next,signal,smooth=()=>true,item,onMove}={}){
 if(!row)return ()=>{};
 const shown=()=>[...row.children].filter(child=>!child.hidden);
 const style=()=>globalThis.getComputedStyle?.(row);
 const metrics=()=>{
  const card=item?.()||shown()[0],gap=parseFloat(style()?.columnGap||'0')||0;
  return {step:(card?.getBoundingClientRect().width||row.clientWidth)+gap,max:Math.max(0,row.scrollWidth-row.clientWidth)};
 };
 const refresh=()=>{
  const {max}=metrics(),ends=shelfEnds({scrollLeft:row.scrollLeft,max});
  if(previous)previous.disabled=ends.atStart;
  if(next)next.disabled=ends.atEnd;
  // When every card fits there is nothing to move: two dead arrows are worse than none.
  const arrows=previous?.parentElement,still=shelfStill(max);
  if(arrows&&arrows===next?.parentElement&&arrows.hidden!==still)arrows.hidden=still;
  if(still){if(row.hasAttribute('tabindex'))row.removeAttribute('tabindex');}
  else if(row.getAttribute('tabindex')!=='0')row.setAttribute('tabindex','0');
  if(onMove){
   const cards=shown(),box=row.getBoundingClientRect(),pad=parseFloat(style()?.paddingLeft||'0')||0,start=box.left+pad;
   const rects=cards.map(card=>card.getBoundingClientRect());
   const index=shelfIndex({lefts:rects.map(rect=>rect.left),start,scrollLeft:row.scrollLeft,max});
   onMove({index,last:index<0?-1:shelfLast({rights:rects.map(rect=>rect.right),end:box.right-(parseFloat(style()?.paddingRight||'0')||pad),from:index}),total:cards.length});
  }
 };
 const move=direction=>{
  const {step,max}=metrics();
  row.scrollTo({left:shelfStep({scrollLeft:row.scrollLeft,step,max,direction}),behavior:smooth()?'smooth':'instant'});
 };
 let waiting=false;
 const later=()=>{if(waiting)return;waiting=true;(globalThis.requestAnimationFrame||(run=>run()))(()=>{waiting=false;refresh();});};
 previous?.addEventListener('click',()=>move(-1),{signal});
 next?.addEventListener('click',()=>move(1),{signal});
 row.addEventListener('scroll',later,{passive:true,signal});
 globalThis.addEventListener?.('resize',later,{signal});
 row.addEventListener('keydown',event=>{
  if(event.target!==row)return;
  if(event.key==='ArrowRight'){event.preventDefault();move(1);}
  else if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
 },{signal});
 keepFocusInView(row,{signal,smooth});
 refresh();
 return refresh;
}

export function bindStillShelf(root,{signal,services}={}){
 for(const shelf of root.querySelectorAll('[data-still-shelf]')){
  bindShelf(shelf.querySelector('[data-shelf]'),{previous:shelf.querySelector('[data-shelf-previous]'),next:shelf.querySelector('[data-shelf-next]'),signal,smooth:()=>services?.motion?.allowed()??false});
 }
}

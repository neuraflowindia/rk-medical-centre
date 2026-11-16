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

/** Wire one row and its two arrows. Returns `refresh`, to call after the row's cards change. */
export function bindShelf(row,{previous,next,signal,smooth=()=>true}={}){
 if(!row)return ()=>{};
 const metrics=()=>{
  const first=row.firstElementChild,gap=parseFloat(globalThis.getComputedStyle?.(row).columnGap||'0')||0;
  return {step:(first?.getBoundingClientRect().width||row.clientWidth)+gap,max:Math.max(0,row.scrollWidth-row.clientWidth)};
 };
 const refresh=()=>{
  const {max}=metrics(),ends=shelfEnds({scrollLeft:row.scrollLeft,max});
  if(previous)previous.disabled=ends.atStart;
  if(next)next.disabled=ends.atEnd;
 };
 const move=direction=>{
  const {step,max}=metrics();
  row.scrollTo({left:shelfStep({scrollLeft:row.scrollLeft,step,max,direction}),behavior:smooth()?'smooth':'instant'});
 };
 previous?.addEventListener('click',()=>move(-1),{signal});
 next?.addEventListener('click',()=>move(1),{signal});
 row.addEventListener('scroll',refresh,{passive:true,signal});
 row.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'){event.preventDefault();move(1);}
  else if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}
 },{signal});
 refresh();
 return refresh;
}

export function bindStillShelf(root,{signal,services}={}){
 for(const shelf of root.querySelectorAll('[data-still-shelf]')){
  bindShelf(shelf.querySelector('[data-shelf]'),{previous:shelf.querySelector('[data-shelf-previous]'),next:shelf.querySelector('[data-shelf-next]'),signal,smooth:()=>services?.motion?.allowed()??false});
 }
}

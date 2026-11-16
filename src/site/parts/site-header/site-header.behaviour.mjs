// Header behaviour: open the menu; on phones slide the header away on the way down and bring it
// back on the way up; add a soft shadow once the page has moved.

/** Phones only: the header may leave once the page has moved this far. */
export const AWAY_AFTER=120;
/** It leaves after this much travel down … */
export const DOWN_TRAVEL=48;
/** … and returns after this much travel up, however slowly. */
export const UP_TRAVEL=24;

/**
 * Follow the scroll (pure). `state` is {y, down, up, away}: the last position, the unbroken travel
 * in each direction, and whether the header is away. Returns the next state for position `y`.
 * Travel is added up, so a slow drag brings the header back just as a quick one does.
 */
export function headerTravel(state,y,{phone=true,blocked=false}={}){
 const delta=y-state.y;
 let down=delta>0?state.down+delta:0,up=delta<0?state.up-delta:0,away=state.away;
 if(!phone||blocked||y<=AWAY_AFTER)away=false;
 else if(down>=DOWN_TRAVEL)away=true;
 else if(up>=UP_TRAVEL)away=false;
 if(delta===0){down=state.down;up=state.up;}
 return {y,down,up,away};
}

export function bindSiteHeader(root,{signal,services,windowObject=globalThis.window}={}){
 const header=root.querySelector('[data-site-header]');
 if(!header||!windowObject)return;
 const documentObject=windowObject.document,menuButton=header.querySelector('[data-open-menu]');
 const phone=windowObject.matchMedia('(max-width: 1023px)');
 if(menuButton&&services?.menu){
  menuButton.addEventListener('click',event=>{event.preventDefault();services.menu.open({trigger:menuButton});},{signal});
  menuButton.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();services.menu.open({trigger:menuButton});}},{signal});
  // The menu belongs to the phone layout: it closes if the window grows into the laptop one.
  phone.addEventListener('change',()=>{if(!phone.matches)services.menu.close('navigate');},{signal});
 }
 let state={y:windowObject.scrollY,down:0,up:0,away:false},ticking=false;
 const update=()=>{
  ticking=false;
  const blocked=documentObject.documentElement.classList.contains('dialog-open')||header.contains(documentObject.activeElement);
  state=headerTravel(state,windowObject.scrollY,{phone:phone.matches,blocked});
  header.classList.toggle('is-away',state.away);
  header.classList.toggle('is-scrolled',state.y>8);
 };
 const onScroll=()=>{if(!ticking){ticking=true;windowObject.requestAnimationFrame(update);}};
 windowObject.addEventListener('scroll',onScroll,{passive:true,signal});
 windowObject.addEventListener('resize',onScroll,{signal});
 header.addEventListener('focusin',onScroll,{signal});
 update();
}

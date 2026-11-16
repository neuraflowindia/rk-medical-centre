// Header behaviour: open the menu; on phones slide the header away on the way down and bring it
// back on the way up; add a soft shadow once the page has moved.

/** Phones only: the header leaves after this much scrolling down. */
export const AWAY_AFTER=120;
/** Ignore jitter smaller than this. */
export const SCROLL_SLACK=6;

/**
 * Should the header be away (pure)? `y` is the scroll position now, `last` the one before,
 * `away` the current state. It leaves only on phones, only while moving down past the start,
 * and returns as soon as the page moves up.
 */
export function headerAway({y,last,away,phone,blocked=false}){
 if(!phone||blocked||y<=AWAY_AFTER)return false;
 const delta=y-last;
 if(Math.abs(delta)<SCROLL_SLACK)return away;
 return delta>0;
}

export function bindSiteHeader(root,{signal,services,windowObject=globalThis.window}={}){
 const header=root.querySelector('[data-site-header]');
 if(!header||!windowObject)return;
 const menuButton=header.querySelector('[data-open-menu]');
 if(menuButton&&services?.menu){
  menuButton.addEventListener('click',event=>{event.preventDefault();services.menu.open({trigger:menuButton});},{signal});
  menuButton.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();services.menu.open({trigger:menuButton});}},{signal});
 }
 const phone=windowObject.matchMedia('(max-width: 1023px)');
 let last=windowObject.scrollY,away=false,ticking=false;
 const update=()=>{
  ticking=false;
  const y=windowObject.scrollY;
  const next=headerAway({y,last,away,phone:phone.matches,blocked:windowObject.document.documentElement.classList.contains('dialog-open')||header.contains(windowObject.document.activeElement)});
  if(Math.abs(y-last)>=SCROLL_SLACK)last=y;
  if(next!==away){away=next;header.classList.toggle('is-away',away);}
  header.classList.toggle('is-scrolled',y>8);
 };
 const onScroll=()=>{if(!ticking){ticking=true;windowObject.requestAnimationFrame(update);}};
 windowObject.addEventListener('scroll',onScroll,{passive:true,signal});
 update();
}

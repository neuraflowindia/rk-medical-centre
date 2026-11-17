// The booking page's own behaviour. The runtime mounts the booking screens inside
// `#clinic-booking-root` (runtime/booking-island.mjs); this file is for the page around them.
// Everything added here stops when `signal` aborts; the file imports cleanly outside a browser.

/**
 * The panel shown while the booking screens cannot be used carries one paper-cut object that
 * floats (`data-ambient="float"`). The panel is drawn after the page, and drawn again whenever its
 * state changes, so the motion module (which looks at a page once, when it is shown) is handed the
 * page again each time a new object appears. The module alone decides whether it moves: not while
 * motion is paused or the device asks for less, and never more loops than a view may hold.
 *   place    where the panel is drawn (`#clinic-booking-root`)
 *   page     what the motion module watches (the whole app)
 *   motion   the runtime's motion service
 * Returns a function that stops the watching.
 */
export function followPanelObject({place,page,motion,signal,Observer=globalThis.MutationObserver}={}){
 if(!place||!page||typeof motion?.observe!=='function'||typeof Observer!=='function')return ()=>{};
 let known=null;
 const look=()=>{
  const object=place.querySelector('[data-ambient]');
  if(object===known)return;
  known=object;
  if(object)motion.observe(page,{signal});
 };
 const watcher=new Observer(look);
 watcher.observe(place,{childList:true,subtree:true});
 const stop=()=>watcher.disconnect();
 signal?.addEventListener('abort',stop,{once:true});
 look();
 return stop;
}

/** Both booking addresses: `root` is the page's `<main>`. */
export function bindBooking(root,{signal,services}={}){
 if(typeof root?.querySelector!=='function')return;
 followPanelObject({place:root.querySelector('#clinic-booking-root'),page:root.closest?.('#app')||root,motion:services?.motion,signal});
}

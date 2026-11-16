// The booking screens are a separate, lazily loaded piece (contract 2.6). This module decides
// when it may be mounted inside `#clinic-booking-root`: only while booking is admitted. Until
// then, and if loading fails, the page shows its "unavailable" panel with the clinic's numbers.
import {bookingUnavailable} from '../pages/booking/booking.mjs';

const defaultLoad=()=>import('../../booking/clinic-booking.jsx');

/** Which words the unavailable panel shows (pure). */
export function unavailableState({checking=false,error=false}={}){
 return error?'error':checking?'checking':'unavailable';
}

export function createIsland({state,admissionAllowed,displayAllowed,draft,load=defaultLoad,panel=bookingUnavailable}){
 let current=null,mounted=false,pending=false,cleanup=null,turn=0,painted='';
 const admitted=()=>admissionAllowed(state.getSnapshot());

 function showUnavailable(error=false){
  if(!current)return;
  const snapshot=state.getSnapshot(),view=unavailableState({checking:snapshot.checking,error});
  const html=panel({state:view,doctor:draft.doctor});
  if(painted!==html){current.node.innerHTML=html;painted=html;}
  const retry=current.node.querySelector('[data-booking-retry]');
  if(retry){
   retry.disabled=view==='checking';
   retry.onclick=()=>{if(displayAllowed(state.getSnapshot()))ensure();else void state.refresh({force:true});};
  }
 }

 function ensure(){
  if(!current||mounted||pending||current.signal.aborted)return;
  if(!admitted()){showUnavailable();return;}
  pending=true;painted='';
  const mine=turn,{node,kind,signal}=current;
  node.innerHTML=panel({state:'opening',doctor:draft.doctor});
  load().then(module=>{
   if(signal.aborted||mine!==turn)return;
   pending=false;
   if(!admitted()){showUnavailable();return;}
   const mount=kind==='booking'?module.mountBooking:module.mountBookingDetails;
   const stop=kind==='booking'?mount(node,{draft,signal}):mount(node,{signal});
   mounted=true;if(typeof stop==='function')cleanup=stop;
  }).catch(()=>{
   if(signal.aborted||mine!==turn)return;
   pending=false;showUnavailable(true);
  });
 }

 const unsubscribe=state.subscribe(()=>{if(current&&!mounted&&!pending)ensure();});
 return Object.freeze({
  /** Start a booking screen inside `node`. `kind` is 'booking' or 'details'. */
  open(node,{kind,signal}){
   this.close();turn++;current={node,kind,signal};
   signal.addEventListener('abort',()=>{if(current?.signal===signal)this.close();},{once:true});
   ensure();
  },
  close(){cleanup?.();cleanup=null;mounted=false;pending=false;painted='';current=null;turn++;},
  ensure,
  status:()=>({open:!!current,mounted,pending}),
  dispose(){this.close();unsubscribe();}
 });
}

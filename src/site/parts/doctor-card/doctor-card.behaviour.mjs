// The chips of a doctor card as a radio group: one is always chosen, arrow keys move the choice,
// the answer under the chips changes in place and is announced, the object arrives, and the
// card's booking button carries the chosen concern to the booking screen.
import {setBookingAddress} from '../../../clinic/booking-links.mjs';
import {waitForPictures} from '../../../clinic/picture-readiness.mjs';

/** Which chip an arrow key moves to (pure). Returns the same index for any other key. */
export function nextChip(index,key,count){
 if(count<=0)return -1;
 if(key==='ArrowRight'||key==='ArrowDown')return (index+1)%count;
 if(key==='ArrowLeft'||key==='ArrowUp')return (index-1+count)%count;
 if(key==='Home')return 0;
 if(key==='End')return count-1;
 return index;
}

/** Bind one card. Returns `choose(index)` (used by tests and by anything that sets the chip from outside). */
export function bindDoctorCard(card,{signal,services}={}){
 const row=card.querySelector('[data-chip-row]'),chips=[...card.querySelectorAll('[data-chip]')];
 if(!row||!chips.length)return null;
 const answers=[...card.querySelectorAll('[data-answer]')],objects=[...card.querySelectorAll('[data-object]')];
 const live=card.querySelector('[data-chip-live]'),book=card.querySelector('[data-card-book]');
 let chosen=-1,turn=0;
 row.setAttribute('role','radiogroup');
 const choose=(index,{focus=false,announce=false}={})=>{
  if(index<0||index>=chips.length)return;
  const changed=index!==chosen;chosen=index;
  chips.forEach((item,at)=>{
   const on=at===index;
   item.setAttribute('role','radio');item.setAttribute('aria-checked',String(on));item.setAttribute('tabindex',on?'0':'-1');
   item.toggleAttribute('data-chosen',on);
  });
  const id=chips[index].getAttribute('data-chip-id');
  for(const answer of answers)answer.toggleAttribute('data-active',answer.getAttribute('data-answer')===id);
  if(book&&chips[index].hasAttribute('data-book-href'))setBookingAddress(book,chips[index].getAttribute('data-book-href'));
  if(focus)chips[index].focus();
  if(!changed)return;
  if(announce&&live){const words=answers.find(answer=>answer.hasAttribute('data-active'))?.querySelector('p')?.textContent||'';live.textContent=words;}
  // The words never wait for the picture: the object arrives once it has loaded.
  const object=objects.find(item=>item.getAttribute('data-object')===id),mine=++turn;
  for(const item of objects)if(item!==object){item.removeAttribute('data-active');item.removeAttribute('data-arriving');}
  if(!object)return;
  const show=()=>{if(mine!==turn||signal?.aborted)return;object.toggleAttribute('data-arriving',!!services?.motion?.allowed());object.setAttribute('data-active','');};
  if(object.loading==='lazy')object.loading='eager';
  waitForPictures([object],{signal,timeoutMs:4000}).then(show,show);
 };
 const start=Math.max(0,chips.findIndex(item=>item.hasAttribute('data-chosen')));
 chosen=start;choose(start);
 chips.forEach((item,index)=>{
  item.addEventListener('click',event=>{
   if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0)return;
   event.preventDefault();choose(index,{announce:true});
  },{signal});
  item.addEventListener('keydown',event=>{
   if(event.key===' '||event.key==='Enter'){event.preventDefault();choose(index,{announce:true});return;}
   const next=nextChip(index,event.key,chips.length);
   if(next!==index){event.preventDefault();choose(next,{focus:true,announce:true});}
  },{signal});
 });
 return choose;
}

export function bindDoctorCards(root,context={}){
 for(const card of root.querySelectorAll('[data-doctor-card]'))bindDoctorCard(card,context);
}

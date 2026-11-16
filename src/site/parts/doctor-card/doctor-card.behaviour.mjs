// The chips of a doctor card as a radio group: one is always chosen, arrow keys move the choice,
// and the answer under the chips changes in place. (Skeleton: the decision is here; the swap
// motion arrives with the finished card.)

/** Which chip an arrow key moves to (pure). Returns the same index for any other key. */
export function nextChip(index,key,count,{rtl=false}={}){
 if(count<=0)return -1;
 const forward=rtl?'ArrowLeft':'ArrowRight',back=rtl?'ArrowRight':'ArrowLeft';
 if(key===forward||key==='ArrowDown')return (index+1)%count;
 if(key===back||key==='ArrowUp')return (index-1+count)%count;
 if(key==='Home')return 0;
 if(key==='End')return count-1;
 return index;
}

export function bindDoctorCards(root,{signal}={}){
 for(const card of root.querySelectorAll('[data-doctor-card]')){
  const row=card.querySelector('[data-chip-row]'),chips=[...card.querySelectorAll('[data-chip]')],answers=[...card.querySelectorAll('[data-answer]')];
  if(!row||!chips.length)continue;
  row.setAttribute('role','radiogroup');
  const choose=(index,{focus=false}={})=>{
   chips.forEach((item,at)=>{
    const chosen=at===index;
    item.setAttribute('role','radio');item.setAttribute('aria-checked',String(chosen));item.setAttribute('tabindex',chosen?'0':'-1');
    item.toggleAttribute('data-chosen',chosen);
   });
   const id=chips[index].getAttribute('data-chip-id');
   for(const answer of answers)answer.hidden=answer.getAttribute('data-answer')!==id;
   if(focus)chips[index].focus();
  };
  choose(Math.max(0,chips.findIndex(item=>item.hasAttribute('data-chosen'))));
  chips.forEach((item,index)=>{
   item.addEventListener('click',event=>{event.preventDefault();choose(index);},{signal});
   item.addEventListener('keydown',event=>{
    if(event.key===' '){event.preventDefault();choose(index);return;}
    const next=nextChip(index,event.key,chips.length);
    if(next!==index){event.preventDefault();choose(next,{focus:true});}
   },{signal});
  });
 }
}

// Review shelf behaviour: the tabs choose which reviews stand on the shelf and which one leads;
// the arrows move the row; "Read more" (only where the words are cut short) and "Read all" open
// the reader, which holds every review in full under the same tabs.
import {allReviews,readerOrder,reviewFilterKeys,shelfLimits,shelfSelection} from '../../../clinic/review-list.mjs';
import {readMoreOf,reviewShelf as words,reviewsTitle,shelfPosition} from '../../../clinic/page-content/shared.mjs';
import {e} from '../../lib/html.mjs';
import {bindShelf} from '../still-shelf/still-shelf.behaviour.mjs';
import {reviewReader,readerList} from './review-shelf.mjs';

/** Which tab an arrow key moves to (pure). Returns the same index for any other key. */
export function nextTab(index,key,count){
 if(count<=0)return -1;
 if(key==='ArrowRight')return (index+1)%count;
 if(key==='ArrowLeft')return (index-1+count)%count;
 if(key==='Home')return 0;
 if(key==='End')return count-1;
 return index;
}

/** The ids the shelf shows for a tab, in order (pure). `own` is the shelf's own filter and limit. */
export function shelfPlan(filter,{own='all',limit=shelfLimits[own]}={}){
 const cap=filter===own?limit:Math.min(limit||Infinity,shelfLimits[filter]??limit);
 return shelfSelection(filter,Number.isFinite(cap)?cap:0).map(review=>review.id);
}

/** Mark the chosen tab of a tab list and point its panel at it. */
export function selectTab(list,filter){
 for(const item of list.querySelectorAll('[role="tab"]')){
  const on=item.getAttribute('data-filter')===filter;
  item.setAttribute('aria-selected',on?'true':'false');item.setAttribute('tabindex',on?'0':'-1');
  if(on){const panel=list.ownerDocument?.getElementById(item.getAttribute('aria-controls'));panel?.setAttribute('aria-labelledby',item.id);}
 }
}

/** Arrow keys, Home and End move between tabs; a click or a key chooses. */
export function wireTabs(list,onPick,{signal}={}){
 if(!list)return;
 const tabs=[...list.querySelectorAll('[role="tab"]')];
 tabs.forEach((item,index)=>{
  const pick=()=>{const filter=item.getAttribute('data-filter');selectTab(list,filter);onPick(filter);};
  item.addEventListener('click',pick,{signal});
  item.addEventListener('keydown',event=>{
   const to=nextTab(index,event.key,tabs.length);
   if(to===index)return;
   event.preventDefault();tabs[to].focus();tabs[to].click();
  },{signal});
 });
}

/** Put the cards of one tab on the shelf, in order; the rest stay in the page, out of the row. */
export function arrangeShelf(row,ids,{featured=true}={}){
 const cards=[...row.children],byId=new Map(cards.map(card=>[card.getAttribute('data-review'),card]));
 const shown=ids.map(id=>byId.get(id)).filter(Boolean),rest=cards.filter(card=>!shown.includes(card));
 shown.forEach((card,index)=>{card.hidden=false;card.classList.toggle('review-card--lead',featured&&index===0);});
 for(const card of rest){card.hidden=true;card.classList.remove('review-card--lead');}
 const order=[...shown,...rest];
 if(order.some((card,index)=>cards[index]!==card))row.append(...order);
 return shown;
}

/** "Read more" only where the words are cut short. Returns how many cards got one. */
export function markClamped(row,{onRead,signal}={}){
 let marked=0;
 for(const card of row.children){
  const words_=card.querySelector('.review-card__quote p'),existing=card.querySelector('.review-card__more');
  const clamped=!card.hidden&&!!words_&&words_.scrollHeight>words_.clientHeight+2;
  if(clamped&&!existing){
   const button=card.ownerDocument.createElement('button');
   button.type='button';button.className='text-link review-card__more';button.setAttribute('aria-haspopup','dialog');
   button.innerHTML=`${e(words.readMore)}<span class="visually-hidden"> ${e(readMoreOf(card.querySelector('.review-card__who strong')?.textContent||''))}</span>`;
   button.addEventListener('click',()=>onRead?.(card.getAttribute('data-review'),button),{signal});
   card.insertBefore(button,card.querySelector('.review-card__by'));
  }else if(!clamped&&existing)existing.remove();
  if(clamped)marked++;
 }
 return marked;
}

/** Open the reader on a tab, optionally pointing at one review. */
export function openReviewReader(services,{filter='all',filters=reviewFilterKeys,pointed='',trigger=null,signal}={}){
 const list=readerOrder(filter);
 services.reader.open({title:reviewsTitle(filter,list.length),html:reviewReader(list,{filter,filters,pointed}),kind:'reviews',trigger});
 const content=services.reader.content();
 if(!content)return;
 const show=next=>{
  const reviews=readerOrder(next),panel=content.querySelector('[data-reader-panel]');
  if(panel)panel.innerHTML=readerList(reviews,{filter:next});
  services.reader.setTitle?.(reviewsTitle(next,reviews.length));
  content.scrollTop=0;
 };
 wireTabs(content.querySelector('[data-reader-tabs]'),show,{signal});
 if(pointed){const item=content.querySelector('.is-pointed');if(item)content.scrollTop=Math.max(0,item.offsetTop-88);}
}

export function bindReviewShelf(root,{signal,services}={}){
 for(const shelf of root.querySelectorAll('[data-review-shelf]')){
  const row=shelf.querySelector('[data-shelf]');
  if(!row)continue;
  const own=shelf.getAttribute('data-review-shelf'),limit=Number(shelf.getAttribute('data-review-limit'))||0;
  const featured=shelf.getAttribute('data-review-featured')!=='false',count=shelf.querySelector('[data-shelf-count]');
  const filters=shelf.querySelector('[data-review-tabs]')?reviewFilterKeys:[own];
  const read=(pointed,trigger)=>services?.reader&&openReviewReader(services,{filter:filters.length>1?'all':own,filters,pointed,trigger,signal});
  const refresh=bindShelf(row,{previous:shelf.querySelector('[data-shelf-previous]'),next:shelf.querySelector('[data-shelf-next]'),signal,
   smooth:()=>services?.motion?.allowed()??false,
   item:()=>row.querySelector('.review-card:not(.review-card--lead):not([hidden])')||row.querySelector('.review-card:not([hidden])'),
   // where several cards stand in view at once, the count names them all ("3–5 of 8")
   onMove:({index,last,total})=>{if(count&&index>=0){const text=shelfPosition(index+1,total,Math.max(index,last)+1);if(count.textContent!==text)count.textContent=text;}}});
  const settle=()=>{markClamped(row,{onRead:read,signal});refresh();};
  const show=filter=>{arrangeShelf(row,shelfPlan(filter,{own,limit}),{featured});row.scrollLeft=0;settle();};
  wireTabs(shelf.querySelector('[data-review-tabs]'),show,{signal});
  shelf.querySelector('[data-open-reviews]')?.addEventListener('click',event=>{event.preventDefault();read('',event.currentTarget);},{signal});
  settle();
  // Line breaks change when the faces arrive and when the window changes: look again.
  shelf.ownerDocument?.fonts?.ready?.then(()=>{if(!signal?.aborted)settle();});
  let waiting=0;
  globalThis.addEventListener?.('resize',()=>{globalThis.clearTimeout?.(waiting);waiting=globalThis.setTimeout?.(()=>{if(!signal?.aborted)settle();},160);},{signal});
 }
}

/** Every review, for anything that needs the whole list. */
export const everyReview=allReviews;

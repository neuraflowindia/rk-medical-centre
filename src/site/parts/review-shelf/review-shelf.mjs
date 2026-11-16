// The review shelf: still cards the visitor moves, never the page. Every review of the shelf's
// filter is printed once; the tabs choose which cards show and which one leads as the large
// pull-quote. "Read all" opens the reader with every review in full.
import {reviewCounts,reviewFilterKeys,reviewFilterTokens,reviewsFor,shelfLimits,shelfOrder,shelfSelection,starFills} from '../../../clinic/review-list.mjs';
import {doctors} from '../../../clinic/model.mjs';
import {ratingSpoken,readAllReviewsLabel,reviewShelf as words,shelfPosition} from '../../../clinic/page-content/shared.mjs';
import {attrs,classes,oneOf,text} from '../../lib/html.mjs';
import {stars} from '../../icons/icons.mjs';
import {button,roundButton,tab} from '../button/button.mjs';

/** Stars, initials, name, area and topic: the same identity line on a card and in the reader. */
export function reviewStars(review,className='review-card__stars'){
 return `<p class="${className}" role="img" aria-label="${text(ratingSpoken(review.rating))}">${stars(starFills(review.rating))}</p>`;
}
export function reviewBy(review){
 return `<footer class="review-card__by"><span class="review-card__avatar" aria-hidden="true">${text(review.initials)}</span>`
  +`<span class="review-card__who"><strong>${text(review.name)}</strong><span>${text([review.locality,review.topic].filter(Boolean).join(' · '))}</span></span></footer>`;
}

/**
 * One review as a flat card (information, not a control).
 *   lead    true sets the quote larger, in the display italic, on the mustard wash
 *   hidden  true keeps the card in the page but out of the shelf (it belongs to another tab)
 */
export function reviewCard(review,{lead=false,hidden=false}={}){
 return `<li${attrs({class:classes('review-card',lead&&'review-card--lead'),'data-review':review.id,'data-review-filters':reviewFilterTokens(review),hidden})}>`
  +reviewStars(review)
  +`<blockquote class="review-card__quote"><p>${text(review.text)}</p></blockquote>`
  +reviewBy(review)+`</li>`;
}

/**
 *   filter    'all' · 'sanjay' · 'parul' — whose reviews the shelf holds (a profile shows its doctor's)
 *   limit     how many cards the shelf shows at once per tab (the reader always holds them all);
 *             default 8 for all, 6 for one doctor; 0 shows every one
 *   featured  true sets the first card as the large pull-quote
 *   tabs      true shows the All · Dr. Sanjay · Dr. Parul tabs (only with filter 'all')
 *   head      ready-made markup shown above the shelf, beside the tabs (a section head)
 *   id        a unique id when a page carries more than one shelf
 */
export function reviewShelf(ctx,{filter='all',limit=shelfLimits[filter],featured=true,tabs=filter==='all',head='',id='review-shelf'}={}){
 oneOf(filter,reviewFilterKeys,'review filter');
 const shown=shelfSelection(filter,limit),rest=shelfOrder(filter).filter(review=>!shown.includes(review));
 const tabList=tabs?`<div class="tabs review-shelf__tabs" role="tablist" aria-label="${text(words.tabsLabel)}" data-review-tabs data-needs-script>`
  +reviewFilterKeys.map(key=>tab({label:words.tabs[key],id:`${id}-tab-${key}`,controls:`${id}-panel`,selected:key===filter,attributes:{'data-filter':key}})).join('')+`</div>`:'';
 const cards=shown.map((review,index)=>reviewCard(review,{lead:featured&&index===0})).join('')+rest.map(review=>reviewCard(review,{hidden:true})).join('');
 return `<div${attrs({class:'review-shelf',id,'data-review-shelf':filter,'data-review-limit':String(limit),'data-review-featured':featured?'true':'false'})}>`
  +(tabList||head?`<div class="wrap review-shelf__head">${head}${tabList}</div>`:'')
  +`<div class="review-shelf__bleed" id="${id}-panel"${tabs?` role="tabpanel" aria-labelledby="${id}-tab-${filter}"`:''}>`
  +`<ul class="review-shelf__row" tabindex="0" aria-label="${text(words.shelfLabel)}" data-shelf>${cards}</ul></div>`
  +`<div class="wrap"><div class="review-shelf__controls">`
  +`<div class="review-shelf__arrows" data-needs-script>${roundButton({icon:'left',label:words.previous,attributes:{'data-shelf-previous':true}})}${roundButton({icon:'right',label:words.next,attributes:{'data-shelf-next':true}})}`
  +`<p class="review-shelf__count" aria-hidden="true" data-shelf-count>${text(shelfPosition(1,shown.length))}</p></div>`
  +button({label:readAllReviewsLabel(reviewCounts[filter]),variant:'second',className:'review-shelf__all',attributes:{'aria-haspopup':'dialog','data-open-reviews':filter,'data-needs-script':true}})
  +`</div></div></div>`;
}

/** The reader's contents for one tab: every review of that tab in full. `pointed` marks the one the visitor asked for. */
export function readerList(reviews,{pointed=''}={}){
 return `<ol class="review-reader__list" data-reader-list>`+reviews.map(review=>
  `<li${attrs({class:classes('review-reader__item',review.id===pointed&&'is-pointed'),id:`review-${review.id}`})}>`
  +`<div class="review-reader__top">${reviewStars(review)}${review.doctors.length?`<p class="review-reader__about"><span class="visually-hidden">${text(words.about)} </span>${text(review.doctors.map(id=>doctors[id].name).join(' and '))}</p>`:''}</div>`
  +`<blockquote class="review-reader__quote"><p>${text(review.text)}</p></blockquote>`+reviewBy(review)+`</li>`).join('')+`</ol>`;
}
/** The reader: its own tabs, then the list. `filters` are the tabs to offer (one filter: no tabs). */
export function reviewReader(reviews,{filter='all',filters=reviewFilterKeys,pointed=''}={}){
 const tabList=filters.length>1?`<div class="tabs review-reader__tabs" role="tablist" aria-label="${text(words.tabsLabel)}" data-reader-tabs>`
  +filters.map(key=>tab({label:words.tabs[key],count:reviewCounts[key],id:`reader-tab-${key}`,controls:'reader-panel',selected:key===filter,attributes:{'data-filter':key}})).join('')+`</div>`:'';
 return `<div class="review-reader">${tabList}<div${attrs({class:'review-reader__panel',id:'reader-panel',role:tabList?'tabpanel':null,'aria-labelledby':tabList?`reader-tab-${filter}`:null,tabindex:'0','data-reader-panel':true})}>${readerList(reviews,{pointed})}</div></div>`;
}

/** How many reviews a filter holds, for labels. */
export const reviewTotal=filter=>reviewsFor(filter).length;

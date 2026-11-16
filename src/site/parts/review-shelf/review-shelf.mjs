// The review shelf: still cards the visitor moves, never the page. Every review is printed once;
// the tabs show or hide cards. (Skeleton: plain markup; the finished shelf, its tabs and its
// reader arrive with the shared parts.)
import {allReviews,reviewCounts,reviewFilterKeys,reviewFilterTokens,reviewsFor,starFills} from '../../../clinic/review-list.mjs';
import {ratingSpoken,readAllReviewsLabel,reviewShelf as words} from '../../../clinic/page-content/shared.mjs';
import {attrs,classes,oneOf,text} from '../../lib/html.mjs';
import {stars} from '../../icons/icons.mjs';
import {button,tab} from '../button/button.mjs';

/** One review as a flat card. `lead: true` sets the quote larger, in the display italic. */
export function reviewCard(review,{lead=false}={}){
 return `<li${attrs({class:classes('review-card',lead&&'review-card--lead'),'data-review':review.id,'data-review-filters':reviewFilterTokens(review)})}>`
  +`<p class="review-card__stars" role="img" aria-label="${text(ratingSpoken(review.rating))}">${stars(starFills(review.rating))}</p>`
  +`<blockquote class="review-card__quote"><p>${text(review.text)}</p></blockquote>`
  +`<footer class="review-card__by"><span class="review-card__avatar" aria-hidden="true">${text(review.initials)}</span>`
  +`<span class="review-card__who"><strong>${text(review.name)}</strong><span>${text([review.locality,review.topic].filter(Boolean).join(' · '))}</span></span></footer></li>`;
}

/**
 *   filter    'all' · 'sanjay' · 'parul' — which reviews the shelf holds (a profile shows its doctor's)
 *   limit     how many cards the shelf prints (the reader always holds them all); 0 for every one
 *   featured  true sets the first card as the large pull-quote
 *   tabs      true shows the All · Dr. Sanjay · Dr. Parul tabs (only meaningful with filter 'all')
 */
export function reviewShelf(ctx,{filter='all',limit=8,featured=true,tabs=filter==='all',id='review-shelf'}={}){
 oneOf(filter,reviewFilterKeys,'review filter');
 const list=reviewsFor(filter),shown=limit>0?list.slice(0,limit):list;
 const tabList=tabs?`<div class="review-shelf__tabs" role="tablist" aria-label="${text(words.tabsLabel)}" data-review-tabs data-needs-script>`
  +reviewFilterKeys.map(key=>tab({label:words.tabs[key],id:`${id}-tab-${key}`,controls:`${id}-panel`,selected:key===filter,attributes:{'data-filter':key}})).join('')+`</div>`:'';
 return `<div${attrs({class:'review-shelf','data-review-shelf':filter,'data-review-limit':String(limit),'data-review-featured':featured?'true':'false'})}>${tabList}`
  +`<div class="review-shelf__bleed" id="${id}-panel"${tabs?` role="tabpanel" aria-labelledby="${id}-tab-${filter}"`:''}>`
  +`<ul class="review-shelf__row" tabindex="0" aria-label="${text(words.shelfLabel)}" data-shelf>${shown.map((review,index)=>reviewCard(review,{lead:featured&&index===0})).join('')}</ul></div>`
  +`<div class="review-shelf__controls">`
  +button({label:readAllReviewsLabel(reviewCounts[filter]),variant:'second',attributes:{'aria-haspopup':'dialog','data-open-reviews':filter,'data-needs-script':true}})
  +`</div></div>`;
}

/** Every review, for the reader. */
export const shelfReviews=allReviews;

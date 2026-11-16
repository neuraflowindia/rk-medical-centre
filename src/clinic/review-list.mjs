// One list of every patient review, for a review shelf that is rendered once.
//
// The words stay in content.mjs and the presentation details (rating, area, topic) stay in
// home-review-data.mjs; this module only merges them, gives each review a stable id, and works
// out which doctor filter it belongs to. A template renders `allReviews` a single time and the
// filter tabs show or hide cards by `doctors` — no second or third copy of the list.
// No markup lives in this file.
import {reviews} from './content.mjs';
import {reviewWithDetails} from './home-review-data.mjs';
import {doctors} from './model.mjs';

/** The order the four source groups are read in. It is also the order of the shelf. */
export const reviewSources=Object.freeze(['home','doctors','sanjay','parul']);

/** Filter keys, in tab order. */
export const reviewFilterKeys=Object.freeze(['all','sanjay','parul']);

const doctorIds=Object.freeze(['sanjay','parul']);
// A review topic that only one of the two doctors provides.
const topicDoctor=Object.freeze({
 'Diabetes care':'sanjay',
 'Pregnancy care':'parul',
 'Pregnancy and ultrasound':'parul',
 'Ultrasound visit':'parul',
 'Women’s health':'parul'
});

/** "Aditi Sen" → "AS" (first letters of the first two words). */
export function reviewInitials(name){
 return String(name).trim().split(/\s+/u).filter(Boolean).slice(0,2).map(part=>Array.from(part)[0]).join('').toUpperCase();
}

/** "Aditi Sen" → "aditi-sen": a stable id for anchors, keys and data attributes. */
export function reviewId(name){
 return String(name).trim().toLowerCase().normalize('NFKD').replace(/\p{M}+/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

/**
 * Some stored quotations carry their own straight quote marks; the template adds the marks.
 * The words are never changed; a typewriter apostrophe inside them is set as a proper one.
 */
export function plainQuote(text){
 return String(text).trim().replace(/^"([\s\S]*)"$/u,'$1').trim().replace(/(?<=\p{L})'(?=\p{L})|(?<=\p{L})'(?=\s|$)/gu,'’');
}

/**
 * Which doctors a review is about. In order of trust:
 * 1. it was collected on that doctor's own page (source `sanjay` or `parul`);
 * 2. its words name the doctor ("Dr. Sanjay…", "Dr. Parul…");
 * 3. its topic is care only one doctor provides.
 * A review about the clinic in general belongs to no doctor and appears under "All" only.
 */
export function reviewDoctors({source,text,topic}){
 if(doctorIds.includes(source))return [source];
 const named=doctorIds.filter(id=>{
  const first=doctors[id].name.replace(/^Dr\.\s+/u,'').split(/\s+/u)[0];
  return new RegExp(`\\bDr\\.?\\s+${first}\\b`,'u').test(text);
 });
 if(named.length)return named;
 return Object.hasOwn(topicDoctor,topic)?[topicDoctor[topic]]:[];
}

/**
 * Merge the source groups into one list. Two reviews may never share a name: the name is the
 * key that joins a review's words to its details.
 */
export function mergeReviews(groups=reviews){
 const seen=new Set(),list=[];
 for(const source of reviewSources){
  for(const raw of groups[source]||[]){
   const detailed=reviewWithDetails(raw),id=reviewId(raw.name);
   if(seen.has(id))throw new Error('Two reviews share the name '+raw.name);
   seen.add(id);
   const text=plainQuote(raw.text);
   list.push(Object.freeze({
    id,
    name:raw.name,
    initials:reviewInitials(raw.name),
    text,
    rating:detailed.rating,
    locality:detailed.locality,
    verified:detailed.verified===true,
    topic:detailed.topic,
    icon:detailed.icon,
    source,
    doctors:Object.freeze(reviewDoctors({source,text,topic:detailed.topic}))
   }));
  }
 }
 return Object.freeze(list);
}

/** Every review once, in shelf order. */
export const allReviews=mergeReviews();

/** Does this review show under this filter? Unknown filters match nothing. */
export function reviewMatches(review,filter){
 if(filter==='all')return true;
 return doctorIds.includes(filter)&&review.doctors.includes(filter);
}

/** The reviews under one filter, in shelf order. */
export function reviewsFor(filter='all'){
 return allReviews.filter(review=>reviewMatches(review,filter));
}

/** How many reviews each filter holds: {all, sanjay, parul}. */
export const reviewCounts=Object.freeze(Object.fromEntries(reviewFilterKeys.map(key=>[key,reviewsFor(key).length])));

/**
 * The value for a card's filter attribute: "all sanjay". A tab then shows the cards whose
 * attribute holds its key (for example `[data-review-filters~="sanjay"]`).
 */
export function reviewFilterTokens(review){
 return ['all',...review.doctors].join(' ');
}

/** A star rating as fifths to fill: 4.5 → [1,1,1,1,0.5]. */
export function starFills(rating){
 const value=Number.isFinite(rating)?Math.max(0,Math.min(5,rating)):0;
 return Array.from({length:5},(_,index)=>Math.max(0,Math.min(1,value-index)));
}

// ---- The shelf: which reviews a visitor meets first under each tab. ----
// A strong, specific review leads each tab (it is set large, as the pull-quote); the others
// named here follow it, and every remaining review of that tab comes after them in list order.
const shelfLeads=Object.freeze({
 all:['Meera Raman','Ananya Sharma','Aditi Sen','Shweta Mukherjee','Rajesh Mehta','Sneha Kulkarni','Neha Agarwal','Suresh Kulkarni'],
 sanjay:['Anita Deshmukh','Rajesh Mehta','Vikram Sengupta','Meera Raman','Sunita Rao','Deepak Singhania'],
 parul:['Divya Menon','Ananya Sharma','Pooja Iyer','Sneha Kulkarni','Kavita Nair','Shweta Mukherjee']
});
/** How many cards the shelf shows under each tab; the reader always holds every review. */
export const shelfLimits=Object.freeze({all:8,sanjay:6,parul:6});

/** Every review of one tab in shelf order: the named leads first, then the rest. */
export function shelfOrder(filter='all',leads=shelfLeads){
 if(!reviewFilterKeys.includes(filter))throw new RangeError('Unknown review filter: '+filter);
 const pool=reviewsFor(filter),first=(leads[filter]||[]).map(name=>{
  const review=pool.find(item=>item.name===name);
  if(!review)throw new Error(`${name} does not belong under the "${filter}" reviews`);
  return review;
 });
 return Object.freeze([...first,...pool.filter(review=>!first.includes(review))]);
}
/** The cards the shelf shows under one tab. `limit` 0 means every review of the tab. */
export function shelfSelection(filter='all',limit=shelfLimits[filter]){
 const ordered=shelfOrder(filter);
 return limit>0?ordered.slice(0,limit):ordered;
}
/** The reader's order: the general shelf order, narrowed to one tab. */
export function readerOrder(filter='all'){
 return shelfOrder('all').filter(review=>reviewMatches(review,filter));
}

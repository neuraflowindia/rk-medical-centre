// After a topic is chosen on a phone or tablet, the changed detail can sit
// below the picture and out of sight. This decides whether to bring it up.
export const topicScrollRules={maxWidth:1024,lowerLimit:.6,topOffset:96};

/**
 * @param {{viewportWidth:number,viewportHeight:number,detailTop:number,scrollY:number,reducedMotion?:boolean}} view
 *   detailTop is the detail's top edge relative to the top of the screen.
 * @returns {{top:number,behavior:'smooth'|'instant'}|null} where to scroll, or null to stay put.
 */
export function topicScrollTarget({viewportWidth,viewportHeight,detailTop,scrollY,reducedMotion=false},rules=topicScrollRules){
 if(![viewportWidth,viewportHeight,detailTop,scrollY].every(Number.isFinite))return null;
 if(viewportWidth>=rules.maxWidth||viewportHeight<=0)return null;
 if(detailTop<=viewportHeight*rules.lowerLimit)return null;
 return {top:Math.max(0,Math.round(scrollY+detailTop-rules.topOffset)),behavior:reducedMotion?'instant':'smooth'};
}

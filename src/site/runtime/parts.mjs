// The shared parts' behaviours, in the order they are bound after every page change. Each one
// looks for its own markup under the app and does nothing when a page does not use it, so a page
// builder never has to bind a shared part.
import {bindSiteHeader} from '../parts/site-header/site-header.behaviour.mjs';
import {bindSiteFooter} from '../parts/site-footer/site-footer.behaviour.mjs';
import {bindOpenSigns} from '../parts/open-sign/open-sign.behaviour.mjs';
import {bindEssentialsStrip} from '../parts/essentials-strip/essentials-strip.behaviour.mjs';
import {bindHoursTable} from '../parts/hours-table/hours-table.behaviour.mjs';
import {bindClosing} from '../parts/closing/closing.behaviour.mjs';
import {bindActionBar} from '../parts/action-bar/action-bar.behaviour.mjs';
import {bindCallPanel} from '../parts/call-panel/call-panel.behaviour.mjs';
import {bindDoctorCards} from '../parts/doctor-card/doctor-card.behaviour.mjs';
import {bindReviewShelf} from '../parts/review-shelf/review-shelf.behaviour.mjs';
import {bindCertificates} from '../parts/certificate-frame/certificate-frame.behaviour.mjs';
import {bindStillShelf} from '../parts/still-shelf/still-shelf.behaviour.mjs';
import {bindQuestions} from '../parts/questions/questions.behaviour.mjs';

/**
 * Everything that follows the clinic's clock is painted together, every half minute: the live
 * signs (wherever they are, the call sheet's included), the closing heading and the "Today" tag.
 */
export function bindClock(root,context){
 const everywhere=root.ownerDocument||root;
 const closing=bindClosing(root,context),today=bindHoursTable(root,context);
 bindOpenSigns(everywhere,{signal:context.signal,onPaint:sign=>{closing?.(sign);today?.();}});
}

export const partBehaviours=Object.freeze([
 bindSiteHeader,bindSiteFooter,bindClock,bindEssentialsStrip,bindActionBar,bindCallPanel,
 bindDoctorCards,bindReviewShelf,bindCertificates,bindStillShelf,bindQuestions
]);

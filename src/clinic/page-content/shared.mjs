// Words and small facts for the parts every page shares: header, essentials strip, closing,
// footer, phone action bar, call sheet and call panel, review shelf, photo captions.
//
// Facts come from model.mjs (and stand-ins from standins.mjs); this module only arranges them
// into the words a template prints. No markup lives in this file: where one phrase needs
// emphasis or a link, it is given as separate fields and the template decides the tags.
import {doctors,doctorFacts,address,locality,city,directions,appointmentTimes,clinicOverview} from '../model.mjs';
import {doctorOrder} from '../care-catalogue.mjs';
import {clinicClock,sessionsFor,formatTime,NEUTRAL} from '../open-status.mjs';
import {registrationLine,whatsappNumber,whatsappLink,parkingLine} from '../standins.mjs';

export const clinicName='R. K. Medical Centre';
/** "Indira Nagar, Lucknow": the second line of the header lockup. */
export const clinicPlace=`${locality}, ${city}`;

/** The seven public page addresses, exactly as the installation routes them. They never change here. */
export const pagePaths=Object.freeze({
 home:'/',
 treatments:'/treatment',
 about:'/about-clinic',
 doctors:'/meet-doctor',
 sanjay:'/dr-sanjay-gupta',
 parul:'/dr-parul-gupta',
 contact:'/contact'
});
/** The booking screens. `/booking-help` is an older address that opens "Find your booking". */
export const bookingPaths=Object.freeze({book:'/booking',find:'/booking-details',findAlias:'/booking-help'});

/** Header links, in order. */
export const mainNavigation=Object.freeze([
 {path:pagePaths.treatments,label:'Treatments'},
 {path:pagePaths.doctors,label:'Doctors'},
 {path:pagePaths.about,label:'About'},
 {path:pagePaths.contact,label:'Contact'}
].map(Object.freeze));
/** The phone menu: Home, the header links, then booking (shown only while online booking is on). */
export const menuNavigation=Object.freeze([
 Object.freeze({path:pagePaths.home,label:'Home'}),
 ...mainNavigation,
 Object.freeze({path:bookingPaths.book,label:'Book an appointment',bookingOnly:true})
]);
export const navigationLabels=Object.freeze({
 home:`${clinicName} home`,
 main:'Main navigation',
 menu:'Pages',
 openMenu:'Open menu',
 closeMenu:'Close menu',
 skip:'Skip to content'
});

/** Is this navigation link the current page? "Doctors" also covers both doctor profiles. */
export function navigationCurrent(path,route){
 return path===route||(path===pagePaths.doctors&&(route===pagePaths.sanjay||route===pagePaths.parul));
}

/** "Dr. Sanjay Gupta" → "Dr. Sanjay": the short name used on buttons and tabs. */
export function doctorShortName(id){return doctors[id].name.replace(/\s+\S+$/u,'');}
/** "+91 94150 49410" → "94150 49410": the digits shown beside a name. */
export function localPhone(id){return doctors[id].phone.replace(/^\+91\s*/u,'');}
/** "General health and diabetes care" → "General health and diabetes": the need a call row names. */
export function doctorNeed(id){return doctors[id].role.replace(/\s+care$/u,'');}

export const actionLabels=Object.freeze({
 call:'Call',
 directions:'Get directions',
 directionsShort:'Directions',
 fullProfile:'Full profile',
 whatsapp:'WhatsApp the clinic',
 readMore:'Read more',
 allCertificates:'All certificates'
});
export const bookWithLabel=id=>`Book with ${doctorShortName(id)}`;
export const callDoctorLabel=id=>`Call ${doctorShortName(id)}`;
/** Spoken name for a button that dials one doctor. */
export const callDoctorSpoken=id=>`Call ${doctors[id].name} at ${doctors[id].phone}`;
/** Where "Book with Dr. …" goes. A chosen topic rides along for the booking screen. */
export function bookWithPath(id,topic=''){
 return `${bookingPaths.book}?doctor=${encodeURIComponent(id)}${topic?`&topic=${encodeURIComponent(topic)}`:''}`;
}

/**
 * The main "Book an appointment" control in its two states. While online booking is off the
 * same control stays visible and leads to Contact; every other booking link is hidden by the build.
 * `header` is the control in the site header; `page` is the first-screen control on a page.
 */
export const bookingEntry=Object.freeze({
 header:Object.freeze({
  on:Object.freeze({label:'Book an appointment',short:'Book',path:bookingPaths.book,spoken:'Book an appointment',hint:'Book an appointment online'}),
  off:Object.freeze({label:'Book an appointment',short:'Book',path:pagePaths.contact,spoken:'Book an appointment by calling the clinic',hint:'Call the clinic to arrange an appointment'})
 }),
 page:Object.freeze({
  on:Object.freeze({label:'Book an appointment',path:bookingPaths.book,spoken:'Book an appointment',hint:'Book an appointment online'}),
  off:Object.freeze({label:'Arrange a visit',path:pagePaths.contact,spoken:'Arrange a visit by calling the clinic',hint:'Call the clinic to arrange an appointment'})
 })
});
/** The words and address of a booking entry: `place` is "header" or "page"; `enabled` is the booking state. */
export function bookingEntryFor(place,enabled){
 if(!Object.hasOwn(bookingEntry,place))throw new RangeError('Unknown booking entry: '+place);
 return bookingEntry[place][enabled?'on':'off'];
}

const SHORT_DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
/**
 * The live sign in its short two-part form, India time:
 *   open now            → {state:'open',   label:'Open now',    detail:'until 1:30 pm'}
 *   opens later today   → {state:'later',  label:'Opens today', detail:'6:00 pm'}
 *   closed for the day  → {state:'closed', label:'Closed now',  detail:'opens Mon 10:00 am'}
 * Times are the first and last appointment starting times in model.mjs.
 */
export function liveSign(date=new Date(),sessions){
 const {day,minutes}=clinicClock(date),today=sessionsFor(day,sessions);
 const current=today.find(([start,end])=>minutes>=start&&minutes<=end);
 if(current)return {state:'open',label:'Open now',detail:`until ${formatTime(current[1])}`};
 const later=today.find(([start])=>start>minutes);
 if(later)return {state:'later',label:'Opens today',detail:formatTime(later[0])};
 for(let ahead=1;ahead<=7;ahead++){
  const next=sessionsFor((day+ahead)%7,sessions)[0];
  if(next)return {state:'closed',label:'Closed now',detail:`opens ${SHORT_DAYS[(day+ahead)%7]} ${formatTime(next[0])}`};
 }
 return {state:'closed',label:'Closed now',detail:'call for timings'};
}
/** The sign on one line, as the laptop header shows it: "Open now · until 1:30 pm". */
export function liveSignLine(sign){return `${sign.label} · ${sign.detail}`;}
/** What the sign says before the browser has worked out the time (and with scripts off). */
export const liveSignNeutral=Object.freeze({state:'pending',label:NEUTRAL.label,detail:NEUTRAL.detail});

/** "₹800", or each doctor's fee if they ever differ. */
export function feeLabel(overview=clinicOverview()){
 return overview.fee===null?overview.fees:`₹${overview.fee}`;
}

/** The three answers under the first screen. Cell 1 is live (`liveSign`). */
export const essentials=Object.freeze({
 open:Object.freeze({icon:'clock'}),
 fee:Object.freeze({icon:'report',label:'Fee',value:feeLabel()}),
 place:Object.freeze({icon:'pin',label:'Tedhi Pulia, Ring Road',action:'Directions',href:directions})
});

/** The week's appointment times as rows. The Sunday text may end with a short note after the hours. */
export function weekHoursFrom(times=appointmentTimes){
 const [sundayHours,sundayNote='']=times.sunday.split('. ');
 return Object.freeze([
  Object.freeze({days:'Monday to Saturday',short:'Mon–Sat',hours:times.weekday}),
  Object.freeze({days:'Sunday',short:'Sun',hours:sundayHours.replace(/\.$/u,''),note:sundayNote.replace(/\.$/u,'')})
 ]);
}
/** The week's appointment times as rows, for an address card or a timetable. */
export const weekHours=weekHoursFrom();
/** The week on one line, for the footer. */
export const hoursLine=weekHours.map(row=>`${row.short} ${row.hours}`).join(' · ');

/** One row per doctor for the call sheet, the call panel, the closing and Contact. */
export function callRows(){
 return doctorOrder.map(id=>Object.freeze({
  id,
  name:doctors[id].name,
  need:doctorNeed(id),
  phone:doctors[id].phone,
  digits:localPhone(id),
  href:`tel:${doctors[id].tel}`,
  spoken:callDoctorSpoken(id)
 }));
}
/** The phone call sheet and the laptop call panel hold the same content. */
export const callSheet=Object.freeze({
 title:'Call the clinic',
 close:'Close',
 whatsapp:Object.freeze({label:actionLabels.whatsapp,number:whatsappNumber,href:whatsappLink()})
});
/** The phone action bar, left to right. */
export const actionBar=Object.freeze({call:'Call',book:'Book',directions:'Directions',label:'Quick actions'});

/**
 * The closing section: one decision, with words that stay true at any hour.
 * `today` is used while the clinic is open or opens later today; otherwise `next`.
 */
export const closing=Object.freeze({
 headings:Object.freeze({
  today:'See a doctor today.',
  next:Object.freeze({on:'Book your next visit.',off:'Arrange your next visit.'})
 }),
 book:bookingEntry.page.on.label
});
/** The closing heading for a live-sign state and the booking state. */
export function closingHeading(signState,bookingEnabled=true){
 if(signState==='open'||signState==='later')return closing.headings.today;
 return closing.headings.next[bookingEnabled?'on':'off'];
}
/** "Dr. Sanjay Gupta · 94150 49410": the words of one closing call row. */
export function closingCallLine(row){return `${row.name} · ${row.digits}`;}

/** Captions under the two place photographs. They describe only what the photographs show. */
export const photoCaptions=Object.freeze({
 frontage:'Look for the green wall and the blue board with both doctors’ names.',
 waitingArea:'The covered waiting area inside the gate.'
});

/** The address card that sits with the place photographs. */
export const addressCard=Object.freeze({
 address,
 hours:weekHours,
 directions:Object.freeze({label:actionLabels.directions,href:directions}),
 parking:parkingLine,
 bring:'Bring your earlier reports and current medicines, and come ten minutes early.'
});

/** Words of the shared review shelf and its reader. */
export const reviewShelf=Object.freeze({
 tabs:Object.freeze({all:'All',sanjay:doctorShortName('sanjay'),parul:doctorShortName('parul')}),
 tabsLabel:'Reviews by doctor',
 previous:'Previous review',
 next:'Next review',
 readMore:actionLabels.readMore,
 verified:'Verified patient'
});
export const readAllReviewsLabel=count=>`Read all ${count} reviews`;
export const reviewReaderTitle=name=>`Review from ${name}`;
export const ratingSpoken=rating=>`${Number(rating).toFixed(1)} out of 5`;

/** The notice opened by "How your details are used". */
export const detailsNotice=Object.freeze({
 title:'How your details are used',
 paragraphs:Object.freeze([
  'The clinic uses your name and contact details to answer your question or arrange your visit. Your selected doctor and the team helping manage clinic bookings can access the relevant records.',
  'Messages and booking records are kept in the clinic’s protected system. An email service sends verification and appointment messages. If you choose online payment, the payment provider handles that payment.',
  'For questions about your records or to ask for a correction, contact the clinic using the phone numbers on the Contact page.'
 ])
});

/** Everything the footer prints. */
export const footer=Object.freeze({
 name:clinicName,
 address,
 hoursLabel:'Appointment times',
 hoursLine,
 phonesLabel:'Call the clinic',
 changes:'For changes or cancellations, call the clinic.',
 pagesLabel:'Pages',
 pages:Object.freeze([Object.freeze({path:pagePaths.home,label:'Home'}),...mainNavigation]),
 registrations:Object.freeze(doctorOrder.map(id=>Object.freeze({id,name:doctors[id].name,path:doctors[id].path,line:registrationLine(id)}))),
 directions:Object.freeze({label:actionLabels.directions,href:directions}),
 detailsNotice:detailsNotice.title,
 privacyChoices:'Change privacy choices',
 motion:Object.freeze({pause:'Pause motion',play:'Play motion'})
});
/** "© 2026 R. K. Medical Centre · Lucknow" */
export function copyrightLine(year=new Date().getFullYear()){return `© ${year} ${clinicName} · ${city}`;}

/** The year both doctors began practising, or null if the two ever differ. */
export function practisingSince(facts=doctorFacts){
 const years=new Set(doctorOrder.map(id=>facts[id].since));
 return years.size===1?[...years][0]:null;
}

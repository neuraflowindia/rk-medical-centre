// Words for Meet the doctors and for both doctor profiles, section by section, in page order.
//   Meet the doctors:  opening (a double portrait) · who should I see (a split spread) · training and honours · closing
//   A profile:         cover · essentials · what the doctor sees patients for · about · certificates · reviews · closing
//
// Facts come from model.mjs, care-catalogue.mjs, certificate-catalogue.mjs and open-status.mjs;
// degrees are read through degreesOf() and registrations through registrationLine() (their one
// home is standins.mjs and model.mjs); words shared with Home come from home.mjs and shared.mjs.
// No markup lives in this file: emphasis and links are separate fields.
import {doctors,doctorFacts} from '../model.mjs';
import {doctorOrder} from '../care-catalogue.mjs';
import {certificatesFor} from '../certificate-catalogue.mjs';
import {clinicPhotos,archPortraits,doctorAvatars} from '../client-media.mjs';
import {clinicClock,sessionsFor,formatTime,NEUTRAL} from '../open-status.mjs';
import {registrationLine} from '../standins.mjs';
import {hero,doctorChips,doctorsSection,degreesBeside} from './home.mjs';
import {pagePaths,actionLabels,bookWithLabel,callDoctorSpoken,degreesOf,doctorShortName,localPhone} from './shared.mjs';

function known(id){
 if(!Object.hasOwn(doctors,id))throw new RangeError('Unknown doctor: '+id);
 return id;
}

/** Where both doctors trained. The name is written once, here. */
export const university='King George’s Medical University';
const pronouns=Object.freeze({
 sanjay:Object.freeze({subject:'he',object:'him',possessive:'his'}),
 parul:Object.freeze({subject:'she',object:'her',possessive:'her'})
});
/** Each doctor's wash: the same colour code as the Home cards (never the only cue: the name is always beside it). */
export const doctorTone=Object.freeze({sanjay:'sage',parul:'rose'});
/** "Physician · Diabetes" / "Gynaecologist": the short role under a portrait, as on Home. */
export function shortRole(id){return hero.portraits.find(item=>item.id===known(id)).role;}
const homeCard=id=>doctorsSection.cards.find(card=>card.id===known(id));
/** "KGMU gold medalist" for Dr. Parul Gupta; null for a doctor without an honour tag. */
export function honourTag(id){return homeCard(id).tag||null;}
/** "Physician & Diabetology · MBBS, DGO": the formal specialty and the degrees, exactly as on the Home card. */
export function formalLine(id){return homeCard(id).formalLine;}
/** The degrees alone, for a place where the formal specialty already stands beside them. */
export function degreesLine(id){return degreesBeside(doctors[known(id)].formal,degreesOf(id));}

// ---- photographs ----
// WAITING: request doctors-01 — the wider 4 : 5 "at work" crops and the 3 : 2 room crops. Until
// they are in public/, Home's arch portraits stand in and the room picture is left out.
const hasPhoto=(id,photos)=>Object.hasOwn(photos,id);
/** The 4 : 5 "at work" portrait of a doctor (Meet the doctors, profile cover). Never shown wider than 300 px. */
export function workPortrait(id,photos=clinicPhotos){
 const wanted=`at-work-${known(id)}`;
 return hasPhoto(wanted,photos)?wanted:archPortraits[id];
}
/** The 3 : 2 picture of a doctor's consulting room, or null while it does not exist yet. */
export function roomPicture(id,photos=clinicPhotos){
 const wanted=`room-${known(id)}`;
 return hasPhoto(wanted,photos)?wanted:null;
}
/** A doctor's small square face (decorative: the name is always beside it). */
export function avatarOf(id){return doctorAvatars[known(id)];}
/** What each portrait shows, as its credit: a moment at work, and where. */
export const portraitCredit=Object.freeze(Object.fromEntries(doctorOrder.map(id=>[id,`In ${pronouns[id].possessive} consulting room`])));

// ---- what each doctor sees patients for (the nine Home chips, in the same words) ----
/** [{id, label, href}] — `href` is the topic's row on the Treatments page, exactly where the Home chip leads. */
export function careTopics(id){
 return doctorChips(known(id)).map(chip=>Object.freeze({id:chip.id,label:chip.label,href:chip.href}));
}

// =====================================================================================
// Meet the doctors
// =====================================================================================

/**
 * Two certificates from each doctor, each doctor's pair together: the third and fourth of each
 * in the approved order, so the four that Home shows are not repeated here.
 */
export function meetCertificates(from=2,perDoctor=2){
 return doctorOrder.flatMap(id=>certificatesFor(id).slice(from,from+perDoctor));
}

function leaf(id){
 const doctor=doctors[id];
 return Object.freeze({
  id,
  tone:doctorTone[id],
  name:doctor.name,
  role:doctor.role,
  heading:`See ${doctorShortName(id)} for`,
  concerns:Object.freeze(careTopics(id).map(topic=>topic.label)),
  formalLine:formalLine(id),
  registration:registrationLine(id),
  tag:honourTag(id),
  profile:Object.freeze({label:actionLabels.fullProfile,href:doctor.path,spoken:`${actionLabels.fullProfile} of ${doctor.name}`})
 });
}

const MEET_EMPHASIS=`and ${doctors.parul.name}.`;
export const doctorsPage=Object.freeze({
 // 1 · opening: a double portrait
 runningHead:'The doctors',
 heading:`Meet ${doctorShortName('sanjay')} ${MEET_EMPHASIS}`,
 emphasis:MEET_EMPHASIS,
 portraits:Object.freeze(doctorOrder.map(id=>Object.freeze({id,name:doctors[id].name,role:shortRole(id),credit:portraitCredit[id]}))),
 jump:Object.freeze({label:'Who should I see?',href:'#who'}),

 // 2 · who should I see: a split spread, one page per doctor
 choose:Object.freeze({
  id:'who',
  runningHead:'Choosing a doctor',
  heading:'Who should I see?',
  leaves:Object.freeze(doctorOrder.map(leaf)),
  more:Object.freeze({lead:'Not sure yet?',label:'Compare the treatments',href:pagePaths.treatments})
 }),

 // 3 · shared training and honours: one sentence and four certificates, two each
 training:Object.freeze({
  id:'training',
  runningHead:'Training and honours',
  heading:'Trained at King George’s, Lucknow.',
  emphasis:'King George’s, Lucknow.',
  intro:`Both doctors trained at ${university}, where ${doctors.parul.name} was a gold medalist.`,
  wallLabel:'Certificates of both doctors',
  links:Object.freeze(doctorOrder.map(id=>Object.freeze({id,label:`${doctorShortName(id)}’s certificates`,href:`${doctors[id].path}#certificates`})))
 })
});

// =====================================================================================
// A doctor's profile
// =====================================================================================

const DAY_NAMES=Object.freeze(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']);
/** The words of the "next clinic session" line. */
export const sessionWords=Object.freeze({now:'In clinic now',next:'Next clinic session',pending:'Clinic sessions',until:'until',today:'today',tomorrow:'tomorrow',unknown:'call for timings'});
/**
 * When a patient can next see a doctor, worked out from the appointment starting times (India time):
 *   during a session   → {state:'open',   label:'In clinic now',       detail:'until 1:30 pm'}
 *   later the same day → {state:'later',  label:'Next clinic session', detail:'today, 6:00 pm'}
 *   after the last one → {state:'closed', label:'Next clinic session', detail:'tomorrow, 10:00 am'}
 * Both doctors keep the clinic's sessions, so one answer serves either profile.
 */
export function nextSession(date=new Date(),sessions){
 const {day,minutes}=clinicClock(date),today=sessionsFor(day,sessions);
 const current=today.find(([start,end])=>minutes>=start&&minutes<=end);
 if(current)return {state:'open',label:sessionWords.now,detail:`${sessionWords.until} ${formatTime(current[1])}`};
 const later=today.find(([start])=>start>minutes);
 if(later)return {state:'later',label:sessionWords.next,detail:`${sessionWords.today}, ${formatTime(later[0])}`};
 for(let ahead=1;ahead<=7;ahead++){
  const next=sessionsFor((day+ahead)%7,sessions)[0];
  if(next)return {state:'closed',label:sessionWords.next,detail:`${ahead===1?sessionWords.tomorrow:DAY_NAMES[(day+ahead)%7]}, ${formatTime(next[0])}`};
 }
 return {state:'closed',label:sessionWords.next,detail:sessionWords.unknown};
}
/** What the line says before the browser has worked out the time (and with scripts off). */
export const nextSessionNeutral=Object.freeze({state:'pending',label:sessionWords.pending,detail:NEUTRAL.detail});

// About the doctor: 60 to 80 words each, from facts the site already holds (training, the year
// practice began, the care topics and the care catalogue's own description of a consultation).
// `lede` is the first sentence, set larger; `body` follows it.
const stories=Object.freeze({
 sanjay:Object.freeze({
  heading:`A physician for Lucknow families since ${doctorFacts.sanjay.since}.`,
  emphasis:`since ${doctorFacts.sanjay.since}.`,
  lede:`${doctors.sanjay.name} is the clinic’s physician and diabetologist.`,
  body:`He trained at ${university}, Lucknow, and has been in practice since ${doctorFacts.sanjay.since}. Families see him for diabetes, blood pressure, thyroid concerns and fevers, and for the everyday illnesses in between. A consultation gives you time to explain what has changed, go through your reports and readings, and ask about your ongoing care.`,
  caption:`${doctors.sanjay.name} in his consulting room at the clinic.`
 }),
 parul:Object.freeze({
  heading:`Caring for Lucknow’s women since ${doctorFacts.parul.since}.`,
  emphasis:`since ${doctorFacts.parul.since}.`,
  // "a senior woman gynaecologist" is said once on the site, here (concept brief §9, decision 6).
  lede:`${doctors.parul.name} is a senior woman gynaecologist and a gold medalist of ${university}, Lucknow.`,
  body:`In practice since ${doctorFacts.parul.since}, she sees women for period problems and PCOS, through pregnancy and after childbirth, and about pregnancy and pelvic ultrasound scans. Bring your earlier records and your questions: a consultation is the time to talk through what has been troubling you.`,
  caption:`${doctors.parul.name} in her consulting room, with the scan machine beside her desk.`
 })
});
// One paper-cut object beside each doctor's list on wide screens: an accent, never an illustration of a person.
const careObjects=Object.freeze({sanjay:'stethoscope-general',parul:'ultrasound-probe'});
const certificateHeadings=Object.freeze({
 sanjay:Object.freeze({heading:'Training and professional memberships.',emphasis:'professional memberships.'}),
 parul:Object.freeze({heading:'Fellowships, training and awards.',emphasis:'and awards.'})
});

/** Everything one doctor's profile prints: `id` is "sanjay" or "parul". */
export function profilePage(id){
 known(id);
 const doctor=doctors[id],they=pronouns[id],story=stories[id];
 return Object.freeze({
  id,
  tone:doctorTone[id],
  // 1 · cover
  runningHead:doctor.formal,
  heading:doctor.name,
  role:doctor.role,
  degrees:degreesLine(id),
  registration:registrationLine(id),
  tag:honourTag(id),
  credit:`${portraitCredit[id]}, Indira Nagar`,
  book:bookWithLabel(id),
  call:Object.freeze({label:`${actionLabels.call} ${localPhone(id)}`,href:`tel:${doctor.tel}`,spoken:callDoctorSpoken(id)}),
  session:nextSessionNeutral,
  // 3 · what the doctor sees patients for
  care:Object.freeze({
   id:'care',
   runningHead:'Consultations',
   heading:`What ${they.subject} sees patients for.`,
   emphasis:'sees patients for.',
   listLabel:`What ${doctor.name} sees patients for`,
   object:careObjects[id],
   topics:Object.freeze(careTopics(id))
  }),
  // 4 · about the doctor
  about:Object.freeze({
   id:'about',
   runningHead:'About the doctor',
   heading:story.heading,
   emphasis:story.emphasis,
   lede:story.lede,
   body:story.body,
   caption:story.caption,
   // Preparation advice has its one home on Home ("Visiting us"); the profile only points to it.
   bring:Object.freeze({label:'What to bring to your visit',href:`${pagePaths.home}#visiting`})
  }),
  // 5 · certificates: the gallery wall
  certificates:Object.freeze({
   id:'certificates',
   runningHead:'Certificates',
   ...certificateHeadings[id],
   shelfLabel:`${doctor.name}’s certificates`,
   previous:'Previous certificate',
   next:'Next certificate',
   hint:'Select a certificate to see it larger.',
   items:certificatesFor(id)
  }),
  // 6 · reviews
  reviews:Object.freeze({
   id:'reviews',
   runningHead:'Reviews',
   heading:`In ${they.possessive} patients’ words.`,
   emphasis:'patients’ words.',
   shown:3
  })
 });
}

/**
 * Proposed page descriptions for search (one sentence each, at most 155 characters). Titles stay
 * as they are. These are proposals for clinic/page-metadata.mjs, which this module does not edit.
 */
export const proposedDescriptions=Object.freeze({
 [pagePaths.doctors]:'Meet Dr. Sanjay Gupta, physician, and Dr. Parul Gupta, gynaecologist, at R. K. Medical Centre, Lucknow: who treats what, and how to book or call.',
 [pagePaths.sanjay]:'Dr. Sanjay Gupta, physician and diabetologist in Indira Nagar, Lucknow, in practice since 1992: what he treats, his next clinic session, booking and calls.',
 [pagePaths.parul]:'Dr. Parul Gupta, a senior woman gynaecologist and KGMU gold medalist in Indira Nagar, Lucknow: periods, PCOS and pregnancy care, booking and calls.'
});

// Words for Meet the doctors and for both doctor profiles, section by section, in page order.
//   Meet the doctors:  opening (a double portrait) · who should I see (a split spread) · training and honours · closing
//   A profile:         cover · essentials · what the doctor sees patients for · about · certificates · reviews · closing
//
// Facts come from model.mjs, care-catalogue.mjs, certificate-catalogue.mjs and open-status.mjs;
// degrees are read through degreesOf() and registrations through registrationLine() (their one
// home is standins.mjs and model.mjs); words shared with Home come from home.mjs and shared.mjs.
// No markup lives in this file: emphasis and links are separate fields.
import {doctors,doctorFacts,locality,city} from '../model.mjs';
import {doctorOrder} from '../care-catalogue.mjs';
import {certificatesFor} from '../certificate-catalogue.mjs';
import {workPortraits,roomCrops,doctorAvatars} from '../client-media.mjs';
import {clinicClock,sessionsFor,formatTime,NEUTRAL} from '../open-status.mjs';
import {registrationLine} from '../standins.mjs';
import {hero,doctorChips,doctorsSection,degreesBeside} from './home.mjs';
import {clinicName,pagePaths,actionLabels,bookWithLabel,callDoctorSpoken,degreesOf,doctorShortName,localPhone} from './shared.mjs';

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
/** The degrees alone, for a place where the formal specialty already stands beside them. */
export function degreesLine(id){return degreesBeside(doctors[known(id)].formal,degreesOf(id));}

// ---- photographs ----
/** The wider 4 : 5 "at work" portrait of a doctor (Meet the doctors, profile cover). Never shown wider than 300 px. */
export function workPortrait(id){return workPortraits[known(id)];}
/** The 3 : 2 picture of a doctor's consulting room (profile, "About the doctor"). Never shown wider than 444 px. */
export function roomPicture(id){return roomCrops[known(id)];}
/** A doctor's small square face (decorative: the name is always beside it). */
export function avatarOf(id){return doctorAvatars[known(id)];}
/**
 * Each doctor's own instrument, a paper-cut object (clinicObjects): the stethoscope for the
 * physician, the scan probe for the gynaecologist. An accent beside the portrait, never a person.
 */
export const doctorInstrument=Object.freeze({sanjay:'stethoscope-general',parul:'ultrasound-probe'});
/** What each portrait shows, as its credit: a moment at work, and where. */
export const portraitCredit=Object.freeze(Object.fromEntries(doctorOrder.map(id=>[id,`In ${pronouns[id].possessive} consulting room`])));
/** Where: added to the credit where there is room for it. */
export const portraitPlace=locality;

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
  // The field is named under the portrait and under "See Dr. … for"; this line adds only what they do not say.
  degrees:degreesLine(id),
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
 portraits:Object.freeze(doctorOrder.map(id=>Object.freeze({id,name:doctors[id].name,role:shortRole(id),credit:portraitCredit[id],instrument:doctorInstrument[id]}))),
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
  // Each profile shows all five of its doctor's certificates.
  linksLead:'See all five for',
  links:Object.freeze(doctorOrder.map(id=>Object.freeze({id,label:doctorShortName(id),spoken:`All five certificates of ${doctors[id].name}`,href:`${doctors[id].path}#certificates`})))
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
  credit:portraitCredit[id],
  creditPlace:portraitPlace,
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
   // On a doctor's own page every document is theirs, so the label does not repeat the name.
   items:Object.freeze(certificatesFor(id).map(item=>Object.freeze({...item,doctor:null})))
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
 [pagePaths.doctors]:`Meet ${doctors.sanjay.name}, physician, and ${doctors.parul.name}, gynaecologist, at ${clinicName}, ${city}: who treats what, and how to book or call.`,
 [pagePaths.sanjay]:`${doctors.sanjay.name}, physician and diabetologist in ${locality}, ${city}, in practice since ${doctorFacts.sanjay.since}: what he treats, his next clinic session, booking and calls.`,
 [pagePaths.parul]:`${doctors.parul.name}, a senior woman gynaecologist and KGMU gold medalist in ${locality}, ${city}: periods, PCOS and pregnancy care, booking and calls.`
});

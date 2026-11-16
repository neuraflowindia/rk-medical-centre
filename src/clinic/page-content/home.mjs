// Words for the Home page, section by section, in the order the page shows them:
// hero (+ essentials strip) · the doctors · credentials · reviews · visiting us · questions · closing.
//
// Facts come from model.mjs, care-catalogue.mjs and certificate-catalogue.mjs; stand-ins come
// from standins.mjs; words shared with other pages come from shared.mjs. No markup lives in
// this file: emphasis, links and line breaks are separate fields and the template chooses the tags.
import {doctors,homeHeadline,locality} from '../model.mjs';
import {topicById,doctorOrder} from '../care-catalogue.mjs';
import {certificateCatalogue} from '../certificate-catalogue.mjs';
import {archPortraits,clinicPhotos} from '../client-media.mjs';
import {walkInAnswer,paymentAnswer,bookForSomeoneElseAnswer,observationCareSentence} from '../standins.mjs';
import {pagePaths,actionLabels,bookWithLabel,bookWithPath,callDoctorSpoken,clinicStandards,degreesOf,feeLabel,practisingSince,addressCard,photoCaptions} from './shared.mjs';

const since=practisingSince();
// The Home words say "since 1992" for both doctors at once; they need one shared year.
if(since===null)throw new Error('The doctors no longer share a starting year: rewrite the Home words that say "since".');

/**
 * The seven sections in page order. `ground` is the kind of background, so every boundary is
 * visible: light, tint, deep, light, tint, light, light (with one inset tint panel); the footer is deep.
 */
export const homeSections=Object.freeze([
 {id:'opening',ground:'light'},
 {id:'doctors',ground:'tint'},
 {id:'credentials',ground:'deep'},
 {id:'reviews',ground:'light'},
 {id:'visiting',ground:'tint'},
 {id:'questions',ground:'light'},
 {id:'closing',ground:'light'}
].map(Object.freeze));

const EMPHASIS='on your mind.';
/**
 * The page's one main heading. `emphasis` is set in italics and must stay on one line;
 * together the two parts are exactly the clinic's headline in model.mjs.
 */
export const hero=Object.freeze({
 heading:Object.freeze({plain:homeHeadline.slice(0,-EMPHASIS.length).trimEnd(),emphasis:EMPHASIS}),
 lead:`A physician and a gynaecologist caring for Lucknow families since ${since}.`,
 call:actionLabels.call,
 portraits:Object.freeze([
  Object.freeze({id:'sanjay',photo:archPortraits.sanjay,name:doctors.sanjay.name,role:'Physician · Diabetes'}),
  Object.freeze({id:'parul',photo:archPortraits.parul,name:doctors.parul.name,role:'Gynaecologist'})
 ]),
 // A credit line beside the pair: it says the photographs are real, taken at the clinic.
 credit:`Photographed at the clinic, ${locality}`,
 object:'stethoscope-teal'
});

// Chip → the care topic it belongs to. A chip's id is also its place on the Treatments page.
// `answer` is the short line shown under the chips: tightened from the care catalogue's words for
// that topic so it fits in two lines on a phone (the clinic confirms the wording). `object` is
// the paper-cut picture that arrives with it.
const chipPlan=Object.freeze({
 sanjay:[
  {id:'diabetes',label:'Diabetes',topic:'diabetes',object:'glucose-meter',more:'More about diabetes care',answer:'Bring your reports and sugar readings, and talk through your ongoing care.'},
  {id:'blood-pressure',label:'Blood pressure',topic:'blood-pressure',object:'blood-pressure-cuff',more:'More about blood pressure',answer:'Bring the readings you take at home and talk through what they mean for you.'},
  {id:'thyroid',label:'Thyroid',topic:'thyroid',object:'report-clipboard',more:'More about thyroid concerns',answer:'Bring your thyroid reports and prescriptions, and discuss your follow-up care.'},
  {id:'fever-infections',label:'Fever & infections',topic:'fever-infections',object:'thermometer',more:'More about fever and infections',answer:'For fever and common infections, including dengue, malaria and typhoid concerns.'},
  {id:'general-health',label:'General check-up',topic:'general-health',object:'stethoscope-general',more:'More about general health',answer:'Everyday health concerns, an illness that keeps returning, or a follow-up visit.'}
 ],
 parul:[
  {id:'womens-health',label:'Periods & PCOS',topic:'womens-health',object:'desk-calendar',more:'More about women’s health',answer:'Talk through period problems, PCOS or another women’s health concern.'},
  {id:'pregnancy',label:'Pregnancy',topic:'pregnancy',object:'doppler-probe',more:'More about pregnancy care',answer:'Check-ups through your pregnancy, with time for all your questions.'},
  // Care after childbirth is part of the pregnancy topic.
  {id:'after-childbirth',label:'After childbirth',topic:'pregnancy',object:'folded-cloth',more:'More about care after childbirth',answer:'Care for you in the weeks after delivery. Bring your pregnancy records.'},
  {id:'ultrasound',label:'Ultrasound',topic:'ultrasound',object:'ultrasound-probe',more:'More about ultrasound scans',answer:'Pregnancy and pelvic scans. Call to ask how to prepare for yours.'}
 ]
});

/** Where a chip (or a "More about…" link) lands on the Treatments page. */
export function treatmentAnchor(chipId){return `${pagePaths.treatments}#${chipId}`;}

/**
 * The chips inside one doctor's card. Each chip carries the short answer shown under the chips
 * (at most 140 characters, two lines at most), its "More about…" link, the object that changes
 * with it, and where its booking leads.
 * With scripts off a chip is a plain link to `href`.
 */
export function doctorChips(id){
 if(!Object.hasOwn(chipPlan,id))throw new RangeError('Unknown doctor: '+id);
 return chipPlan[id].map(chip=>{
  const topic=topicById(chip.topic);
  return Object.freeze({
   id:chip.id,
   label:chip.label,
   topic:topic.id,
   answer:chip.answer,
   more:Object.freeze({label:chip.more,href:treatmentAnchor(chip.id)}),
   href:treatmentAnchor(chip.id),
   object:chip.object,
   bookHref:bookWithPath(id,topic.id)
  });
 });
}

const tones=Object.freeze({sanjay:'sage',parul:'rose'});
const tags=Object.freeze({parul:'KGMU gold medalist'});
/** Degrees without a bracket that only repeats the formal specialty beside it: "MBBS, MS (Obstetrics & Gynaecology)" → "MBBS, MS". */
export function degreesBeside(formal,degrees){
 return degrees.replace(/\s*\(([^)]*)\)\s*$/u,(whole,inside)=>inside.trim()===formal?'':whole);
}
function doctorCard(id){
 const doctor=doctors[id],degrees=degreesBeside(doctor.formal,degreesOf(id));
 return Object.freeze({
  id,
  tone:tones[id],
  photo:archPortraits[id],
  photoCaption:clinicPhotos[archPortraits[id]].caption,
  name:doctor.name,
  specialty:doctor.role,
  formal:doctor.formal,
  degrees,
  formalLine:`${doctor.formal} · ${degrees}`,
  tag:tags[id]||null,
  chips:Object.freeze(doctorChips(id)),
  book:Object.freeze({label:bookWithLabel(id),href:bookWithPath(id)}),
  call:Object.freeze({label:actionLabels.call,href:`tel:${doctor.tel}`,spoken:callDoctorSpoken(id)}),
  profile:Object.freeze({label:actionLabels.fullProfile,href:doctor.path})
 });
}

/** Two tall cards; the concern chips live inside each card. No registration number and no "since" here. */
export const doctorsSection=Object.freeze({
 runningHead:'The doctors',
 heading:'Two doctors. One family practice.',
 emphasis:'One family practice.',
 intro:`Both trained at King George’s Medical University and have practised in Lucknow since ${since}.`,
 chipPrompt:'What would you like help with?',
 cards:Object.freeze(doctorOrder.map(doctorCard))
});

/** "30+": whole decades in practice. It changes by itself when a new decade is reached. */
export function yearsNumeral(year=new Date().getFullYear(),from=since){
 return `${Math.max(0,Math.floor((year-from)/10)*10)}+`;
}

// The four certificates on Home: two of each doctor, a wide one first so the row opens well.
const homeCertificateIds=Object.freeze(['sanjay-gupta-certificate-08','sanjay-gupta-certificate-03','parul-gupta-certificate-01','parul-gupta-certificate-02']);
/** The Home certificates with the words of their captions. */
export function homeCertificates(ids=homeCertificateIds){
 return ids.map(id=>{
  const item=certificateCatalogue.find(entry=>entry.id===id);
  if(!item)throw new RangeError('Unknown certificate: '+id);
  return Object.freeze({
   id:item.id,
   doctor:item.doctor,
   doctorName:doctors[item.doctor].name,
   title:item.title,
   issuer:item.issuer,
   description:item.description,
   variants:item.variants
  });
 });
}

/** One giant numeral, a four-row ledger and four framed certificates. */
export const credentials=Object.freeze({
 runningHead:'Credentials',
 numeralCaption:'years caring for Lucknow families.',
 numeralEmphasis:'Lucknow families.',
 // `category` is the small label at the row's left on wide screens (spoken everywhere).
 rows:Object.freeze([
  Object.freeze({category:'Honour',title:'KGMU gold medalist',detail:doctors.parul.name,icon:'medal'}),
  // The clinic's standards have one home (shared.mjs); About explains each of them.
  ...clinicStandards.map(item=>Object.freeze({category:item.kind,title:item.name,detail:null,icon:null}))
 ]),
 certificatesLabel:'Certificates',
 // "All certificates" opens the certificate viewer; without scripts it leads to Meet the doctors.
 allCertificates:Object.freeze({label:actionLabels.allCertificates,href:pagePaths.doctors})
});
/** The section's heading in words: "30+ years caring for Lucknow families". */
export function credentialsHeading(year){return `${yearsNumeral(year)} ${credentials.numeralCaption}`;}

/** The review shelf itself is a shared part; these are the Home section's own words. */
export const reviewsSection=Object.freeze({
 // "Reviews", so the running head does not echo the heading below it.
 runningHead:'Reviews',
 heading:'In our patients’ words.',
 emphasis:'words.'
});

/** A layered postcard: the frontage, the waiting area over it, and the address card. */
export const visitingSection=Object.freeze({
 runningHead:'Visiting us',
 // The road's name stays on one line (a no-break space).
 heading:`Find us on Ring\u00A0Road, ${locality}.`,
 emphasis:`${locality}.`,
 photos:Object.freeze([
  Object.freeze({photo:'frontage',ratio:'16:9',key:'Outside',caption:photoCaptions.frontage}),
  Object.freeze({photo:'waiting',ratio:'4:5',key:'Inside',caption:photoCaptions.waitingArea})
 ]),
 card:addressCard,
 object:'map-pin'
});

/**
 * Four questions. `standIn` says how much of the answer awaits the clinic's confirmation
 * ("all" or "part"); it is for the stand-in register and is never shown to a visitor.
 */
export const questionsSection=Object.freeze({
 runningHead:'Questions',
 heading:'Before you come.',
 emphasis:'come.',
 objects:Object.freeze(['question-list','pen']),
 rows:Object.freeze([
  Object.freeze({id:'walk-in',question:'Can I walk in without an appointment?',answer:walkInAnswer,standIn:'all'}),
  Object.freeze({id:'fee-and-payment',question:'How much is a visit, and how do I pay?',answer:`${feeLabel()} per consultation with either doctor. ${paymentAnswer}`,standIn:'part'}),
  Object.freeze({id:'booking-for-someone-else',question:'Can I book for a parent or someone else?',answer:bookForSomeoneElseAnswer,standIn:'all'}),
  Object.freeze({id:'observation-care',question:'What is 24-hour observation care?',answer:observationCareSentence,standIn:'all'})
 ])
});

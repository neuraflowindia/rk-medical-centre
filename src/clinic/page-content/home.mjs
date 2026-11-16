// Words for the Home page, section by section, in the order the page shows them:
// hero (+ essentials strip) · the doctors · credentials · reviews · visiting us · questions · closing.
//
// Facts come from model.mjs, care-catalogue.mjs and certificate-catalogue.mjs; stand-ins come
// from standins.mjs; words shared with other pages come from shared.mjs. No markup lives in
// this file: emphasis, links and line breaks are separate fields and the template chooses the tags.
import {doctors,homeHeadline} from '../model.mjs';
import {topicById,doctorOrder} from '../care-catalogue.mjs';
import {certificatesFor} from '../certificate-catalogue.mjs';
import {doctorDegrees,walkInAnswer,paymentAnswer,bookForSomeoneElseAnswer,observationCareSentence} from '../standins.mjs';
import {pagePaths,actionLabels,bookWithLabel,bookWithPath,callDoctorSpoken,feeLabel,practisingSince,addressCard,photoCaptions} from './shared.mjs';

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
  Object.freeze({id:'sanjay',photo:'sanjay-portrait',name:doctors.sanjay.name,role:'Physician · Diabetes'}),
  Object.freeze({id:'parul',photo:'parul-portrait',name:doctors.parul.name,role:'Gynaecologist'})
 ])
});

// Chip → the care topic whose words it shows. A chip's id is also its place on the Treatments page.
const chipPlan=Object.freeze({
 sanjay:[
  {id:'diabetes',label:'Diabetes',topic:'diabetes',more:'More about diabetes care'},
  {id:'blood-pressure',label:'Blood pressure',topic:'blood-pressure',more:'More about blood pressure'},
  {id:'thyroid',label:'Thyroid',topic:'thyroid',more:'More about thyroid concerns'},
  {id:'fever-infections',label:'Fever & infections',topic:'fever-infections',more:'More about fever and infections'},
  {id:'general-health',label:'General check-up',topic:'general-health',more:'More about general health'}
 ],
 parul:[
  {id:'womens-health',label:'Periods & PCOS',topic:'womens-health',more:'More about period concerns and PCOS'},
  {id:'pregnancy',label:'Pregnancy',topic:'pregnancy',more:'More about pregnancy care'},
  // Care after childbirth is part of the pregnancy topic; its line is the site's existing sentence.
  {id:'after-childbirth',label:'After childbirth',topic:'pregnancy',more:'More about care after childbirth',answer:'Ask your questions about care after childbirth.'},
  {id:'ultrasound',label:'Ultrasound',topic:'ultrasound',more:'More about ultrasound scans'}
 ]
});

/** Where a chip (or a "More about…" link) lands on the Treatments page. */
export function treatmentAnchor(chipId){return `${pagePaths.treatments}#${chipId}`;}

/**
 * The chips inside one doctor's card. Each chip carries the short answer shown under the chips
 * (the care catalogue's own line for that topic: at most 140 characters, two lines at most),
 * its "More about…" link, the picture that changes with it, and where its booking leads.
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
   answer:chip.answer||topic.short,
   more:Object.freeze({label:chip.more,href:treatmentAnchor(chip.id)}),
   href:treatmentAnchor(chip.id),
   image:topic.image,
   bookHref:bookWithPath(id,topic.id)
  });
 });
}

const tones=Object.freeze({sanjay:'sage',parul:'rose'});
const tags=Object.freeze({parul:'KGMU gold medalist'});
function doctorCard(id){
 const doctor=doctors[id];
 return Object.freeze({
  id,
  tone:tones[id],
  photo:`${id}-portrait`,
  name:doctor.name,
  specialty:doctor.role,
  formal:doctor.formal,
  degrees:doctorDegrees[id],
  formalLine:`${doctor.formal} · ${doctorDegrees[id]}`,
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
 intro:`Both trained at King George’s Medical University and have practised in Lucknow since ${since}.`,
 chipPrompt:'What would you like help with?',
 cards:Object.freeze(doctorOrder.map(doctorCard))
});

/** "30+": whole decades in practice. It changes by itself when a new decade is reached. */
export function yearsNumeral(year=new Date().getFullYear(),from=since){
 return `${Math.max(0,Math.floor((year-from)/10)*10)}+`;
}

/** Two certificates from each doctor, alternating, with the words of their captions. */
export function homeCertificates(perDoctor=2){
 const picked=doctorOrder.map(id=>certificatesFor(id).slice(0,perDoctor)),list=[];
 for(let index=0;index<perDoctor;index++)for(const group of picked)if(group[index])list.push(group[index]);
 return list.map(item=>Object.freeze({
  id:item.id,
  doctor:item.doctor,
  doctorName:doctors[item.doctor].name,
  title:item.title,
  issuer:item.issuer,
  description:item.description,
  variants:item.variants
 }));
}

/** One giant numeral, a four-row ledger and four framed certificates. */
export const credentials=Object.freeze({
 runningHead:'Credentials',
 numeralCaption:'years caring for Lucknow families',
 rows:Object.freeze([
  Object.freeze({title:'KGMU gold medalist',detail:doctors.parul.name}),
  Object.freeze({title:'NABH accredited',detail:null}),
  Object.freeze({title:'ISO 9001:2015 certified',detail:null}),
  Object.freeze({title:'24-hour observation care',detail:null})
 ]),
 // "All certificates" opens the certificate viewer; without scripts it leads to Meet the doctors.
 allCertificates:Object.freeze({label:actionLabels.allCertificates,href:pagePaths.doctors})
});
/** The section's heading in words: "30+ years caring for Lucknow families". */
export function credentialsHeading(year){return `${yearsNumeral(year)} ${credentials.numeralCaption}`;}

/** The review shelf itself is a shared part; these are the Home section's own words. */
export const reviewsSection=Object.freeze({
 runningHead:'In patients’ words',
 heading:'In our patients’ words.'
});

/** A layered postcard: the frontage, the waiting area over it, and the address card. */
export const visitingSection=Object.freeze({
 runningHead:'Visiting us',
 heading:'Find us on Ring Road, Indira Nagar.',
 photos:Object.freeze([
  Object.freeze({photo:'street-frontage',ratio:'16:9',caption:photoCaptions.frontage}),
  Object.freeze({photo:'waiting-area',ratio:'4:5',caption:photoCaptions.waitingArea})
 ]),
 card:addressCard
});

/**
 * Four questions. `standIn` says how much of the answer awaits the clinic's confirmation
 * ("all" or "part"); it is for the stand-in register and is never shown to a visitor.
 */
export const questionsSection=Object.freeze({
 runningHead:'Questions',
 heading:'Before you come.',
 rows:Object.freeze([
  Object.freeze({id:'walk-in',question:'Can I walk in without an appointment?',answer:walkInAnswer,standIn:'all'}),
  Object.freeze({id:'fee-and-payment',question:'How much is a visit, and how do I pay?',answer:`${feeLabel()} per consultation with either doctor. ${paymentAnswer}`,standIn:'part'}),
  Object.freeze({id:'booking-for-someone-else',question:'Can I book for a parent or someone else?',answer:bookForSomeoneElseAnswer,standIn:'all'}),
  Object.freeze({id:'observation-care',question:'What is 24-hour observation care?',answer:observationCareSentence,standIn:'all'})
 ])
});

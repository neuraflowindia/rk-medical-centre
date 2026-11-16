// Words for the About the clinic page, section by section, in the order the page shows them:
// cover · story · standards · walk · the doctors (the closing is a shared part).
//
// About is the place and its standards. The doctors' biographies, care areas, the fee, the
// week's hours and the reviews have their homes on other pages; this page links to them.
// Facts come from model.mjs, care-catalogue.mjs and certificate-catalogue.mjs; stand-ins from
// standins.mjs or marked below. No markup lives in this file: an italic phrase is a separate
// field and the template chooses the tags.
import {doctors,locality,directions} from '../model.mjs';
import {doctorOrder} from '../care-catalogue.mjs';
import {certificateCatalogue} from '../certificate-catalogue.mjs';
import {clinicPhotos} from '../client-media.mjs';
import {observationCareSentence} from '../standins.mjs';
import {pagePaths,actionLabels,essentials,practisingSince} from './shared.mjs';
import {credentials,homeCertificates} from './home.mjs';

const since=practisingSince();
// The page says "since 1992" for the clinic as a whole; that needs one shared starting year.
if(since===null)throw new Error('The doctors no longer share a starting year: rewrite the About words that say "since".');

/** The first of these photograph records that exists (a requested crop, else what stands in for it). */
export function firstPhoto(ids,photos=clinicPhotos){
 const found=ids.find(id=>Object.hasOwn(photos,id));
 if(!found)throw new Error('None of these photographs exists: '+ids.join(', '));
 return found;
}

/**
 * The sections in page order. `ground` is the kind of background, so every boundary is visible:
 * light, tint, deep, light, tint, then the closing (light, with its inset tint panel) and the deep footer.
 */
export const aboutSections=Object.freeze([
 {id:'cover',ground:'light'},
 {id:'story',ground:'tint'},
 {id:'standards',ground:'deep'},
 {id:'walk',ground:'light'},
 {id:'doctors',ground:'tint'},
 {id:'closing',ground:'light'}
].map(Object.freeze));

/** The road the clinic stands on, as the page names it (a test checks both forms against the address). */
const ROAD='Ring Road',ROAD_FULL='Tedhi Pulia Ring Road';

/** Cover: a feature opener. The heading, one sentence that states a fact, and the frontage photograph. */
export const cover=Object.freeze({
 runningHead:'About the clinic',
 heading:`A family practice in ${locality} since ${since}.`,
 // The one phrase set in italics; it stays on one line.
 emphasis:`since ${since}.`,
 // A doctor's name never breaks across two lines (no-break spaces inside it).
 lead:`The clinic of ${doctorOrder.map(id=>doctors[id].name.replaceAll(' ','\u00A0')).join(' and ')}, on ${ROAD}.`,
 // Shown from laptop width, where the phone bar (Call · Book · Directions) is not on screen.
 call:actionLabels.call,
 directions:Object.freeze({label:actionLabels.directions,href:directions,opens:essentials.place.opens}),
 // The caption says where the picture was taken; what to look for is said once, in the walk's first step.
 photo:Object.freeze({photo:'frontage',ratio:'16:9',key:'Outside',caption:`The clinic seen from ${ROAD_FULL}.`}),
 object:'map-pin'
});

// STAND-IN — replace with the clinic's confirmed fact
// The clinic's story. Only "both doctors have practised since 1992" is confirmed (it is the
// heading, worked out from model.mjs); every sentence of `opening`, `body`, `pulled` and
// `handover` awaits the clinic's own account.
const storyWords=Object.freeze({
 opening:`A physician and a gynaecologist began seeing patients side by side in ${locality}. The idea was simple: one family, one clinic, whatever the concern.`,
 body:'It is still a small clinic. The doctor you meet today is the doctor you will meet next time.',
 pulled:'Patients who first came as children now bring their own.',
 handover:'What has changed is the standard the clinic holds itself to.'
});

/**
 * The story: the site's one long-read moment. The heading is the page's display numeral followed
 * by words ("1992 and the same two doctors ever since."). `pulled` is a sentence of the story
 * itself, set large in its place: it is printed once and is nobody's quotation.
 */
export const story=Object.freeze({
 runningHead:'Our story',
 numeral:String(since),
 heading:'and the same two doctors ever since.',
 emphasis:'ever since.',
 ...storyWords
});
/** "1992 and the same two doctors ever since.": the story's heading in plain words. */
export const storyHeading=`${story.numeral} ${story.heading}`;
/** How many words the story's column holds (the limit is 90). */
export function storyWordCount(words=story){
 return [words.opening,words.body,words.pulled,words.handover].join(' ').trim().split(/\s+/u).length;
}

// WAITING: request about-02 — the three standards move to shared.mjs as `clinicStandards`;
// until then they are read from Home's ledger, so the two pages cannot drift apart.
function standard(id,category,meaning,source){
 const row=credentials.rows.find(item=>item.category===category);
 if(!row)throw new Error('Home’s ledger no longer has a row for: '+category);
 return Object.freeze({id,kind:row.category,name:row.title,meaning,source});
}
/**
 * Standards: a quiet ledger. Each row is the standard's name, its kind, and one plain line on
 * what it means for a patient. `source` says where the line comes from and is never shown:
 * "derived" = the general meaning of that standard, in this page's words (the clinic confirms
 * the wording); "stand-in" = a marked stand-in from standins.mjs.
 */
export const standards=Object.freeze({
 runningHead:'Standards',
 heading:'Standards you can hold us to.',
 emphasis:'hold us to.',
 // A paper-cut accent beside the heading on wide screens: a written record.
 object:'report-clipboard',
 rows:Object.freeze([
  standard('nabh','Accreditation','A national board has assessed how patients are cared for and kept safe here.','derived'),
  standard('iso','Quality standard','How the clinic is run is written down, and checked by outside auditors.','derived'),
  standard('observation','Day and night',observationCareSentence,'stand-in')
 ])
});

/**
 * A walk through the clinic: the one place on the site where numbering is real. Each line under
 * a title describes only what its photograph shows. `photo` is a record in client-media.mjs.
 */
export const walk=Object.freeze({
 runningHead:'A walk through the clinic',
 heading:'From the gate to your seat.',
 emphasis:'to your seat.',
 // What the shelf holds, for assistive technology, and the viewer's title.
 label:'A walk through the clinic',
 previous:'Previous step',
 next:'Next step',
 previousPhoto:'Previous photograph',
 nextPhoto:'Next photograph',
 ratio:'4:5',
 steps:Object.freeze([
  // WAITING: request about-01 — until the two crops exist, step 1 shows the cover's frontage and step 2 the old entrance picture.
  Object.freeze({id:'arrive',title:`Arrive at the green wall on ${ROAD}`,line:'The gate is under the blue board with both doctors’ names.',photo:firstPhoto(['walk-gate','frontage'])}),
  Object.freeze({id:'doors',title:'Through the glass doors',line:'Glass doors marked with red crosses, under the white canopy.',photo:firstPhoto(['walk-doors','entrance'])}),
  Object.freeze({id:'waiting',title:'The covered waiting area',line:'Chairs under a high roof, beside the pharmacy counter.',photo:'waiting'})
 ])
});
/** "Step 2: " — spoken before a step's title (the numeral beside it is decoration). */
export const stepSpoken=number=>`Step ${number}: `;
/** The spoken name of the button that opens a step's photograph. */
export const viewPhotoLabel=title=>`View photograph: ${title}`;
/** "2 of 3": where the viewer stands. */
export const walkPosition=(number,total)=>`${number} of ${total}`;
/** A step's heading inside the viewer: "2 · Through the glass doors". */
export const walkViewerTitle=(number,title)=>`${number} · ${title}`;

/**
 * Two certificates for the teaser, one per doctor: each doctor's first in the approved catalogue
 * order that Home does not already show, so the two pages show different documents.
 */
export function teaserCertificates(catalogue=certificateCatalogue,shownOnHome=homeCertificates()){
 const taken=new Set(shownOnHome.map(item=>item.id));
 return doctorOrder.map(id=>{
  const own=catalogue.filter(item=>item.doctor===id);
  const pick=own.find(item=>!taken.has(item.id))||own[0];
  if(!pick)throw new Error('No certificate is recorded for '+doctors[id].name);
  return pick;
 });
}

/**
 * The doctors: who a visitor will meet. The two mini-cards (a shared part) name them and lead to
 * their profiles; the closing below carries Book and Call. `certificates` is the teaser: two
 * framed documents (from tablet width) and one ruled line whose link opens all of them in the
 * shared viewer (without scripts it leads to Meet the doctors). Their homes are Home's
 * credentials section and each doctor's profile.
 */
export const doctorsSection=Object.freeze({
 runningHead:'The doctors',
 heading:'And the doctors you will meet.',
 emphasis:'you will meet.',
 cards:Object.freeze([...doctorOrder]),
 certificates:Object.freeze({
  label:'Their training',
  shownLabel:'Two of the doctors’ certificates',
  shown:Object.freeze(teaserCertificates()),
  link:`All ${certificateCatalogue.length} certificates`,
  href:pagePaths.doctors
 })
});

/** Every section's words under one name. */
export const aboutPage=Object.freeze({cover,story,standards,walk,doctors:doctorsSection});

/** The photographs this page shows, cover first: record ids in client-media.mjs. */
export const aboutPhotographs=Object.freeze([cover.photo.photo,...walk.steps.map(step=>step.photo)]);

/**
 * What on this page awaits the clinic, for the project's stand-in register and the hand-over.
 * `kind` "stand-in" = written here and marked above; "derived" = this page's wording of a
 * general meaning or of what a photograph shows, for the clinic to confirm.
 */
export const aboutRegister=Object.freeze([
 {key:'story.opening',kind:'stand-in',label:'About, the story: how the clinic began',value:story.opening},
 {key:'story.body',kind:'stand-in',label:'About, the story: the clinic today',value:story.body},
 {key:'story.pulled',kind:'stand-in',label:'About, the story: the pulled line',value:story.pulled},
 {key:'story.handover',kind:'stand-in',label:'About, the story: the last line',value:story.handover},
 ...standards.rows.filter(row=>row.source==='derived').map(row=>({key:`standards.${row.id}`,kind:'derived',label:`About, what "${row.name}" means for a patient`,value:row.meaning})),
 {key:'cover.photo.caption',kind:'derived',label:'About, caption under the frontage photograph',value:cover.photo.caption},
 ...walk.steps.map(step=>({key:`walk.${step.id}`,kind:'derived',label:`About, the walk: line under "${step.title}"`,value:step.line}))
].map(Object.freeze));

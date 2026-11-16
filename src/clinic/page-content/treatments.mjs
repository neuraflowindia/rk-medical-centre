// Words for the Treatments page, and which row an address asks for.
//
// The page is a contents page: two groups, each headed by its doctor, and nine rows. A row is a
// concern a patient would name. Eight are the care catalogue's own topics; "Care after
// childbirth" is a row of its own inside the catalogue's pregnancy topic. The rows, their order,
// their ids and their pictures are the Home chips' (page-content/home.mjs), so a chip always
// lands on its own row and a concern never changes its picture between pages.
//
// Facts come from model.mjs and care-catalogue.mjs. The short lines written here (`deck`, `what`,
// `when`) are tightened from the catalogue's own words for that topic and add no medical claim;
// the clinic confirms the wording. No markup lives in this file.
import {doctors} from '../model.mjs';
import {groups,topicById,aliases,doctorOrder} from '../care-catalogue.mjs';
import {doctorChips} from './home.mjs';
import {pagePaths,feeLabel} from './shared.mjs';

/**
 * The page's own lines for each row.
 *   deck   the one line under the row's name: what a patient would come for
 *   what   "What it is"
 *   when   "When to come"
 *   title  only where the row's name is not the catalogue topic's title
 *   chipTitle  true where the row is named exactly as its Home chip
 */
const rowWords=Object.freeze({
 diabetes:{
  deck:'Sugar readings, reports and ongoing care.',
  what:'A consultation about living with diabetes: your reports, your readings and your ongoing care.',
  when:'When you have new reports, notice a change, or want to ask about your care.'
 },
 'blood-pressure':{
  deck:'Your readings and your current care.',
  what:'A consultation about your blood pressure, the readings you have taken and your current care.',
  when:'When your readings concern you, or something has changed since your last consultation.'
 },
 thyroid:{
  deck:'A thyroid report, or follow-up care.',
  what:'A consultation about a thyroid concern, an existing report or your follow-up care.',
  when:'When something has been troubling you, or you have questions about treatment you already take.'
 },
 'fever-infections':{
  deck:'Fever and common infections.',
  what:'A consultation for fever or an infection concern, including questions about dengue, malaria, tuberculosis or typhoid.',
  when:'When a fever or an infection is worrying you. Tell the doctor when it began and what care you have had.'
 },
 'general-health':{
  deck:'Everyday illness and follow-up visits.',
  what:'A consultation for an everyday health concern, an illness that keeps returning, or a follow-up visit.',
  when:'When something has changed, or you have a question you want answered.'
 },
 'womens-health':{
  chipTitle:true,
  deck:'Period problems, PCOS and other concerns.',
  what:'A consultation about period problems, PCOS or another women’s health concern. PCOS is a condition that can affect periods and hormone levels.',
  when:'When your periods have changed, or something has been troubling you.'
 },
 pregnancy:{
  deck:'Check-ups through your pregnancy.',
  what:'Check-ups during pregnancy, with time for your nutrition questions and any concerns.',
  when:'During your pregnancy, for a check-up or whenever you have a concern.'
 },
 // A row of its own inside the pregnancy topic; its name is the clinic's own care line (model.mjs).
 'after-childbirth':{
  title:'Care after childbirth',
  deck:'Your care and questions after delivery.',
  what:'A consultation about your care after childbirth, with time for all your questions.',
  when:'After your delivery, when you have questions about your care.'
 },
 ultrasound:{
  deck:'Pregnancy and pelvic scans.',
  what:'Pregnancy and pelvic ultrasound scans. Ultrasound uses sound waves to create images inside the body.',
  when:'Call the clinic first to ask about the scan you need and how to prepare.'
 }
});

// Each doctor's colour family, as on Home: never the only cue, the name is always beside it.
const tones=Object.freeze({sanjay:'sage',parul:'rose'});

/** Where a row lives on this page: "#diabetes". Home's chips link to the same place. */
export function rowAnchor(id){return `#${id}`;}
/** The whole address of a row, for a link from another page. */
export function rowAddress(id){return `${pagePaths.treatments}${rowAnchor(id)}`;}

function row(chip,doctor){
 const words=rowWords[chip.id],topic=topicById(chip.topic);
 if(!words)throw new Error(`The Treatments page has no words for the row "${chip.id}".`);
 return Object.freeze({
  id:chip.id,
  doctor,
  // The catalogue topic this row belongs to: what a booking made from the row carries.
  topic:topic.id,
  title:words.chipTitle?chip.label:(words.title||topic.title),
  deck:words.deck,
  what:words.what,
  when:words.when,
  bring:Object.freeze([...topic.bring]),
  object:chip.object,
  href:rowAnchor(chip.id)
 });
}

/**
 * The two groups in page order, each with its doctor and its rows. A group's id is the care
 * catalogue's area id (`physician`, `women`): older links to `#physician` and `#women` land on it.
 */
export const treatmentGroups=Object.freeze(doctorOrder.map(id=>{
 const group=groups.find(item=>item.doctor===id);
 if(!group)throw new Error(`The care catalogue has no group for the doctor "${id}".`);
 return Object.freeze({
  id:group.id,
  doctor:id,
  tone:tones[id],
  name:doctors[id].name,
  role:doctors[id].role,
  rows:Object.freeze(doctorChips(id).map(chip=>row(chip,id)))
 });
}));

/** Every row, in page order. */
export const treatmentRows=Object.freeze(treatmentGroups.flatMap(group=>group.rows));
export const rowIds=Object.freeze(treatmentRows.map(item=>item.id));
export const groupIds=Object.freeze(treatmentGroups.map(group=>group.id));
/** One row by its id, or null. */
export function rowById(id){return treatmentRows.find(item=>item.id===id)||null;}
/** The group a row belongs to, or null. */
export function groupOfRow(id){return treatmentGroups.find(group=>group.rows.some(item=>item.id===id))||null;}

function placeOf(hash){
 const raw=String(hash||'').replace(/^#/,'');
 try{return decodeURIComponent(raw);}catch{return '';}
}
/**
 * What an address asks this page to show: a row to open and bring into view, or only a group to
 * bring into view. Understood, in this order:
 *   #<row>                         the page's own places (Home's chips use them)
 *   #physician · #women            a doctor's group (older links)
 *   ?topic=<row or catalogue topic>
 *   ?service=physician|gynecology|pregnancy|ultrasound   (the catalogue's older names)
 *   ?area=physician|women          a doctor's group
 * Anything else asks for nothing: the page opens as usual.
 */
export function arrivalFor({search='',hash=''}={}){
 const none=Object.freeze({row:null,group:null});
 const forRow=id=>Object.freeze({row:id,group:groupOfRow(id).id});
 const place=placeOf(hash);
 if(rowIds.includes(place))return forRow(place);
 if(groupIds.includes(place))return Object.freeze({row:null,group:place});
 let query;
 try{query=new URLSearchParams(String(search||''));}catch{return none;}
 const topic=query.get('topic');
 if(rowIds.includes(topic))return forRow(topic);
 const service=query.get('service');
 if(service&&Object.hasOwn(aliases,service)&&rowIds.includes(aliases[service]))return forRow(aliases[service]);
 const area=query.get('area');
 if(groupIds.includes(area))return Object.freeze({row:null,group:area});
 return none;
}

export const treatmentsPage=Object.freeze({
 runningHead:'Treatments',
 heading:'What we can help with.',
 // The one phrase of the heading set in italics.
 emphasis:'help with.',
 // The first-screen action: one raised row that opens the call sheet.
 guide:Object.freeze({lead:'Not sure?',rest:'Call and we will guide you.'}),
 // The index's spoken name.
 indexLabel:'Choose a concern',
 // The three labelled lines of an open row.
 labels:Object.freeze({what:'What it is',when:'When to come',bring:'What to bring'}),
 // The quiet line beside the doctor's name in an open row.
 fee:`${feeLabel()} per consultation`,
 // The two doctors, for a concern that is not on the list. The phrase echoes the clinic's headline.
 doctors:Object.freeze({heading:'Something else on your mind?',emphasis:'on your mind?'}),
 groups:treatmentGroups
});

/** What is announced when a row opens. */
export function showingLabel(title){return `Showing ${title}`;}

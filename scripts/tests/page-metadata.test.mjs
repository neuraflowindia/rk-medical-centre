import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pageMetadata,utilityMetadata,metadataFor,applyPageMetadata,siteOrigin} from '../../src/clinic/page-metadata.mjs';
import {renderPublicDocument,sharingTags} from '../../src/clinic/public-document.mjs';
import {doctors,doctorFacts} from '../../src/clinic/model.mjs';
import {createPage} from './support/mini-dom.mjs';
import {renderedApp} from './support/page-contract.mjs';

const shell=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const readable=html=>html.replace(/<[^>]+>/g,' ').replaceAll('&nbsp;',' ').replaceAll('&amp;','&').replaceAll('&#39;','\'').replaceAll('’','\'').replace(/\s+/g,' ');
/** The reviewed titles: they never change (search continuity). */
const TITLES={
 '/':'Physician & Women\'s Health in Lucknow | R. K. Medical Centre',
 '/treatment':'Treatments in Lucknow | R. K. Medical Centre',
 '/about-clinic':'About the Clinic | R. K. Medical Centre, Lucknow',
 '/meet-doctor':'Meet the Doctors | R. K. Medical Centre, Lucknow',
 '/dr-sanjay-gupta':'Dr. Sanjay Gupta, Physician in Lucknow | R. K. Medical Centre',
 '/dr-parul-gupta':'Dr. Parul Gupta, Women\'s Health in Lucknow | R. K. Medical Centre',
 '/contact':'Contact & Directions | R. K. Medical Centre, Lucknow'
};
/** Words of each description that must be on its page, in both booking states (a description says only what the page shows). */
const ON_THE_PAGE={
 '/':['physician','gynaecologist','Lucknow families','1992','Dr. Sanjay Gupta','Dr. Parul Gupta','R. K. Medical Centre','Indira Nagar'],
 '/treatment':['Dr. Sanjay Gupta','Dr. Parul Gupta','Diabetes','Blood pressure','Thyroid','Fever','Periods','Pregnancy','Ultrasound'],
 '/about-clinic':['R. K. Medical Centre','Indira Nagar','1992','NABH accredited','ISO 9001:2015 certified','24-hour observation care'],
 '/meet-doctor':['Dr. Sanjay Gupta','Dr. Parul Gupta','R. K. Medical Centre'],
 '/dr-sanjay-gupta':['Dr. Sanjay Gupta','physician and diabetologist','1992','Indira Nagar'],
 '/dr-parul-gupta':['Dr. Parul Gupta','senior woman gynaecologist','gold medalist','PCOS','Indira Nagar'],
 '/contact':['Dr. Sanjay Gupta','Dr. Parul Gupta','R. K. Medical Centre','Ring Road','Indira Nagar','Lucknow']
};

test('titles stay as they were; each description is one sentence of at most 155 characters',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(pageMetadata).map(([path,entry])=>[path,entry.title])),TITLES);
 for(const [path,{description}] of Object.entries(pageMetadata)){
  assert.ok(description.length<=155,`${path}: ${description.length} characters`);assert.ok(description.length>=110,`${path}: too short to be useful`);
  assert.match(description,/[a-z]\.$/,`${path}: ends as a sentence`);
  assert.equal((description.replace(/Dr\. |R\. K\. /g,'').match(/[.!?](?:\s|$)/g)||[]).length,1,`${path}: one sentence`);
  assert.doesNotMatch(description,/undefined|null|NaN|\s{2}/,path);
  assert.doesNotMatch(description,/['"]/,`${path}: no typewriter quotation marks`);
 }
 assert.equal(new Set(Object.values(pageMetadata).map(entry=>entry.description)).size,7,'no two pages share a description');
});

test('a description stays true whether online booking is on or off, and says only what its page shows',()=>{
 for(const [path,{description}] of Object.entries(pageMetadata)){
  assert.doesNotMatch(description,/\bbook(?:ing|s|ed)?\b|\bonline\b/i,`${path}: a description never promises online booking`);
  for(const mode of ['on','off']){
   const page=readable(renderedApp(path,mode)).toLowerCase();
   for(const words of ON_THE_PAGE[path])assert.ok(page.includes(words.toLowerCase()),`${path} ${mode}: "${words}" is in the description but not on the page`);
  }
  // every proper name and number in the description is one of the checked facts
  for(const words of ON_THE_PAGE[path].filter(item=>/^[A-Z0-9]/.test(item)))assert.ok(description.toLowerCase().includes(words.toLowerCase())||!/\d/.test(words),`${path}: "${words}"`);
 }
 // facts are read from the clinic's model, not retyped
 assert.ok(pageMetadata['/'].description.includes(String(doctorFacts.sanjay.since))&&pageMetadata['/'].description.includes(doctors.sanjay.name)&&pageMetadata['/'].description.includes(doctors.parul.name));
});

test('the booking screens keep their titles and are never listed',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(utilityMetadata).map(([path,entry])=>[path,entry.title])),
  {'/booking':'Book your visit | R. K. Medical Centre','/booking-details':'Find your booking | R. K. Medical Centre','/booking-help':'Find your booking | R. K. Medical Centre'});
 for(const [path,{description}] of Object.entries(utilityMetadata)){assert.ok(description.length<=155,path);assert.match(description,/R\. K\. Medical Centre/);}
 assert.match(utilityMetadata['/booking'].description,new RegExp(`Pay ₹${doctorFacts.sanjay.fee} at the clinic\\.$`));
 assert.equal(utilityMetadata['/booking-help'].description,utilityMetadata['/booking-details'].description);
 assert.equal(metadataFor('/booking'),utilityMetadata['/booking']);assert.equal(metadataFor('/'),pageMetadata['/']);assert.match(metadataFor('/somewhere-else').title,/Appointment details/);
});

test('a shared address shows the page\'s own title, description, address and the clinic\'s picture',()=>{
 for(const path of Object.keys(pageMetadata)){
  const tags=sharingTags(path),entry=pageMetadata[path];
  const value=name=>new RegExp(`<meta (?:property|name)="${name}" content="([^"]*)">`).exec(tags)?.[1];
  assert.equal(value('og:title'),entry.title.replaceAll('&','&amp;'));assert.equal(value('twitter:title'),value('og:title'));
  assert.equal(value('og:description'),entry.description);assert.equal(value('twitter:description'),entry.description);
  assert.equal(value('og:url'),siteOrigin+path);assert.equal(value('og:type'),'website');assert.equal(value('og:site_name'),'R. K. Medical Centre');
  assert.equal(value('og:image'),siteOrigin+'/clinic-assets/rk-medical-centre-social.png');assert.equal(value('twitter:card'),'summary_large_image');
  for(const mode of ['on','off']){
   const document=renderPublicDocument({path,mode,booking:false,html:shell});
   for(const name of ['og:title','og:description','og:url','og:image','twitter:card'])assert.equal(document.split(`"${name}"`).length-1,1,`${path} ${mode}: ${name} is printed once`);
   assert.ok(document.indexOf('og:title')<document.indexOf('</head>'));
  }
 }
 assert.throws(()=>sharingTags('/booking'),/Not a public page/);
});

test('in the browser a page change brings the new page\'s title, description and sharing tags; a booking screen loses the public ones',()=>{
 const page=createPage({html:'<head><meta name="description" content="old"></head><body></body>'});
 applyPageMetadata('/about-clinic',page.document);
 const meta=selector=>page.document.head.querySelector(selector)?.content;
 assert.equal(page.document.title,TITLES['/about-clinic']);assert.equal(meta('meta[name="description"]'),pageMetadata['/about-clinic'].description);
 assert.equal(meta('meta[property="og:description"]'),pageMetadata['/about-clinic'].description);assert.equal(meta('meta[property="og:url"]'),siteOrigin+'/about-clinic');
 assert.equal(meta('meta[name="robots"]'),'index, follow');assert.equal(page.document.head.querySelector('link[rel="canonical"]').href,siteOrigin+'/about-clinic');
 assert.match(page.document.head.querySelector('script[data-site-graph]').textContent,/"@type":"MedicalClinic"/);
 applyPageMetadata('/booking',page.document);
 assert.equal(page.document.title,'Book your visit | R. K. Medical Centre');assert.equal(meta('meta[name="robots"]'),'noindex, nofollow');
 assert.equal(page.document.head.querySelector('link[rel="canonical"]'),null);assert.equal(page.document.head.querySelector('script[data-site-graph]'),null);assert.equal(page.document.head.querySelector('meta[property="og:url"]'),null);
});

import {publicGraph} from './page-schema.mjs';
import {city,clinicOverview,doctorFacts,doctors,locality} from './model.mjs';

/**
 * Reviewed public page copy; booking utilities are deliberately excluded.
 *
 * Titles are unchanged from the earlier site (search continuity). Each description is one
 * sentence of at most 155 characters that says only what its page shows, and stays true whether
 * online booking is on or off (so none of them promises booking). Facts that can change (the
 * doctors' names, the year, the fee) are read from model.mjs, never retyped.
 */
export const siteOrigin='https://www.rkmedicalcentre.com';
const clinic='R. K. Medical Centre',overview=clinicOverview();
const {sanjay,parul}=doctors,since=overview.since??doctorFacts.sanjay.since,place=`${locality}, ${city}`;
export const pageMetadata=Object.freeze({
  "/": {
    "title": "Physician & Women's Health in Lucknow | R. K. Medical Centre",
    "description": `A physician and a gynaecologist caring for ${city} families since ${since}: ${sanjay.name} and ${parul.name} at ${clinic}, ${locality}.`
  },
  "/treatment": {
    "title": "Treatments in Lucknow | R. K. Medical Centre",
    "description": `What ${sanjay.name} and ${parul.name} can help with in ${city}: diabetes, blood pressure, thyroid, fever, periods, pregnancy and ultrasound scans.`
  },
  "/about-clinic": {
    "title": "About the Clinic | R. K. Medical Centre, Lucknow",
    "description": `${clinic} is a family practice in ${place}, since ${since}: NABH accredited, ISO 9001:2015 certified, 24-hour observation care.`
  },
  "/meet-doctor": {
    "title": "Meet the Doctors | R. K. Medical Centre, Lucknow",
    "description": `Meet ${sanjay.name}, physician, and ${parul.name}, gynaecologist, at ${clinic}, ${city}: who treats what, and how to arrange a visit.`
  },
  "/dr-sanjay-gupta": {
    "title": "Dr. Sanjay Gupta, Physician in Lucknow | R. K. Medical Centre",
    "description": `${sanjay.name}, physician and diabetologist in ${place}, in practice since ${since}: what he treats, his next clinic session, how to reach him.`
  },
  "/dr-parul-gupta": {
    "title": "Dr. Parul Gupta, Women's Health in Lucknow | R. K. Medical Centre",
    "description": `${parul.name}, a senior woman gynaecologist and KGMU gold medalist in ${place}: periods, PCOS and pregnancy care, and how to reach her.`
  },
  "/contact": {
    "title": "Contact & Directions | R. K. Medical Centre, Lucknow",
    "description": `Call ${sanjay.name} or ${parul.name}, send a message, see clinic hours and find ${clinic} on Ring Road, ${place}.`
  }
});
/** The booking screens: never listed by search engines; shown only while online booking is on. */
export const utilityMetadata=Object.freeze({
 '/booking':{title:'Book your visit | R. K. Medical Centre',description:`Choose your doctor, a day and a starting time at ${clinic}, ${place}. ${overview.fee===null?'Pay':`Pay ₹${overview.fee}`} at the clinic.`},
 '/booking-details':{title:'Find your booking | R. K. Medical Centre',description:`See your appointment at ${clinic} with the name and phone number you booked with.`},
 '/booking-help':{title:'Find your booking | R. K. Medical Centre',description:`See your appointment at ${clinic} with the name and phone number you booked with.`}
});
export function metadataFor(path){return pageMetadata[path]||utilityMetadata[path]||{title:'Appointment details | R. K. Medical Centre',description:'View your clinic appointment details.'};}
export function applyPageMetadata(path,documentObject=document){
 const entry=metadataFor(path),canonical=siteOrigin+path,robots=Object.hasOwn(pageMetadata,path)?'index, follow':'noindex, nofollow';
 documentObject.title=entry.title;
 const set=(attribute,key,value)=>{const selector=`meta[${attribute}="${key}"]`;let element=documentObject.head.querySelector(selector);
  if(!element){element=documentObject.createElement('meta');element.setAttribute(attribute,key);documentObject.head.append(element);}element.content=value;};
 set('name','description',entry.description);set('name','robots',robots);set('name','googlebot',robots);
 for(const prefix of ['og','twitter']){set(prefix==='og'?'property':'name',prefix+':title',entry.title);set(prefix==='og'?'property':'name',prefix+':description',entry.description);set(prefix==='og'?'property':'name',prefix+':image',siteOrigin+'/clinic-assets/rk-medical-centre-social.png');}
 set('property','og:type','website');set('name','twitter:card','summary_large_image');
 let link=documentObject.head.querySelector('link[rel="canonical"]');
 let graph=documentObject.head.querySelector('script[data-site-graph]');if(!Object.hasOwn(pageMetadata,path)){link?.remove();graph?.remove();for(const selector of ['meta[property="og:url"]','meta[name="twitter:url"]'])documentObject.head.querySelector(selector)?.remove();return;}
 set('property','og:url',canonical);
 if(!link){link=documentObject.createElement('link');link.rel='canonical';documentObject.head.append(link);}link.href=canonical;
 if(!graph){graph=documentObject.createElement('script');graph.type='application/ld+json';graph.setAttribute('data-site-graph','');documentObject.head.append(graph);}graph.textContent=JSON.stringify(publicGraph(siteOrigin,path,entry));
}

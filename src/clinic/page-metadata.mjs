import {publicGraph} from './page-schema.mjs';
/** Reviewed public page copy; booking utilities are deliberately excluded. */
export const siteOrigin='https://www.rkmedicalcentre.com';
export const pageMetadata=Object.freeze({
  "/": {
    "title": "Physician & Women's Health in Lucknow | R. K. Medical Centre",
    "description": "Speak with Dr. Sanjay Gupta or Dr. Parul Gupta about diabetes, everyday illnesses, women's health or pregnancy at the clinic in Lucknow."
  },
  "/treatment": {
    "title": "Treatments in Lucknow | R. K. Medical Centre",
    "description": "See what the clinic's physician and women's-health services cover, which doctor to choose and what to bring for your visit."
  },
  "/about-clinic": {
    "title": "About the Clinic | R. K. Medical Centre, Lucknow",
    "description": "Find out about R. K. Medical Centre, the doctors, clinic hours, observation care and what to know before coming for a visit."
  },
  "/meet-doctor": {
    "title": "Meet the Doctors | R. K. Medical Centre, Lucknow",
    "description": "Read about Dr. Sanjay Gupta and Dr. Parul Gupta, their areas of care and how to choose the doctor for your clinic appointment."
  },
  "/dr-sanjay-gupta": {
    "title": "Dr. Sanjay Gupta, Physician in Lucknow | R. K. Medical Centre",
    "description": "Read about Dr. Sanjay Gupta's care for diabetes, blood pressure, thyroid concerns and everyday illnesses, and prepare for an in-person visit."
  },
  "/dr-parul-gupta": {
    "title": "Dr. Parul Gupta, Women's Health in Lucknow | R. K. Medical Centre",
    "description": "Read about Dr. Parul Gupta's care for women's health, pregnancy and ultrasound questions, and prepare for your visit to the clinic."
  },
  "/contact": {
    "title": "Contact & Directions | R. K. Medical Centre, Lucknow",
    "description": "Find the clinic's phone numbers, address, visiting hours and Google Maps directions. Contact the clinic about an appointment or a question."
  }
});
export const utilityMetadata=Object.freeze({
 '/booking':{title:'Book your visit | R. K. Medical Centre',description:'Choose your doctor and an available starting time.'},
 '/booking-details':{title:'Find your booking | R. K. Medical Centre',description:'View your appointment details.'},
 '/booking-help':{title:'Find your booking | R. K. Medical Centre',description:'View your appointment details.'}
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

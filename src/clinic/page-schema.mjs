import {doctors,directions,consultationSessions} from './model.mjs';
export function serializeGraph(graph){return JSON.stringify(graph).replaceAll('<','\\u003c');}
const clock=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
/**
 * The week's appointment times as a search engine reads them: one entry per session, for the
 * days it runs on. They are the same times the site's own live sign and timetable are built from.
 */
export function openingHours(sessions=consultationSessions){
 const weekdays=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 return [...sessions.weekday.map(([opens,closes])=>({'@type':'OpeningHoursSpecification',dayOfWeek:weekdays,opens:clock(opens),closes:clock(closes)})),
  ...sessions.sunday.map(([opens,closes])=>({'@type':'OpeningHoursSpecification',dayOfWeek:['Sunday'],opens:clock(opens),closes:clock(closes)}))];
}
export function publicGraph(origin,path,entry){
 const business={'@type':'MedicalClinic','@id':origin+'/#clinic',name:'R. K. Medical Centre',url:origin,
  address:{'@type':'PostalAddress',streetAddress:'18/469/1, Tedhi Pulia Ring Road, Sector 18, Indira Nagar',addressLocality:'Lucknow',addressRegion:'Uttar Pradesh',postalCode:'226016',addressCountry:'IN'},
  telephone:doctors.sanjay.tel,hasMap:directions,image:origin+'/clinic-assets/rk-medical-centre-social.png',openingHoursSpecification:openingHours()};
 // each doctor with the number the site gives for them
 const people=Object.values(doctors).map(d=>({'@type':'Person','@id':origin+d.path+'#doctor',name:d.name,url:origin+d.path,description:d.role,telephone:d.tel,worksFor:{'@id':business['@id']}}));
 return {'@context':'https://schema.org','@graph':[business,...people,{'@type':'WebPage','@id':origin+path+'#page',url:origin+path,name:entry.title,description:entry.description,about:{'@id':business['@id']}}]};
}

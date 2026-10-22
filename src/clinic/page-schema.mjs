import {doctors,directions} from './model.mjs';
export function serializeGraph(graph){return JSON.stringify(graph).replaceAll('<','\\u003c');}
export function publicGraph(origin,path,entry){
 const business={'@type':'MedicalClinic','@id':origin+'/#clinic',name:'R. K. Medical Centre',url:origin,
  address:{'@type':'PostalAddress',streetAddress:'18/469/1, Tedhi Pulia Ring Road, Sector 18, Indira Nagar',addressLocality:'Lucknow',addressRegion:'Uttar Pradesh',postalCode:'226016',addressCountry:'IN'},
  telephone:doctors.sanjay.tel,hasMap:directions,image:origin+'/clinic-assets/rk-medical-centre-social.png'};
 const people=Object.values(doctors).map(d=>({'@type':'Person','@id':origin+d.path+'#doctor',name:d.name,url:origin+d.path,description:d.role,worksFor:{'@id':business['@id']}}));
 return {'@context':'https://schema.org','@graph':[business,...people,{'@type':'WebPage','@id':origin+path+'#page',url:origin+path,name:entry.title,description:entry.description,about:{'@id':business['@id']}}]};
}

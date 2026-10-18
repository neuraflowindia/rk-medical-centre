export const doctors={parul:{name:'Dr. Parul Gupta',initials:'PG',role:"Women's health and pregnancy care",formal:'Obstetrics & Gynaecology',path:'/dr-parul-gupta',phone:'+91 98386 55095',tel:'+919838655095'},sanjay:{name:'Dr. Sanjay Gupta',initials:'SG',role:'General health and diabetes care',formal:'Physician & Diabetology',path:'/dr-sanjay-gupta',phone:'+91 94150 49410',tel:'+919415049410'}};
export const address='18/469/1, Tedhi Pulia Ring Road, Sector 18, Indira Nagar, Lucknow, UP - 226016';
export const locality='Indira Nagar';
export const city='Lucknow';
export const homeHeadline='Expert care for the health concerns on your mind.';
export const directions='https://maps.app.goo.gl/dcU6nhMtEiZTQdBo9';
export const appointmentTimes={weekday:'10:00 am–1:30 pm and 6:00 pm–8:30 pm',sunday:'10:00 am–1:30 pm. No evening appointments.'};
export const doctorFacts={
sanjay:{education:'MBBS, DGO — KGMU Lucknow',fullEducation:'MBBS, DGO — King George’s Medical University (KGMU), Lucknow',educationText:'Dr. Sanjay Gupta holds MBBS and DGO qualifications from King George’s Medical University in Lucknow.',since:1992,fee:800,brief:'See Dr. Sanjay Gupta for general health concerns, diabetes, blood pressure, thyroid concerns or fever.',summary:'Dr. Sanjay Gupta provides general health and diabetes consultations. He also sees patients for blood pressure, thyroid concerns, fever and other illnesses.',care:[{text:'Diabetes',topic:'diabetes'},{text:'Blood pressure',topic:'blood-pressure'},{text:'Thyroid concerns',topic:'thyroid'},{text:'Fever and infections',topic:'fever-infections'},{text:'General health',topic:'general-health'}]},
parul:{education:'KGMU gold medalist',fullEducation:'KGMU gold medalist — King George’s Medical University, Lucknow',educationText:'Dr. Parul Gupta is a gold medalist from King George’s Medical University in Lucknow.',since:1992,fee:800,brief:'See Dr. Parul Gupta for period concerns, pregnancy check-ups and care after childbirth.',summary:'Dr. Parul Gupta provides women’s health and pregnancy consultations, including period concerns, pregnancy check-ups and care after childbirth.',care:[{text:'Period concerns and PCOS',topic:'womens-health'},{text:'Pregnancy check-ups',topic:'pregnancy'},{text:'Care after childbirth',topic:'pregnancy'},{text:'Ultrasound questions',topic:'ultrasound'}]}
};
export function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

export function clinicOverview(){
 const entries=Object.entries(doctorFacts),shared=key=>{
  const values=[...new Set(entries.map(([,facts])=>facts[key]))];return values.length===1?values[0]:null;
 };
 const since=shared('since'),fee=shared('fee');
 const experience=entries.map(([id,facts])=>`${doctors[id].name}: since ${facts.since}`).join('; ');
 const fees=entries.map(([id,facts])=>`${doctors[id].name}: ₹${facts.fee}`).join('; ');
 return {count:entries.length,since,fee,experience,fees,
  practiceStatement:since===null?experience:`Both doctors have been practising since ${since}.`,
  feeStatement:fee===null?fees:`₹${fee} for either doctor.`};
}

export function aboutDoctorIntroduction(id){
 const facts=doctorFacts[id];
 return id==='sanjay'
  ?`${facts.educationText} He has been practising since ${facts.since} and sees patients for diabetes, blood pressure, thyroid concerns, fever and everyday health problems.`
  :`${facts.educationText.replace(/\.$/,'')} and has been practising since ${facts.since}. Patients can meet her for period concerns, pregnancy check-ups and care after childbirth.`;
}

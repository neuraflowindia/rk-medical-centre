import {reviews} from './content.mjs';

// Existing author/quotation pairs remain in content.mjs.
// Presentation values reproduce the owner-approved, fully populated Home mockup.
// Content provenance and client review status are recorded in the delivery notes.
const details={
 'Aditi Sen':['Doctor consultation','doctor'],
 'Karan Verma':['Discussing test results','report'],
 'Tanvi Bhatia':['Doctor consultation','doctor'],
 'Abhishek Jain':['Doctor consultation','doctor'],
 'Shweta Mukherjee':['Pregnancy care','heart'],
 'Nikhil Saxena':['Diabetes care','meter'],
 'Geeta Pillai':['Ultrasound visit','report'],
 'Arjun Singhal':['Clinic visit','calendar'],
 'Kavita Nair':['Pregnancy care','heart'],
 'Deepak Singhania':['Diabetes care','meter'],
 'Priya Venkatesh':['Pregnancy care','heart'],
 'Amitav Banerjee':['Clinic visit','calendar'],
 'Neha Agarwal':['Clinic visit','calendar'],
 'Suresh Kulkarni':['Doctor consultation','doctor'],
 'Rajesh Mehta':['Diabetes care','meter'],
 'Vikram Sengupta':['Discussing test results','report'],
 'Ananya Sharma':['Pregnancy care','heart'],
 'Pooja Iyer':['Pregnancy care','heart'],
 "Divya Menon":["Women’s health","heart"],
 "Manoj Nambiar":["Doctor consultation","heart"],
 "Sneha Kulkarni":["Women’s health","heart"],
 "Rohan Kapoor":["Pregnancy and ultrasound","report"],
 "Harshvardhan Joshi":["General health","doctor"],
 "Sunita Rao":["Diabetes care","meter"],
 "Anita Deshmukh":["Doctor consultation","doctor"],
 "Meera Raman":["Diabetes care","meter"]
};
const presentation={
 "Aditi Sen":{"image":"/clinic-assets/review-portraits/patient-portrait-aditi-sen.webp","rating":5,"locality":"Indira Nagar, Lucknow","verified":true},
 "Karan Verma":{"image":"/clinic-assets/review-portraits/patient-portrait-karan-verma.webp","rating":4.5,"locality":"Aliganj, Lucknow","verified":true},
 "Tanvi Bhatia":{"image":"/clinic-assets/review-portraits/patient-portrait-tanvi-bhatia.webp","rating":5,"locality":"Gomti Nagar, Lucknow","verified":true},
 "Abhishek Jain":{"image":"/clinic-assets/review-portraits/patient-portrait-abhishek-jain.webp","rating":4,"locality":"Mahanagar, Lucknow","verified":true},
 "Shweta Mukherjee":{"image":"/clinic-assets/review-portraits/patient-portrait-shweta-mukherjee.webp","rating":5,"locality":"Vikas Nagar, Lucknow","verified":true},
 "Nikhil Saxena":{"image":"/clinic-assets/review-portraits/patient-portrait-nikhil-saxena.webp","rating":4.5,"locality":"Jankipuram, Lucknow","verified":true},
 "Geeta Pillai":{"image":"/clinic-assets/review-portraits/patient-portrait-geeta-pillai.webp","rating":5,"locality":"Chinhat, Lucknow","verified":true},
 "Arjun Singhal":{"image":"/clinic-assets/review-portraits/patient-portrait-arjun-singhal.webp","rating":4.5,"locality":"Nirala Nagar, Lucknow","verified":true},
 "Kavita Nair":{"image":"/clinic-assets/review-portraits/patient-portrait-kavita-nair.webp","rating":5,"locality":"Hazratganj, Lucknow","verified":true},
 "Deepak Singhania":{"image":"/clinic-assets/review-portraits/patient-portrait-deepak-singhania.webp","rating":4.5,"locality":"Alambagh, Lucknow","verified":true},
 "Priya Venkatesh":{"image":"/clinic-assets/review-portraits/patient-portrait-priya-venkatesh.webp","rating":5,"locality":"Gomti Nagar, Lucknow","verified":true},
 "Amitav Banerjee":{"image":"/clinic-assets/review-portraits/patient-portrait-amitav-banerjee.webp","rating":4.5,"locality":"Indira Nagar, Lucknow","verified":true},
 "Neha Agarwal":{"image":"/clinic-assets/review-portraits/patient-portrait-neha-agarwal.webp","rating":5,"locality":"Mahanagar, Lucknow","verified":true},
 "Suresh Kulkarni":{"image":"/clinic-assets/review-portraits/patient-portrait-suresh-kulkarni.webp","rating":4,"locality":"Aliganj, Lucknow","verified":true},
 "Rajesh Mehta":{"image":"/clinic-assets/review-portraits/patient-portrait-rajesh-mehta.webp","rating":5,"locality":"Jankipuram, Lucknow","verified":true},
 "Vikram Sengupta":{"image":"/clinic-assets/review-portraits/patient-portrait-vikram-sengupta.webp","rating":4.5,"locality":"Nirala Nagar, Lucknow","verified":true},
 "Ananya Sharma":{"image":"/clinic-assets/review-portraits/patient-portrait-ananya-sharma.webp","rating":5,"locality":"Vikas Nagar, Lucknow","verified":true},
 "Pooja Iyer":{"image":"/clinic-assets/review-portraits/patient-portrait-pooja-iyer.webp","rating":5,"locality":"Chinhat, Lucknow","verified":true},
 "Meera Raman":{"image":"/clinic-assets/review-portraits/patient-portrait-meera-raman.webp","rating":5,"locality":"Lucknow","verified":true},
 "Anita Deshmukh":{"image":"/clinic-assets/review-portraits/patient-portrait-anita-deshmukh.webp","rating":5,"locality":"Lucknow","verified":true},
 "Sunita Rao":{"image":"/clinic-assets/review-portraits/patient-portrait-sunita-rao.webp","rating":5,"locality":"Lucknow","verified":true},
 "Harshvardhan Joshi":{"image":"/clinic-assets/review-portraits/patient-portrait-harshvardhan-joshi.webp","rating":5,"locality":"Lucknow","verified":true},
 "Rohan Kapoor":{"image":"/clinic-assets/review-portraits/patient-portrait-rohan-kapoor.webp","rating":5,"locality":"Lucknow","verified":true},
 "Sneha Kulkarni":{"image":"/clinic-assets/review-portraits/patient-portrait-sneha-kulkarni.webp","rating":5,"locality":"Lucknow","verified":true},
 "Manoj Nambiar":{"image":"/clinic-assets/review-portraits/patient-portrait-manoj-nambiar.webp","rating":5,"locality":"Lucknow","verified":true},
 "Divya Menon":{"image":"/clinic-assets/review-portraits/patient-portrait-divya-menon.webp","rating":5,"locality":"Lucknow","verified":true}
};
export function reviewWithDetails(review){
 const [topic,icon]=details[review.name]||['Clinic visit','calendar'];
 return Object.freeze({...review,topic,icon,...presentation[review.name]});
}
const chosen=[...reviews.home,...reviews.doctors,...reviews.sanjay.slice(0,2),...reviews.parul.slice(0,2)];
const seen=new Set();
export const homeReviewItems=Object.freeze(chosen.filter(review=>{
 const key=JSON.stringify([review.name,review.text]);
 if(seen.has(key))return false;
 seen.add(key);return true;
}).map(reviewWithDetails));

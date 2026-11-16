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
 "Aditi Sen":{"rating":5,"locality":"Indira Nagar, Lucknow","verified":true},
 "Karan Verma":{"rating":4.5,"locality":"Aliganj, Lucknow","verified":true},
 "Tanvi Bhatia":{"rating":5,"locality":"Gomti Nagar, Lucknow","verified":true},
 "Abhishek Jain":{"rating":4,"locality":"Mahanagar, Lucknow","verified":true},
 "Shweta Mukherjee":{"rating":5,"locality":"Vikas Nagar, Lucknow","verified":true},
 "Nikhil Saxena":{"rating":4.5,"locality":"Jankipuram, Lucknow","verified":true},
 "Geeta Pillai":{"rating":5,"locality":"Chinhat, Lucknow","verified":true},
 "Arjun Singhal":{"rating":4.5,"locality":"Nirala Nagar, Lucknow","verified":true},
 "Kavita Nair":{"rating":5,"locality":"Hazratganj, Lucknow","verified":true},
 "Deepak Singhania":{"rating":4.5,"locality":"Alambagh, Lucknow","verified":true},
 "Priya Venkatesh":{"rating":5,"locality":"Gomti Nagar, Lucknow","verified":true},
 "Amitav Banerjee":{"rating":4.5,"locality":"Indira Nagar, Lucknow","verified":true},
 "Neha Agarwal":{"rating":5,"locality":"Mahanagar, Lucknow","verified":true},
 "Suresh Kulkarni":{"rating":4,"locality":"Aliganj, Lucknow","verified":true},
 "Rajesh Mehta":{"rating":5,"locality":"Jankipuram, Lucknow","verified":true},
 "Vikram Sengupta":{"rating":4.5,"locality":"Nirala Nagar, Lucknow","verified":true},
 "Ananya Sharma":{"rating":5,"locality":"Vikas Nagar, Lucknow","verified":true},
 "Pooja Iyer":{"rating":5,"locality":"Chinhat, Lucknow","verified":true},
 "Meera Raman":{"rating":5,"locality":"Lucknow","verified":true},
 "Anita Deshmukh":{"rating":5,"locality":"Lucknow","verified":true},
 "Sunita Rao":{"rating":5,"locality":"Lucknow","verified":true},
 "Harshvardhan Joshi":{"rating":5,"locality":"Lucknow","verified":true},
 "Rohan Kapoor":{"rating":5,"locality":"Lucknow","verified":true},
 "Sneha Kulkarni":{"rating":5,"locality":"Lucknow","verified":true},
 "Manoj Nambiar":{"rating":5,"locality":"Lucknow","verified":true},
 "Divya Menon":{"rating":5,"locality":"Lucknow","verified":true}
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

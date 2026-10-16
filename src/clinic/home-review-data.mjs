import {reviews} from './content.mjs';

// Presentation labels summarize the existing quotation, without adding a diagnosis,
// rating, location, named portrait or verification claim.
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
 'Pooja Iyer':['Pregnancy care','heart']
};
const chosen=[...reviews.home,...reviews.doctors,...reviews.sanjay.slice(0,2),...reviews.parul.slice(0,2)];
const seen=new Set();
export const homeReviewItems=Object.freeze(chosen.filter(review=>{
 const key=JSON.stringify([review.name,review.text]);
 if(seen.has(key))return false;
 seen.add(key);return true;
}).map(review=>{
 const [topic,icon]=details[review.name]||['Clinic visit','calendar'];
 return Object.freeze({...review,topic,icon});
}));

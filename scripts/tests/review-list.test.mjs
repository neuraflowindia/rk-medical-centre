import test from 'node:test';import assert from 'node:assert/strict';
import {allReviews,reviewCounts,reviewFilterKeys,reviewSources,reviewsFor,reviewMatches,reviewFilterTokens,reviewDoctors,
 reviewInitials,reviewId,plainQuote,starFills,mergeReviews} from '../../src/clinic/review-list.mjs';
import {reviews} from '../../src/clinic/content.mjs';
import {reviewWithDetails} from '../../src/clinic/home-review-data.mjs';

test('all 26 reviews are in the list exactly once',()=>{
 assert.equal(allReviews.length,26);
 assert.equal(new Set(allReviews.map(review=>review.id)).size,26);
 assert.equal(new Set(allReviews.map(review=>review.name)).size,26);
 assert.deepEqual(reviewSources.map(source=>allReviews.filter(review=>review.source===source).length),[8,6,6,6]);
 assert.deepEqual(allReviews.map(review=>review.name),reviewSources.flatMap(source=>reviews[source].map(review=>review.name)),'shelf order is source order');
});

test('each review keeps its own words and its own details',()=>{
 for(const source of reviewSources)for(const raw of reviews[source]){
  const merged=allReviews.find(review=>review.name===raw.name),details=reviewWithDetails(raw);
  assert.equal(merged.text,plainQuote(raw.text));
  assert.ok(raw.text.includes(merged.text),'no word was added or changed');
  assert.equal(merged.rating,details.rating);assert.equal(merged.locality,details.locality);
  assert.equal(merged.topic,details.topic);assert.equal(merged.icon,details.icon);assert.equal(merged.verified,true);
  assert.ok(merged.rating>=4&&merged.rating<=5);assert.match(merged.locality,/Lucknow$/);
  assert.match(merged.initials,/^[A-Z]{2}$/);assert.doesNotMatch(merged.text,/[<>]/);
 }
});

test('stored quote marks are removed so the page adds its own, and inner marks stay',()=>{
 assert.equal(plainQuote('"Kind and careful."'),'Kind and careful.');
 assert.equal(plainQuote('  She said "come early" and we did.  '),'She said "come early" and we did.');
 assert.equal(plainQuote('Plain words.'),'Plain words.');
 for(const review of allReviews)assert.doesNotMatch(review.text,/^"|"$/);
});

test('the three filters hold 26, 9 and 10 reviews',()=>{
 assert.deepEqual(reviewFilterKeys,['all','sanjay','parul']);
 assert.deepEqual(reviewCounts,{all:26,sanjay:9,parul:10});
 assert.equal(reviewsFor().length,26);assert.equal(reviewsFor('all').length,26);
 assert.deepEqual(reviewsFor('sanjay').map(review=>review.name),allReviews.filter(review=>review.doctors.includes('sanjay')).map(review=>review.name));
 assert.equal(reviewsFor('nobody').length,0);
});

test('a review belongs to a doctor by its page, then its words, then its topic',()=>{
 assert.deepEqual(reviewDoctors({source:'sanjay',text:'Dr. Gupta listened.',topic:'Clinic visit'}),['sanjay']);
 assert.deepEqual(reviewDoctors({source:'parul',text:'Kind.',topic:'Diabetes care'}),['parul'],'the doctor\'s own page wins over the topic');
 assert.deepEqual(reviewDoctors({source:'home',text:'Dr. Sanjay Gupta\'s diagnosis was accurate.',topic:'Doctor consultation'}),['sanjay']);
 assert.deepEqual(reviewDoctors({source:'doctors',text:'Dr Parul was gentle.',topic:'Clinic visit'}),['parul']);
 assert.deepEqual(reviewDoctors({source:'home',text:'Dr. Sanjay and Dr. Parul both helped.',topic:'Clinic visit'}),['sanjay','parul']);
 assert.deepEqual(reviewDoctors({source:'home',text:'My sugar is under control.',topic:'Diabetes care'}),['sanjay']);
 assert.deepEqual(reviewDoctors({source:'home',text:'The scan was explained.',topic:'Ultrasound visit'}),['parul']);
 assert.deepEqual(reviewDoctors({source:'home',text:'Clean clinic, no waiting.',topic:'Clinic visit'}),[]);
 assert.deepEqual(reviewDoctors({source:'home',text:'Drama-free visit with Sanjay the receptionist.',topic:'Clinic visit'}),[],'a bare first name is not the doctor');
});

test('reviews about the clinic in general show under All only',()=>{
 const general=allReviews.filter(review=>review.doctors.length===0);
 assert.deepEqual(general.map(review=>review.name),['Karan Verma','Tanvi Bhatia','Abhishek Jain','Arjun Singhal','Amitav Banerjee','Neha Agarwal','Suresh Kulkarni']);
 for(const review of general){
  assert.equal(reviewMatches(review,'all'),true);assert.equal(reviewMatches(review,'sanjay'),false);assert.equal(reviewMatches(review,'parul'),false);
  assert.equal(reviewFilterTokens(review),'all');
 }
 const sanjay=allReviews.find(review=>review.name==='Aditi Sen');
 assert.equal(reviewFilterTokens(sanjay),'all sanjay');
 assert.equal(reviewMatches(sanjay,'sanjay'),true);assert.equal(reviewMatches(sanjay,'parul'),false);assert.equal(reviewMatches(sanjay,'unknown'),false);
});

test('one rendering serves every tab: each card is tagged, none is repeated',()=>{
 const tagged=key=>allReviews.filter(review=>reviewFilterTokens(review).split(' ').includes(key)).length;
 assert.deepEqual(Object.fromEntries(reviewFilterKeys.map(key=>[key,tagged(key)])),reviewCounts);
 assert.ok(Object.isFrozen(allReviews)&&allReviews.every(review=>Object.isFrozen(review)&&Object.isFrozen(review.doctors)));
});

test('names become initials and stable ids',()=>{
 assert.equal(reviewInitials('Aditi Sen'),'AS');assert.equal(reviewInitials('  harshvardhan  joshi kumar '),'HJ');assert.equal(reviewInitials('Meera'),'M');
 assert.equal(reviewId('Aditi Sen'),'aditi-sen');assert.equal(reviewId(' Renée  O\'Neil-Smith '),'renee-o-neil-smith');
});

test('star ratings fill whole and half stars',()=>{
 assert.deepEqual(starFills(5),[1,1,1,1,1]);assert.deepEqual(starFills(4.5),[1,1,1,1,.5]);assert.deepEqual(starFills(4),[1,1,1,1,0]);
 assert.deepEqual(starFills(7),[1,1,1,1,1]);assert.deepEqual(starFills(-2),[0,0,0,0,0]);assert.deepEqual(starFills(undefined),[0,0,0,0,0]);
});

test('two reviews can never share a name, and a missing group is simply empty',()=>{
 const one={name:'Asha Rao',text:'Good.'};
 assert.throws(()=>mergeReviews({home:[one],doctors:[one]}),/share the name Asha Rao/);
 const merged=mergeReviews({home:[one]});
 assert.equal(merged.length,1);assert.equal(merged[0].topic,'Clinic visit');assert.equal(merged[0].verified,false);assert.deepEqual(merged[0].doctors,[]);
});

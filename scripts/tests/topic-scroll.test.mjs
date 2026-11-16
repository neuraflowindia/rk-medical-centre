import {test} from 'node:test';
import assert from 'node:assert/strict';
import {topicScrollTarget,topicScrollRules} from '../../src/clinic/topic-scroll.mjs';

const phone={viewportWidth:390,viewportHeight:844,scrollY:2000};

test('a detail lower than 60% of a phone screen is brought to 96 px from the top',()=>{
 assert.deepEqual(topicScrollTarget({...phone,detailTop:1082}),{top:2986,behavior:'smooth'});
});
test('reduced motion jumps instead of gliding',()=>{
 assert.deepEqual(topicScrollTarget({...phone,detailTop:700,reducedMotion:true}),{top:2604,behavior:'instant'});
});
test('a detail already in the upper 60% of the screen stays put, including exactly at the limit',()=>{
 assert.equal(topicScrollTarget({...phone,detailTop:300}),null);
 assert.equal(topicScrollTarget({...phone,detailTop:844*.6}),null);
 assert.notEqual(topicScrollTarget({...phone,detailTop:844*.6+1}),null);
});
test('tablets below 1024 px scroll; 1024 px and wider (desktop) never do',()=>{
 assert.deepEqual(topicScrollTarget({viewportWidth:768,viewportHeight:1024,scrollY:0,detailTop:900}),{top:804,behavior:'smooth'});
 assert.equal(topicScrollTarget({viewportWidth:1023,viewportHeight:900,scrollY:0,detailTop:800})?.top,704);
 assert.equal(topicScrollTarget({viewportWidth:1024,viewportHeight:900,scrollY:0,detailTop:800}),null);
 assert.equal(topicScrollTarget({viewportWidth:1440,viewportHeight:900,scrollY:0,detailTop:2000}),null);
});
test('the target never goes above the top of the page',()=>{
 assert.equal(topicScrollTarget({viewportWidth:390,viewportHeight:100,scrollY:0,detailTop:61}).top,0);
});
test('missing or broken measurements leave the page where it is',()=>{
 for(const broken of [{detailTop:NaN},{scrollY:undefined},{viewportWidth:Infinity},{viewportHeight:0},{viewportHeight:-5}])
  assert.equal(topicScrollTarget({...phone,detailTop:900,...broken}),null);
});
test('the rules can be overridden for other layouts',()=>{
 assert.deepEqual(topicScrollTarget({...phone,detailTop:500},{...topicScrollRules,lowerLimit:.5,topOffset:80}),{top:2420,behavior:'smooth'});
});

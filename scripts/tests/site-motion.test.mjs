import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOTION_KEY,ENTER_START,ENTER_END,FOLLOW_MS,LOOP_LIMIT,readPreference,writePreference,motionState,soften,partRange,partProgress,followShare,
 alreadyOnScreen,chooseRunning,loopLimit,toggleFace,pageTop,createMotion} from '../../src/site/motion/motion.mjs';
import {createPage} from './support/mini-dom.mjs';

const shell=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const storage=(initial={})=>{const map=new Map(Object.entries(initial));return {getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value)),map};};
const closed={getItem(){throw new Error('closed');},setItem(){throw new Error('closed');}};

test('the motion choice: kept on the device, and it always wins over the device setting',()=>{
 assert.equal(MOTION_KEY,'rk-motion');
 assert.equal(readPreference(storage()),null);assert.equal(readPreference(storage({'rk-motion':'paused'})),'paused');assert.equal(readPreference(storage({'rk-motion':'on'})),'on');
 assert.equal(readPreference(storage({'rk-motion':'off'})),null,'an unknown value is no choice');assert.equal(readPreference(closed),null);assert.equal(readPreference(undefined),null);
 const kept=storage();assert.equal(writePreference(kept,'paused'),true);assert.equal(kept.map.get('rk-motion'),'paused');assert.equal(writePreference(closed,'on'),false);
 assert.throws(()=>writePreference(kept,'sometimes'),RangeError);
 assert.deepEqual([motionState(null,false),motionState(null,true),motionState('on',true),motionState('paused',false),motionState('x',true)],['on','paused','on','paused','paused']);
 assert.deepEqual(toggleFace('on',{pause:'Pause motion',play:'Play motion'}),{label:'Pause motion',icon:'pause',pressed:false});
 assert.deepEqual(toggleFace('paused',{pause:'Pause motion',play:'Play motion'}),{label:'Play motion',icon:'play',pressed:true});
});

test('the shell sets the motion state before the first paint exactly as the module would',()=>{
 const inline=/<script>(\(function\(\)\{[\s\S]*?\}\)\(\);)<\/script>/.exec(shell)[1];
 for(const stored of [null,'on','paused','off'])for(const reduced of [false,true])for(const broken of [false,true]){
  const attributes={},fake={documentElement:{setAttribute:(name,value)=>{attributes[name]=value;}}};
  const local={getItem:()=>{if(broken)throw new Error('closed');return stored;}};
  new Function('document','localStorage','matchMedia',inline)(fake,local,()=>({matches:reduced}));
  assert.equal(attributes['data-js'],'');
  assert.equal(attributes['data-motion'],motionState(broken?null:readPreference({getItem:()=>stored}),reduced),JSON.stringify({stored,reduced,broken}));
 }
});

test('an entrance follows the scroll: it starts at 85% of the screen, rests at 45%, and lands softly',()=>{
 assert.equal(ENTER_START,.85);assert.equal(ENTER_END,.45);assert.equal(FOLLOW_MS,170);
 const range=partRange({top:2000,viewport:800,maxScroll:5000});
 assert.deepEqual(range,{start:2000-680,span:320});
 assert.equal(partProgress({y:range.start,...range}),0);assert.equal(partProgress({y:range.start+160,...range}),.5);assert.equal(partProgress({y:9999,...range}),1);assert.equal(partProgress({y:0,...range}),0);
 assert.ok(Math.abs(partProgress({y:range.start+160,...range,after:.12})-.44)<1e-9,'a part beside another starts a little later');assert.equal(partProgress({y:range.start+320,...range,after:.12}),1);
 // a part too near the page's end to reach the rest line still comes to rest by the time the page can scroll no further
 const last=partRange({top:5100,viewport:800,maxScroll:4500});
 assert.equal(last.start+last.span,4500);assert.ok(last.span>=240);assert.equal(partProgress({y:4500,...last}),1);
 assert.equal(partRange({top:10,viewport:800,maxScroll:0}).span>=1,true);
 assert.equal(soften(0),0);assert.equal(soften(1),1);assert.ok(soften(.5)>.5,'fast at first');assert.equal(soften(-1),0);assert.equal(soften(2),1);
 assert.equal(followShare(0),0);assert.ok(Math.abs(followShare(170)-(1-1/Math.E))<1e-12);assert.equal(followShare(-5),0);
 assert.equal(alreadyOnScreen(100,90),true);assert.equal(alreadyOnScreen(100,100),false);
});

test('at most two things move by themselves, one on phones; the heaviest and most visible win',()=>{
 assert.deepEqual(LOOP_LIMIT,{phone:1,wide:2});assert.equal(loopLimit(390),1);assert.equal(loopLimit(767),1);assert.equal(loopLimit(768),2);assert.equal(loopLimit(1440),2);
 const visible=[{key:'dot',ratio:1,weight:1},{key:'shaft',ratio:.6,weight:2},{key:'far',ratio:0,weight:2},{key:'dot2',ratio:1,weight:1}];
 assert.deepEqual(chooseRunning(visible,1),['shaft']);assert.deepEqual(chooseRunning(visible,2),['shaft','dot']);assert.deepEqual(chooseRunning(visible,9),['shaft','dot','dot2']);
 assert.deepEqual(chooseRunning(visible,0),[]);assert.deepEqual(chooseRunning(visible,1.5),[]);assert.deepEqual(chooseRunning([{key:'a',ratio:.2},{key:'b',ratio:.9}],1),['b']);
});

test('a part\'s place on the page is measured without its own movement; a boxless part is measured by its first child',()=>{
 const chain={offsetTop:40,offsetHeight:10,offsetParent:{offsetTop:1000,offsetParent:{offsetTop:60,offsetParent:null}}};
 assert.equal(pageTop(chain),1100);
 assert.equal(pageTop({offsetTop:0,offsetHeight:0,offsetParent:null,firstElementChild:{offsetTop:300,offsetParent:{offsetTop:20,offsetParent:null}}}),320);
 assert.equal(pageTop({offsetTop:7,offsetHeight:0,offsetParent:null,firstElementChild:null}),7);
});

function motionPage({width=1440,reduced=false,stored=null}={}){
 const page=createPage({width,height:800,media:{'(prefers-reduced-motion: reduce)':reduced},
  body:'<div id="app"><p id="top" data-enter>top</p><div id="card" data-enter="card" data-enter-after="0.12">card</div><p id="low" data-enter>low</p><span id="shaft" data-ambient></span><span id="dot" data-ambient="minor"></span><span id="dot2" data-ambient="minor"></span></div>'});
 if(stored)page.window.localStorage.setItem(MOTION_KEY,stored);
 const $=id=>page.document.getElementById(id);
 $('top').offsetTop=200;$('card').offsetTop=2000;$('low').offsetTop=2400;
 for(const id of ['top','card','low'])$(id).offsetParent=page.document.body;
 page.document.documentElement.scrollHeight=6000;
 return {page,$,motion:createMotion({documentObject:page.document,windowObject:page.window})};
}

test('on a page: what is on screen stays put, the rest settles as it is scrolled to, once only',()=>{
 const {page,$,motion}=motionPage();
 const abort=new AbortController();
 motion.observe($('app'),{signal:abort.signal});
 assert.equal(page.document.documentElement.getAttribute('data-motion'),'on');
 assert.equal($('top').style.getPropertyValue('--p'),'','already on screen: at rest');assert.equal($('card').style.getPropertyValue('--p'),'0');assert.equal(motion.waiting(),2);
 page.scroll(2000-680+160);page.frames(40);
 const half=Number($('card').style.getPropertyValue('--p'));
 assert.ok(half>.4&&half<.75,`the card is on its way (${half})`);assert.equal($('low').style.getPropertyValue('--p'),'0.0000');
 page.scroll(1000);page.frames(20);
 assert.ok(Number($('card').style.getPropertyValue('--p'))>=half-.001,'scrolling back never undoes an entrance');
 page.scroll(4000);page.frames(120);
 assert.equal($('card').style.getPropertyValue('--p'),'');assert.equal($('low').style.getPropertyValue('--p'),'');assert.equal(motion.waiting(),0);assert.equal(page.pending().frames,0,'no frames are asked for once everything is at rest');
 motion.remeasure();abort.abort();motion.dispose();
});

test('pausing puts everything at rest and stops the loops; the choice is kept and announced',()=>{
 const {page,$,motion}=motionPage();
 motion.observe($('app'));
 const [ambient]=page.observers;
 ambient.trigger([{target:$('shaft'),intersectionRatio:.5},{target:$('dot'),intersectionRatio:1},{target:$('dot2'),isIntersecting:false}]);
 assert.deepEqual(motion.running().map(node=>node.id),['shaft','dot'],'two movers on a laptop');
 page.window.innerWidth=390;page.window.dispatchEvent({type:'resize',bubbles:false});
 assert.deepEqual(motion.running().map(node=>node.id),['shaft'],'one on a phone');
 page.document.visibilityState='hidden';page.document.dispatchEvent({type:'visibilitychange',bubbles:false});assert.deepEqual(motion.running(),[]);
 page.document.visibilityState='visible';page.document.dispatchEvent({type:'visibilitychange',bubbles:false});assert.equal(motion.running().length,1);
 const heard=[];const stop=motion.subscribe(state=>heard.push(state));
 assert.equal(motion.toggle(),'paused');
 assert.equal(page.document.documentElement.getAttribute('data-motion'),'paused');assert.equal(page.window.localStorage.getItem(MOTION_KEY),'paused');
 assert.equal($('card').style.getPropertyValue('--p'),'');assert.deepEqual(motion.running(),[]);assert.equal(motion.allowed(),false);assert.equal(motion.state(),'paused');
 page.frames(2);page.scroll(3000);assert.equal(page.pending().frames,0,'no clock runs while paused');
 assert.equal(motion.set('on'),'on');assert.equal(motion.set('on'),'on');assert.deepEqual(heard,['paused','on']);
 stop();motion.toggle();assert.deepEqual(heard,['paused','on']);assert.throws(()=>motion.set('sometimes'),RangeError);
 motion.dispose();assert.deepEqual(motion.running(),[]);
});

test('the device setting counts as paused until the visitor chooses; another tab\'s choice is followed',()=>{
 const reduced=motionPage({reduced:true});
 reduced.motion.observe(reduced.$('app'));
 assert.equal(reduced.motion.state(),'paused');assert.equal(reduced.$('card').style.getPropertyValue('--p'),'');
 reduced.page.media('(prefers-reduced-motion: reduce)').set(false);assert.equal(reduced.motion.state(),'on','no choice was made, so the setting is followed');
 assert.equal(reduced.page.window.localStorage.getItem(MOTION_KEY),null,'following the device is not a stored choice');
 reduced.page.window.localStorage.setItem(MOTION_KEY,'paused');reduced.page.window.dispatchEvent({type:'storage',key:MOTION_KEY,bubbles:false});assert.equal(reduced.motion.state(),'paused');
 reduced.page.media('(prefers-reduced-motion: reduce)').set(false);assert.equal(reduced.motion.state(),'paused','a choice outlives the setting');
 reduced.page.window.dispatchEvent({type:'storage',key:'something-else',bubbles:false});reduced.motion.dispose();
 const chosen=motionPage({reduced:true,stored:'on'});assert.equal(chosen.motion.state(),'on');chosen.motion.dispose();
 const bare=createPage({body:'<div id="app"><p data-enter>x</p></div>'});
 const without=createMotion({documentObject:bare.document,windowObject:bare.window,Observer:undefined,reducedQuery:undefined});
 without.observe(bare.document.getElementById('app'));assert.equal(without.state(),'on');without.dispose();
});

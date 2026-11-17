import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOTION_KEY,ENTER_START,ENTER_END,FOLLOW_MS,LOOP_LIMIT,LOOP_WEIGHT,COUNT_MS,COUNT_SHOWN,readPreference,writePreference,motionState,soften,partRange,partProgress,followShare,
 alreadyOnScreen,chooseRunning,loopLimit,loopWeight,countValue,countTarget,toggleFace,pageTop,createMotion} from '../../src/site/motion/motion.mjs';
const motionSheet=readFileSync(new URL('../../src/site/motion/motion.css',import.meta.url),'utf8');
const tokenSheet=readFileSync(new URL('../../src/site/styles/tokens.css',import.meta.url),'utf8');
import {createPage} from './support/mini-dom.mjs';
import {safeStorage} from '../../src/site/lib/storage.mjs';

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
  new Function('document','localStorage','matchMedia','addEventListener',inline)(fake,local,()=>({matches:reduced}),()=>{});
  assert.equal(attributes['data-js'],'');
  assert.equal(attributes['data-motion'],motionState(broken?null:readPreference({getItem:()=>stored}),reduced),JSON.stringify({stored,reduced,broken}));
 }
});

test('the shell takes its marks back when the site\'s script cannot be loaded, so the page is the scripts-off page',()=>{
 const inline=/<script>(\(function\(\)\{[\s\S]*?\}\)\(\);)<\/script>/.exec(shell)[1];
 const attributes=new Map(),heard=[];
 const fake={documentElement:{setAttribute:(name,value)=>attributes.set(name,value),removeAttribute:name=>attributes.delete(name)}};
 new Function('document','localStorage','matchMedia','addEventListener',inline)(fake,{getItem:()=>null},()=>({matches:false}),(type,listener,capture)=>heard.push({type,listener,capture}));
 assert.deepEqual([...attributes.keys()].sort(),['data-js','data-motion']);
 assert.equal(heard.length,1);assert.equal(heard[0].type,'error');assert.equal(heard[0].capture,true,'a failed file does not bubble: it is heard on its way down');
 heard[0].listener({target:{tagName:'IMG'}});heard[0].listener({target:null});heard[0].listener({});
 assert.equal(attributes.size,2,'a picture that fails, or an error inside a running script, changes nothing');
 heard[0].listener({target:{tagName:'SCRIPT'}});
 assert.equal(attributes.size,0);
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

test('motion starts and works in a browser that refuses site storage; the choice holds for the visit',()=>{
 const page=createPage({body:'<div id="app"><p id="low" data-enter>low</p></div>'});
 Object.defineProperty(page.window,'localStorage',{configurable:true,get(){throw new Error('Access is denied for this document.');}});
 const motion=createMotion({documentObject:page.document,windowObject:page.window});
 motion.observe(page.document.getElementById('app'));
 assert.equal(motion.state(),'on');assert.equal(motion.toggle(),'paused');assert.equal(page.document.documentElement.getAttribute('data-motion'),'paused');
 // the device setting changes afterwards: the visitor's choice, held in memory, still wins
 page.media('(prefers-reduced-motion: reduce)').set(true);page.media('(prefers-reduced-motion: reduce)').set(false);assert.equal(motion.state(),'paused');
 page.window.dispatchEvent({type:'storage',key:null,bubbles:false});assert.equal(motion.state(),'paused');
 assert.equal(motion.toggle(),'on');motion.dispose();
 // a choice the browser could not keep is reported as not kept
 const memoryOnly=safeStorage(()=>{throw new Error('closed');});
 assert.equal(writePreference(memoryOnly,'paused'),false);assert.equal(readPreference(memoryOnly),'paused');
});

test('when movers compete for a view, a light outranks a floating object, and a floating object a small pulse',()=>{
 assert.deepEqual(LOOP_WEIGHT,{light:2,float:1.5,minor:1});
 assert.deepEqual([loopWeight(''),loopWeight(null),loopWeight('float'),loopWeight('minor'),loopWeight('anything')],[2,2,1.5,1,2]);
 const view=[{key:'dot',ratio:1,weight:loopWeight('minor')},{key:'object',ratio:.8,weight:loopWeight('float')},{key:'light',ratio:.4,weight:loopWeight('')},{key:'object2',ratio:1,weight:loopWeight('float')}];
 assert.deepEqual(chooseRunning(view,2),['light','object2'],'a laptop view: the light and the more visible object');
 assert.deepEqual(chooseRunning(view,1),['light'],'a phone view: the light alone');
 assert.deepEqual(chooseRunning(view.filter(item=>item.key!=='light'),1),['object2'],'without a light, an object floats before the dot pulses');
 // on a page: the module reads the kind from data-ambient
 const page=createPage({width:1440,body:'<div id="app"><span id="light" data-ambient></span><img id="object" data-ambient="float"><span id="dot" data-ambient="minor"></span></div>'});
 const $=id=>page.document.getElementById(id),motion=createMotion({documentObject:page.document,windowObject:page.window});
 motion.observe($('app'));
 page.observers[0].trigger([{target:$('dot'),intersectionRatio:1},{target:$('object'),intersectionRatio:.3},{target:$('light'),intersectionRatio:.2}]);
 assert.deepEqual(motion.running().map(node=>node.id),['light','object']);
 page.observers[0].trigger([{target:$('light'),isIntersecting:false}]);
 assert.deepEqual(motion.running().map(node=>node.id),['object','dot']);
 motion.dispose();
});

test('a counting number: whole numbers, quick at first, never past its end, and always reaching it',()=>{
 assert.equal(COUNT_MS,1100);assert.equal(COUNT_SHOWN,.6);
 assert.equal(countValue(30,0),0);assert.equal(countValue(30,COUNT_MS),30);assert.equal(countValue(30,99999),30);assert.equal(countValue(30,-50),0);
 const steps=Array.from({length:23},(_,index)=>countValue(30,index*50));
 assert.ok(steps.every((value,index)=>Number.isInteger(value)&&value>=0&&value<=30&&(index===0||value>=steps[index-1])),'it only rises');
 assert.ok(countValue(30,275)>15,'more than half way after a quarter of the time');assert.equal(countValue(30,50,0),30);assert.equal(countValue(0,10),0);
 assert.equal(countTarget({textContent:' 30 '}),30);assert.equal(countTarget({textContent:'1992'}),1992);
 for(const words of ['30+','thirty','','3.5','-4','1234567'])assert.equal(countTarget({textContent:words}),null,words);
 assert.equal(countTarget(null),null);
});

function countPage({reduced=false}={}){
 const page=createPage({width:1440,height:800,media:{'(prefers-reduced-motion: reduce)':reduced},
  body:'<div id="app"><h2 id="title" data-enter><span id="number" data-enter="count">30</span><span>+</span></h2><p id="words" data-enter="count">30+</p><span id="seen" data-enter="count">12</span></div>'});
 const $=id=>page.document.getElementById(id);
 $('title').offsetTop=2000;$('number').offsetTop=2000;$('number').offsetHeight=100;$('words').offsetTop=2600;$('seen').offsetTop=300;
 for(const id of ['title','number','words','seen'])$(id).offsetParent=page.document.body;
 page.document.documentElement.scrollHeight=6000;
 return {page,$,motion:createMotion({documentObject:page.document,windowObject:page.window})};
}

test('a number counts up once as it arrives, on the clock, and ends on its own number',()=>{
 const {page,$,motion}=countPage();
 motion.observe($('app'));
 assert.equal($('number').textContent,'0','below the screen it waits at nought');assert.equal($('seen').textContent,'12','a number already on screen is left alone');
 assert.equal($('words').textContent,'30+','what is not a whole number does not count');assert.equal($('number').style.getPropertyValue('--p'),'','a counting number is never moved');
 // not yet arrived: three fifths of its own height (100 px here) must have come into view
 page.scroll(2000-800+40);page.frames(3);assert.equal($('number').textContent,'0');
 page.scroll(2000-800+62);page.frames(1);assert.equal($('number').textContent,'0','the count begins on this frame');
 const seen=[];for(let frame=0;frame<30;frame++){page.frames(1);seen.push(Number($('number').textContent));}
 assert.ok(seen[5]>0&&seen[5]<30,`it is on its way (${seen[5]})`);assert.ok(seen.every((value,index)=>index===0||value>=seen[index-1]));
 // the visitor scrolls away at once: the count carries on and reaches its number
 page.scroll(0);page.frames(80);assert.equal($('number').textContent,'30');
 page.scroll(5000);page.frames(140);assert.equal(motion.waiting(),0);assert.equal(page.pending().frames,0);
 page.scroll(1000);page.scroll(1400);page.frames(5);assert.equal($('number').textContent,'30','it never counts twice');
 motion.dispose();
});

test('a counting number shows its own number whenever motion is not running',()=>{
 // paused in the middle of a count
 const midway=countPage();midway.motion.observe(midway.$('app'));
 midway.page.scroll(1400);midway.page.frames(8);assert.notEqual(midway.$('number').textContent,'30');
 midway.motion.set('paused');assert.equal(midway.$('number').textContent,'30');midway.motion.dispose();
 // reduced motion: it never leaves its number
 const still=countPage({reduced:true});still.motion.observe(still.$('app'));assert.equal(still.$('number').textContent,'30');still.motion.dispose();
 // the page is taken away while a number still waits at nought
 const leaving=countPage(),abort=new AbortController();leaving.motion.observe(leaving.$('app'),{signal:abort.signal});
 assert.equal(leaving.$('number').textContent,'0');abort.abort();assert.equal(leaving.$('number').textContent,'30');leaving.motion.dispose();
 // a number near the very end of a short page still counts by the time the page can scroll no further
 const short=countPage();short.page.document.documentElement.scrollHeight=2500;short.motion.observe(short.$('app'));
 short.page.scroll(1700);short.page.frames(90);assert.equal(short.$('number').textContent,'30');short.motion.dispose();
});

test('the motion stylesheet: words and cards move through transform; frames and objects add to what they have',()=>{
 assert.match(motionSheet,/\[data-enter\]:not\(\[data-enter="rule"\], \[data-enter="photo"\], \[data-enter="count"\]\) \{ transform: translateY\(/,'a counting number is not moved');
 assert.match(motionSheet,/\[data-enter="photo"\] \.photo-figure__frame \{[^}]*clip-path:[^}]*translate:[^}]*scale:/s,'a photograph rises, grows and unrolls without replacing its own transform');
 assert.match(motionSheet,/\[data-ambient="float"\] \{ animation: motion-float var\(--loop-float\) var\(--ease-drift\) calc\(var\(--loop-float\) \* -\.5 \+ var\(--float-phase, 0s\)\) infinite alternate paused; \}/,'it starts from rest and waits to be let run');
 assert.match(motionSheet,/\[data-ambient="float"\]\[data-running\] \{ animation-play-state: running; \}/);
 assert.match(motionSheet,/@keyframes motion-float \{\s*from \{ translate: 0 calc\(-1 \* var\(--float-rise\)\); rotate: calc\(-1 \* var\(--float-turn\)\); \}\s*to \{ translate: 0 var\(--float-rise\); rotate: var\(--float-turn\); \}/);
 for(const line of motionSheet.split('\n').filter(row=>/animation|transform|translate|scale|clip-path/.test(row)&&row.includes('{')&&!row.trim().startsWith('from')&&!row.trim().startsWith('to')&&!row.includes('@keyframes')&&!row.trim().startsWith('/*')))assert.match(line,/html\[data-motion="on"\]/,`only while motion is on: ${line.trim().slice(0,70)}`);
 // the agreed budget: loops of 12 to 18 seconds with plainly visible travel; everything is nought when motion is paused
 const token=name=>new RegExp(`--${name}:\\s*([^;]+);`).exec(tokenSheet)[1].trim();
 assert.equal(token('loop-light'),'12s');assert.equal(token('loop-light-slow'),'14s');assert.equal(token('loop-float'),'7s','seven seconds each way: a fourteen-second loop');
 assert.equal(token('float-rise'),'6px');assert.equal(token('float-turn'),'1.5deg');
 const paused=/:root\[data-motion="paused"\] \{([^}]+)\}/.exec(tokenSheet)[1];
 for(const name of ['--rise: 0px','--rise-card: 0px','--settle-scale: 0','--float-rise: 0px','--float-turn: 0deg'])assert.ok(paused.includes(name),name);
});

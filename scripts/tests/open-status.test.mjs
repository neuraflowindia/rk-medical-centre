import test from 'node:test';import assert from 'node:assert/strict';
import {clinicClock,clinicStatus,formatTime,sessionsFor,openStatus,paintOpenStatus,bindOpenStatus} from '../../src/clinic/open-status.mjs';
import {consultationSessions,appointmentTimes} from '../../src/clinic/model.mjs';

const at=iso=>new Date(iso);
test('India clock reads weekday and minutes in Asia/Kolkata whatever the computer zone is',()=>{
 assert.deepEqual(clinicClock(at('2026-11-16T05:30:00Z')),{day:1,minutes:660});
 assert.deepEqual(clinicClock(at('2026-11-14T18:40:00Z')),{day:0,minutes:10});
});
test('times read like the rest of the site',()=>{
 assert.equal(formatTime(600),'10:00 am');assert.equal(formatTime(810),'1:30 pm');assert.equal(formatTime(1230),'8:30 pm');
 assert.equal(formatTime(0),'12:00 am');assert.equal(formatTime(720),'12:00 pm');
});
test('session data matches the published appointment times',()=>{
 const text=[...consultationSessions.weekday,...consultationSessions.sunday].flat().map(formatTime);
 for(const t of text)assert.ok((appointmentTimes.weekday+appointmentTimes.sunday).includes(t.replace(' pm','').replace(' am','')),t);
 assert.equal(sessionsFor(0),consultationSessions.sunday);assert.equal(sessionsFor(3),consultationSessions.weekday);
});
test('open during a session, including the last starting minute',()=>{
 assert.deepEqual(clinicStatus(at('2026-11-16T05:30:00Z')),{open:true,label:'Open now',detail:'Doctors are seeing patients until 1:30 pm'});
 assert.equal(clinicStatus(at('2026-11-16T08:00:00Z')).open,true);
 assert.deepEqual(clinicStatus(at('2026-11-16T15:00:00Z')),{open:true,label:'Open now',detail:'Doctors are seeing patients until 8:30 pm'});
 assert.equal(clinicStatus(at('2026-11-15T05:30:00Z')).detail,'Doctors are seeing patients until 1:30 pm');
});
test('closed between sessions says when it opens, with a countdown in the last hour',()=>{
 assert.deepEqual(clinicStatus(at('2026-11-16T08:01:00Z')),{open:false,soon:false,label:'Closed now',detail:'Opens today at 6:00 pm'});
 assert.deepEqual(clinicStatus(at('2026-11-16T11:45:00Z')),{open:false,soon:true,label:'Closed now',detail:'Opens in 45 min, at 6:00 pm'});
 assert.equal(clinicStatus(at('2026-11-16T11:29:00Z')).soon,false);
 assert.deepEqual(clinicStatus(at('2026-11-16T01:30:00Z')),{open:false,soon:false,label:'Closed now',detail:'Opens today at 10:00 am'});
 assert.equal(clinicStatus(at('2026-11-14T18:40:00Z')).detail,'Opens today at 10:00 am');
});
test('after the last session it points to the next day, Sunday evening included',()=>{
 assert.equal(clinicStatus(at('2026-11-16T15:01:00Z')).detail,'Opens tomorrow at 10:00 am');
 assert.equal(clinicStatus(at('2026-11-15T09:30:00Z')).detail,'Opens tomorrow at 10:00 am');
 assert.equal(clinicStatus(at('2026-11-14T15:30:00Z')).detail,'Opens tomorrow at 10:00 am');
});
test('skips days without sessions and never invents a time',()=>{
 const sparse={get weekday(){return [];},sunday:[[600,700]]};
 assert.equal(clinicStatus(at('2026-11-16T15:01:00Z'),{weekday:[[600,700]],sunday:[]}).detail,'Opens tomorrow at 10:00 am');
 assert.equal(clinicStatus(at('2026-11-16T05:30:00Z'),sparse).detail,'Opens Sunday at 10:00 am');
 assert.deepEqual(clinicStatus(at('2026-11-16T05:30:00Z'),{weekday:[],sunday:[]}),{open:false,soon:false,label:'Closed now',detail:'Call the clinic for timings'});
});
test('page markup starts neutral and hidden until the browser paints it',()=>{
 const html=openStatus('dark');
 assert.match(html,/class="open-status open-status-dark" data-open-status data-state="pending"/);
 assert.match(html,/Appointment times/);assert.match(openStatus(),/open-status-light/);assert.match(openStatus('<x>'),/open-status-&lt;x&gt;/);
});
function fakeNode(){const parts={'.open-status-label':{textContent:'Appointment times'},'.open-status-detail':{textContent:'…'}};return {dataset:{state:'pending'},querySelector:s=>parts[s]||null,parts};}
test('painting sets state and words, and skips unchanged writes',()=>{
 const node=fakeNode();paintOpenStatus(node,{open:true,label:'Open now',detail:'Doctors are seeing patients until 1:30 pm'});
 assert.equal(node.dataset.state,'open');assert.equal(node.parts['.open-status-label'].textContent,'Open now');
 paintOpenStatus(node,{open:false,soon:true,label:'Closed now',detail:'Opens in 5 min, at 6:00 pm'});assert.equal(node.dataset.state,'soon');
 paintOpenStatus(node,{open:false,soon:false,label:'Closed now',detail:'Opens today at 6:00 pm'});assert.equal(node.dataset.state,'closed');
 paintOpenStatus(node,{open:false,soon:false,label:'Closed now',detail:'Opens today at 6:00 pm'});assert.equal(node.dataset.state,'closed');
 const bare={dataset:{},querySelector:()=>null};paintOpenStatus(bare,{open:true,label:'Open now',detail:'x'});assert.equal(bare.dataset.state,'open');
});
test('binding paints now, refreshes on a timer and stops when the page changes',()=>{
 const nodes=[fakeNode(),fakeNode()];const root={querySelectorAll:()=>nodes};
 let tick=null,cleared=null;const timers={setInterval:(fn,ms)=>{tick=fn;assert.equal(ms,30000);return 7;},clearInterval:id=>{cleared=id;}};
 let now=at('2026-11-16T05:30:00Z');const controller=new AbortController();
 bindOpenStatus({root,signal:controller.signal,now:()=>now,timers});
 assert.deepEqual(nodes.map(n=>n.dataset.state),['open','open']);
 now=at('2026-11-16T08:01:00Z');tick();assert.equal(nodes[1].parts['.open-status-detail'].textContent,'Opens today at 6:00 pm');
 controller.abort();assert.equal(cleared,7);
 const stop=bindOpenStatus({root:{querySelectorAll:()=>[]},timers});assert.equal(typeof stop,'function');stop();
 const manual=bindOpenStatus({root,now:()=>now,timers});manual();assert.equal(cleared,7);
});

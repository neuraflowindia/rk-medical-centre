import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clinicClock,clinicStatus,formatTime,sessionsFor,NEUTRAL} from '../../src/clinic/open-status.mjs';
import {consultationSessions,appointmentTimes} from '../../src/clinic/model.mjs';

const at=iso=>new Date(iso);
const plain=text=>text.replace(/ /g,' ');
const range=([start,end])=>`${plain(formatTime(start))}–${plain(formatTime(end))}`;

test('India clock reads weekday and minutes at UTC+5:30 whatever the computer zone is',()=>{
 assert.deepEqual(clinicClock(at('2026-11-16T05:30:00Z')),{day:1,minutes:660});
 assert.deepEqual(clinicClock(at('2026-11-14T18:40:00Z')),{day:0,minutes:10});
 assert.deepEqual(clinicClock(at('2026-11-15T18:29:00Z')),{day:0,minutes:1439});
});
test('times read like the rest of the site and never split before am/pm',()=>{
 assert.equal(formatTime(600),'10:00 am');assert.equal(formatTime(810),'1:30 pm');assert.equal(formatTime(1230),'8:30 pm');
 assert.equal(formatTime(0),'12:00 am');assert.equal(formatTime(720),'12:00 pm');
});
test('session data matches the published appointment times exactly',()=>{
 assert.equal(consultationSessions.weekday.map(range).join(' and '),appointmentTimes.weekday);
 assert.equal(consultationSessions.sunday.length,1);
 assert.ok(appointmentTimes.sunday.startsWith(range(consultationSessions.sunday[0])+'.'));
 assert.equal(sessionsFor(0),consultationSessions.sunday);assert.equal(sessionsFor(3),consultationSessions.weekday);
});
test('session data matches both doctors in the booking engine settings',()=>{
 const settings=JSON.parse(readFileSync(new URL('../../appointment-settings/business-settings.json',import.meta.url)));
 const minutes=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
 assert.equal(settings.resources.length,2);
 for(const resource of settings.resources){
  for(let engineDay=0;engineDay<7;engineDay++){
   const day=(engineDay+1)%7; // the engine counts Monday as 0; the sign counts Sunday as 0
   const windows=resource.weekly_windows.filter(w=>w.weekday===engineDay).map(w=>[minutes(w.start),Math.max(minutes(w.end),...(w.extra_starts||[]).map(minutes))]).sort((a,b)=>a[0]-b[0]);
   assert.deepEqual(windows,sessionsFor(day),`${resource.id} weekday ${engineDay}`);
  }
 }
});
test('open during a session, including the last starting minute',()=>{
 assert.deepEqual(clinicStatus(at('2026-11-16T05:30:00Z')),{open:true,label:'Open now',detail:'Last appointment starts at 1:30 pm'});
 assert.equal(clinicStatus(at('2026-11-16T08:00:00Z')).open,true);
 assert.deepEqual(clinicStatus(at('2026-11-16T15:00:00Z')),{open:true,label:'Open now',detail:'Last appointment starts at 8:30 pm'});
 assert.equal(clinicStatus(at('2026-11-15T05:30:00Z')).detail,'Last appointment starts at 1:30 pm');
});
test('closed between sessions says when appointments start, with a countdown in the last hour',()=>{
 assert.deepEqual(clinicStatus(at('2026-11-16T08:01:00Z')),{open:false,soon:false,label:'Closed now',detail:'Appointments from 6:00 pm today'});
 assert.deepEqual(clinicStatus(at('2026-11-16T11:45:00Z')),{open:false,soon:true,label:'Closed now',detail:'Appointments in 45 min, at 6:00 pm'});
 assert.equal(clinicStatus(at('2026-11-16T11:29:00Z')).soon,false);
 assert.deepEqual(clinicStatus(at('2026-11-16T01:30:00Z')),{open:false,soon:false,label:'Closed now',detail:'Appointments from 10:00 am today'});
 assert.equal(clinicStatus(at('2026-11-14T18:40:00Z')).detail,'Appointments from 10:00 am today');
});
test('after the last session it points to the next day, Sunday evening included',()=>{
 assert.equal(clinicStatus(at('2026-11-16T15:01:00Z')).detail,'Appointments from 10:00 am tomorrow');
 assert.equal(clinicStatus(at('2026-11-15T09:30:00Z')).detail,'Appointments from 10:00 am tomorrow');
 assert.equal(clinicStatus(at('2026-11-14T15:30:00Z')).detail,'Appointments from 10:00 am tomorrow');
});
test('skips days without sessions and never invents a time',()=>{
 const sparse={weekday:[],sunday:[[600,700]]};
 assert.equal(clinicStatus(at('2026-11-16T15:01:00Z'),{weekday:[[600,700]],sunday:[]}).detail,'Appointments from 10:00 am tomorrow');
 assert.equal(clinicStatus(at('2026-11-16T05:30:00Z'),sparse).detail,'Appointments from 10:00 am on Sunday');
 assert.deepEqual(clinicStatus(at('2026-11-16T05:30:00Z'),{weekday:[],sunday:[]}),{open:false,soon:false,label:'Closed now',detail:'Call the clinic for timings'});
});
test('every live line stays short enough for one line on a 320 px phone',()=>{
 for(let m=0;m<7*24*60;m+=15){const s=clinicStatus(new Date(Date.UTC(2026,10,15,0,m)-330*60000));assert.ok(s.detail.length<=36,s.detail);}
 assert.ok(NEUTRAL.detail.length<=36);
});

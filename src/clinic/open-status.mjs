// Live "Open now / Closed now" sign, worked out from the clinic's appointment starting times
// in India time. The page HTML carries a neutral line; the browser replaces it with the live
// status and refreshes it every half minute while the page is open.
import {consultationSessions,escapeHTML as e} from './model.mjs';

const ZONE='Asia/Kolkata';
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const NEUTRAL={label:'Appointment times',detail:'Mon–Sat 10:00 am–1:30 pm and 6:00–8:30 pm · Sun 10:00 am–1:30 pm'};

export function sessionsFor(day,sessions=consultationSessions){return day===0?sessions.sunday:sessions.weekday;}

export function clinicClock(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const part=type=>parts.find(p=>p.type===type)?.value;
 return {day:DAYS.indexOf(part('weekday')),minutes:Number(part('hour'))*60+Number(part('minute'))};
}

export function formatTime(minutes){
 const h=Math.floor(minutes/60),m=minutes%60,suffix=h>=12?'pm':'am',h12=h%12||12;
 return `${h12}:${String(m).padStart(2,'0')} ${suffix}`;
}

export function clinicStatus(date=new Date(),sessions=consultationSessions){
 const {day,minutes}=clinicClock(date);
 const today=sessionsFor(day,sessions);
 const current=today.find(([start,end])=>minutes>=start&&minutes<=end);
 if(current)return {open:true,label:'Open now',detail:`Doctors are seeing patients until ${formatTime(current[1])}`};
 const later=today.find(([start])=>start>minutes);
 if(later){
  const wait=later[0]-minutes;
  return {open:false,soon:wait<=60,label:'Closed now',detail:wait<=60?`Opens in ${wait} min, at ${formatTime(later[0])}`:`Opens today at ${formatTime(later[0])}`};
 }
 for(let ahead=1;ahead<=7;ahead++){
  const next=sessionsFor((day+ahead)%7,sessions)[0];
  if(next)return {open:false,soon:false,label:'Closed now',detail:ahead===1?`Opens tomorrow at ${formatTime(next[0])}`:`Opens ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][(day+ahead)%7]} at ${formatTime(next[0])}`};
 }
 return {open:false,soon:false,label:'Closed now',detail:'Call the clinic for timings'};
}

export function openStatus(variant='light'){
 return `<p class="open-status open-status-${e(variant)}" data-open-status data-state="pending"><span class="open-status-dot" aria-hidden="true"></span><span class="open-status-label">${e(NEUTRAL.label)}</span><span class="open-status-detail">${e(NEUTRAL.detail)}</span></p>`;
}

export function paintOpenStatus(node,status){
 const state=status.open?'open':status.soon?'soon':'closed';
 if(node.dataset.state!==state)node.dataset.state=state;
 const label=node.querySelector('.open-status-label'),detail=node.querySelector('.open-status-detail');
 if(label&&label.textContent!==status.label)label.textContent=status.label;
 if(detail&&detail.textContent!==status.detail)detail.textContent=status.detail;
}

export function bindOpenStatus({root=document,signal,now=()=>new Date(),every=30000,timers=globalThis}={}){
 const nodes=[...root.querySelectorAll('[data-open-status]')];
 if(!nodes.length)return ()=>{};
 const update=()=>{const status=clinicStatus(now());for(const node of nodes)paintOpenStatus(node,status);};
 update();
 const id=timers.setInterval(update,every);
 const stop=()=>timers.clearInterval(id);
 signal?.addEventListener('abort',stop,{once:true});
 return stop;
}

// Live "Open now / Closed now" sign, worked out from the clinic's appointment starting times
// in India time. The page HTML carries a short neutral line (hidden until painted, the same
// size as the live sign); the browser replaces it with the live status and refreshes it every
// half minute while the page is open. A failure leaves the sign hidden and never stops the page.
import {consultationSessions,escapeHTML as e} from './model.mjs';

const INDIA_OFFSET_MINUTES=330; // India has one fixed offset (UTC+5:30) and no daylight saving.
const DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const NBSP=' ';
export const NEUTRAL={label:'Appointment times',detail:'Mornings daily · evenings Mon–Sat'};

export function sessionsFor(day,sessions=consultationSessions){return day===0?sessions.sunday:sessions.weekday;}

export function clinicClock(date=new Date()){
 const india=new Date(date.getTime()+INDIA_OFFSET_MINUTES*60000);
 return {day:india.getUTCDay(),minutes:india.getUTCHours()*60+india.getUTCMinutes()};
}

export function formatTime(minutes){
 const h=Math.floor(minutes/60),m=minutes%60,suffix=h>=12?'pm':'am',h12=h%12||12;
 return `${h12}:${String(m).padStart(2,'0')}${NBSP}${suffix}`;
}

export function clinicStatus(date=new Date(),sessions=consultationSessions){
 const {day,minutes}=clinicClock(date);
 const today=sessionsFor(day,sessions);
 const current=today.find(([start,end])=>minutes>=start&&minutes<=end);
 if(current)return {open:true,label:'Open now',detail:`Last appointment starts at ${formatTime(current[1])}`};
 const later=today.find(([start])=>start>minutes);
 if(later){
  const wait=later[0]-minutes;
  return {open:false,soon:wait<=60,label:'Closed now',detail:wait<=60?`Appointments in ${wait} min, at ${formatTime(later[0])}`:`Appointments from ${formatTime(later[0])} today`};
 }
 for(let ahead=1;ahead<=7;ahead++){
  const next=sessionsFor((day+ahead)%7,sessions)[0];
  if(next)return {open:false,soon:false,label:'Closed now',detail:ahead===1?`Appointments from ${formatTime(next[0])} tomorrow`:`Appointments from ${formatTime(next[0])} on ${DAY_NAMES[(day+ahead)%7]}`};
 }
 return {open:false,soon:false,label:'Closed now',detail:'Call the clinic for timings'};
}

export function openStatus(variant='light'){
 return `<div class="open-status open-status-${e(variant)}" data-open-status data-state="pending" data-nosnippet><span class="open-status-dot" aria-hidden="true"></span><span class="open-status-label">${e(NEUTRAL.label)}</span><span class="open-status-detail">${e(NEUTRAL.detail)}</span></div>`;
}

export function paintOpenStatus(node,status){
 const state=status.open?'open':status.soon?'soon':'closed';
 if(node.dataset.state!==state)node.dataset.state=state;
 const label=node.querySelector('.open-status-label'),detail=node.querySelector('.open-status-detail');
 if(label&&label.textContent!==status.label)label.textContent=status.label;
 if(detail&&detail.textContent!==status.detail)detail.textContent=status.detail;
}

export function bindOpenStatus({root=document,signal,now=()=>new Date(),every=30000,timers=globalThis}={}){
 try{
  const nodes=[...root.querySelectorAll('[data-open-status]')];
  if(!nodes.length)return ()=>{};
  const update=()=>{try{const status=clinicStatus(now());for(const node of nodes)paintOpenStatus(node,status);}catch{/* the sign stays as it was; the page carries on */}};
  update();
  const id=timers.setInterval(update,every);
  const stop=()=>timers.clearInterval(id);
  signal?.addEventListener('abort',stop,{once:true});
  return stop;
 }catch{return ()=>{};}
}

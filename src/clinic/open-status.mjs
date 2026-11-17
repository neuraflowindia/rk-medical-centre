// The clinic's clock: whether appointments are starting now, worked out from the clinic's
// appointment starting times in India time, and the words for it. The open sign, the hours table
// and the page words all read these; how the sign is drawn and refreshed is the sign's own part
// (src/site/parts/open-sign).
import {consultationSessions} from './model.mjs';

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

// Marks today's row of every timetable on the page (the clinic's day, India time).
import {clinicClock} from '../../../clinic/open-status.mjs';

/** Does a row's list of weekdays ("1 2 3 4 5 6") hold this day (pure)? */
export function rowHolds(days,day){
 return String(days||'').split(/\s+/u).filter(Boolean).map(Number).includes(day);
}

/** Show the "Today" tag on the row of `day` (Sunday is 0) and nowhere else. */
export function paintToday(root,day){
 for(const row of root.querySelectorAll('[data-hours-table] tr[data-days]')){
  const today=rowHolds(row.getAttribute('data-days'),day),tag=row.querySelector('[data-today]');
  if(row.classList.contains('is-today')!==today)row.classList.toggle('is-today',today);
  if(tag&&tag.hidden===today)tag.hidden=!today;
 }
}

export function bindHoursTable(root,{now=()=>new Date()}={}){
 if(!root.querySelector('[data-hours-table]'))return null;
 const repaint=()=>paintToday(root,clinicClock(now()).day);
 repaint();
 return repaint;
}

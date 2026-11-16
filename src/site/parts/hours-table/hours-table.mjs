// The week's appointment times as a small timetable: a morning and an evening column, one row
// per run of days, "Closed" where there is no session, and a flat "Today" tag on today's row.
// The same part serves the address card on Home and the Contact page.
import {timetable} from '../../../clinic/page-content/shared.mjs';
import {attrs,classes,text} from '../../lib/html.mjs';

/**
 *   rows     the rows to print (default: the clinic's week from clinic/page-content/shared.mjs)
 *   caption  the table's name for assistive technology
 *   roomy    true for taller rows, where the timetable is the subject of its section
 * The "Today" tag is printed hidden on every row; the behaviour shows it on today's row (India time).
 */
export function hoursTable(ctx,{rows=timetable.rows,caption=timetable.caption,roomy=false,className=''}={}){
 const cell=value=>value?`<td>${text(value)}</td>`:`<td class="hours-table__none">${text(timetable.closed)}</td>`;
 return `<table${attrs({class:classes('hours-table',roomy&&'hours-table--roomy',className),'data-hours-table':true})}><caption class="visually-hidden">${text(caption)}</caption>`
  +`<thead><tr><th scope="col"><span class="visually-hidden">${text(timetable.days)}</span></th><th scope="col">${text(timetable.morning)}</th><th scope="col">${text(timetable.evening)}</th></tr></thead>`
  +`<tbody>${rows.map(row=>`<tr data-days="${row.days.join(' ')}"><th scope="row"><span class="hours-table__days">${text(row.label)}</span>`
   +`<span class="hours-table__today" data-today hidden>${text(timetable.today)}</span></th>${cell(row.morning)}${cell(row.evening)}</tr>`).join('')}</tbody></table>`;
}

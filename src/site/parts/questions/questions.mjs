// Questions: a quiet accordion of native <details> rows. One row is open at a time (the rows
// share a name); with scripts off every row still opens and closes by itself.
import {attrs,classes,text} from '../../lib/html.mjs';

/**
 *   rows  [{id, question, answer}]  (answer: one or more plain sentences)
 *   name  the group name that makes the rows exclusive; give each group on a page its own
 *   open  which row starts open (index); -1 for none
 *   level the heading level of each question (3 inside a section with an h2)
 */
export function questions(rows,{name='questions',open=0,level=3,className=''}={}){
 if(!Array.isArray(rows)||!rows.length)throw new RangeError('Questions need at least one row');
 const items=rows.map((row,index)=>
  `<details${attrs({class:'questions__row',name,id:row.id?`question-${row.id}`:null,open:index===open})}>`
  +`<summary class="questions__summary"><h${level} class="questions__question">${text(row.question)}</h${level}>`
  +`<svg class="icon questions__mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="questions__mark-upright" d="M12 5.500v13"/><path d="M5.500 12h13"/></svg></summary>`
  +`<div class="questions__panel"><div class="questions__answer"><p>${text(row.answer)}</p></div></div></details>`).join('');
 return `<div${attrs({class:classes('questions',className),'data-questions':true})}>${items}</div>`;
}

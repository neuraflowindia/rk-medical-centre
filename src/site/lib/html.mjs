// Small helpers every template uses. Pure text in, pure text out: no document, no window.
import {escapeHTML} from '../../clinic/model.mjs';

/** Escape a value for use as text or inside a quoted attribute. */
export const e=escapeHTML;

const NBSP='\u00A0';
/**
 * Escape text and keep short pairs together so a line never ends on "Dr." or "R.":
 * "Dr. Sanjay Gupta" → "Dr.&nbsp;Sanjay Gupta", "R. K. Medical Centre" → "R.&nbsp;K. Medical Centre",
 * "10:00 am" → "10:00&nbsp;am", "since 1992" → "since&nbsp;1992".
 */
export function text(value){
 return e(String(value)
  .replace(/\b(Dr|R|No|Reg)\. (?=\S)/gu,`$1.${NBSP}`)
  .replace(/(\d) (am|pm)\b/gu,`$1${NBSP}$2`)
  .replace(/\b(\d{5}) (\d{5})\b/gu,`$1${NBSP}$2`)
  .replace(/\bsince (?=\d{4}\b)/gu,`since${NBSP}`)
 ).replaceAll(NBSP,'&nbsp;');
}

/** Space-separated class names; false, null, undefined and empty entries are left out. */
export function classes(...names){
 return names.flat().filter(name=>typeof name==='string'&&name.trim()).map(name=>name.trim()).join(' ');
}

/**
 * Attributes from an object, with a leading space: attrs({href:'/x',hidden:true,title:null}) → ' href="/x" hidden'.
 * `true` prints the bare name; `false`, `null` and `undefined` print nothing.
 */
export function attrs(map={}){
 let output='';
 for(const [name,value] of Object.entries(map)){
  if(value===false||value===null||value===undefined)continue;
  if(!/^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/u.test(name))throw new RangeError('Unsafe attribute name: '+name);
  output+=value===true?` ${name}`:` ${name}="${e(value)}"`;
 }
 return output;
}

/** Is booking shown in this page's state? */
export const bookingOn=ctx=>ctx?.mode==='on';

/**
 * One element whose words differ by booking state (contract 2.3). The element holds text only;
 * the booking package rewrites it when the state changes.
 * stateText(ctx,{on:'Book an appointment',off:'Arrange a visit'}) → '<span data-booking-on="…" data-booking-off="…">…</span>'
 */
export function stateText(ctx,{on,off,tag='span',className=''}){
 return `<${tag}${attrs({class:className||null,'data-booking-on':on,'data-booking-off':off})}>${e(bookingOn(ctx)?on:off)}</${tag}>`;
}

/**
 * A heading's words with one phrase in italics that never breaks across lines:
 * emphasise('Two doctors. One family practice.','One family practice.') → 'Two doctors. <em>One&nbsp;family&nbsp;practice.</em>'
 * Without a matching phrase the words are returned escaped, unchanged.
 */
export function emphasise(words,phrase=''){
 const all=String(words),part=String(phrase||'');
 const at=part?all.lastIndexOf(part):-1;
 if(at<0)return text(all);
 const before=all.slice(0,at),after=all.slice(at+part.length);
 return `${text(before)}<em>${e(part).replaceAll(' ','&nbsp;')}</em>${text(after)}`;
}

/** "a.webp 264w, b.webp 528w" from [{src,width}]. */
export function srcset(sources){
 return sources.map(source=>`${source.src} ${source.width}w`).join(', ');
}

/**
 * An <img> from a picture record {src,width,height,alt,sources?}. `sources` (several widths of
 * the same picture) becomes srcset; `sizes` must then be given. Pictures below the first screen
 * load lazily unless `eager` is set; `eager` also marks the picture as important for the first paint.
 */
export function image(record,{sizes='',alt,eager=false,className='',attributes={}}={}){
 if(!record||!record.src)throw new RangeError('A picture record with src is needed');
 const many=Array.isArray(record.sources)&&record.sources.length>1;
 if(many&&!sizes)throw new RangeError('sizes is needed when a picture has several widths: '+record.src);
 return `<img${attrs({class:className||null,src:record.src,srcset:many?srcset(record.sources):null,sizes:many?sizes:null,
  width:record.width,height:record.height,alt:alt??record.alt??'',loading:eager?null:'lazy',fetchpriority:eager?'high':null,decoding:'async',...attributes})}>`;
}

/** Paragraphs from a list of plain sentences. */
export function paragraphs(list){
 return list.map(item=>`<p>${text(item)}</p>`).join('');
}

/** Guard for a template that must print exactly one of the known options. */
export function oneOf(value,allowed,name='option'){
 if(!allowed.includes(value))throw new RangeError(`Unknown ${name}: ${value}`);
 return value;
}

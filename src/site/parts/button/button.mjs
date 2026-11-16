// Buttons, text links, chips, tabs and tags: the site's pressable family and its flat labels.
// Raised = pressable, pressed-in = chosen, flat = information. Every control is at least 48 px tall.
import {doctors} from '../../../clinic/model.mjs';
import {actionLabels,bookWithLabel,bookWithPath,bookingEntryFor,bookingPaths,callDoctorLabel,callDoctorSpoken,callSheet as callWords} from '../../../clinic/page-content/shared.mjs';
import {attrs,bookingOn,classes,e,oneOf,stateText,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';

const VARIANTS=['main','second','on-deep','outline-on-deep'];
const SIZES=['regular','compact','large'];

/**
 * A raised button. With `href` it is a link, without it a <button>.
 *   variant  'main' (filled, one per view) · 'second' (paper, action ring) · 'on-deep' · 'outline-on-deep'
 *   size     'regular' (52 px) · 'compact' (48 px) · 'large' (56 px)
 *   icon     an icon name shown before the label; iconAfter: one shown after it
 *   external true for a link that leaves the site (opens a new tab; say where in `spoken` or `note`)
 *   note     words for assistive technology only, after the label, e.g. "(opens Google Maps)"
 *   labelMarkup  ready-made inner markup instead of `label` (used for state-aware words)
 *   labelHidden  'narrow': below 768 px the button shows its icon alone in a 48 px square (the label stays for assistive technology)
 */
export function button({label='',labelMarkup='',href,variant='main',size='regular',icon:before='',iconAfter='',external=false,
 spoken='',note='',type='button',labelHidden='',className='',attributes={}}={}){
 oneOf(variant,VARIANTS,'button variant');oneOf(size,SIZES,'button size');oneOf(labelHidden,['','narrow'],'hidden label');
 if(labelHidden&&!before&&!iconAfter)throw new RangeError('A button that hides its label needs an icon');
 const inner=`${before?icon(before):''}<span class="button__label">${labelMarkup||text(label)}</span>${iconAfter?icon(iconAfter):''}${note?`<span class="visually-hidden"> ${e(note)}</span>`:''}`;
 const shared={class:classes('button',`button--${variant}`,size!=='regular'&&`button--${size}`,labelHidden&&'button--icon-narrow',className),'aria-label':spoken||null,...attributes};
 if(href===undefined||href===null)return `<button${attrs({type,...shared})}>${inner}</button>`;
 return `<a${attrs({href,...(external?{target:'_blank',rel:'noopener'}:{}),...shared})}>${inner}</a>`;
}

/**
 * "Book with Dr. Sanjay": an ordinary booking link. It exists only while booking is ON; the
 * build and the runtime hide it while OFF, and Call is then the remaining action (contract 2.4).
 * Without `doctor` it reads "Book an appointment" and opens the booking screen with no doctor chosen.
 */
export function bookButton(ctx,{doctor='',topic='',label='',size='regular',variant='main',className='',attributes={}}={}){
 const href=doctor?bookWithPath(doctor,topic):bookingPaths.book;
 return button({label:label||(doctor?bookWithLabel(doctor):bookingEntryFor('page',true).label),href,variant,size,className,attributes});
}

/**
 * The main booking control of the header (`place: 'header'`) or of a page's first screen
 * (`place: 'page'`). It never disappears: ON it opens booking, OFF it leads to Contact with the
 * OFF words (contract 2.4). `hook` adds the contract's own attribute name.
 */
export function bookingEntry(ctx,{place='page',size='regular',variant='main',className='',hook=''}={}){
 oneOf(place,['header','page'],'booking entry');
 const on=bookingEntryFor(place,true),off=bookingEntryFor(place,false),now=bookingOn(ctx)?on:off;
 const icons=`<span class="button__state-icon" data-home-entry-icon="calendar"${bookingOn(ctx)?'':' hidden'}>${icon('calendar')}</span><span class="button__state-icon" data-home-entry-icon="phone"${bookingOn(ctx)?' hidden':''}>${icon('phone')}</span>`;
 return `<a${attrs({class:classes('button',`button--${variant}`,size!=='regular'&&`button--${size}`,'button--entry',className),href:now.path,
  'aria-label':now.spoken,title:now.hint,'data-booking-entry':place,...(hook?{[hook]:true}:{})})}>${icons}${stateText(ctx,{on:on.label,off:off.label,className:'button__label'})}</a>`;
}

/**
 * Call. With `doctor` it dials that doctor (and on a pointer device opens the call panel on that
 * doctor's row); without, it opens the call sheet or panel, and with scripts off leads to the
 * footer's numbers. `lead: true` marks the button that takes over as the main action while
 * booking is OFF: it then reads "Call Dr. Sanjay" and takes the filled look.
 */
export function callButton(ctx,{doctor='',label='',variant='second',size='regular',lead=false,className='',attributes={}}={}){
 const shared={variant,size,icon:'phone',className:classes(className,lead&&'button--lead')};
 if(!doctor)return button({...shared,label:label||actionLabels.call,href:'#footer-calls',spoken:callWords.title,
  attributes:{'aria-haspopup':'dialog','data-open-call':'',...attributes}});
 if(!Object.hasOwn(doctors,doctor))throw new RangeError('Unknown doctor: '+doctor);
 const short=label||actionLabels.call,full=callDoctorLabel(doctor);
 return button({...shared,labelMarkup:lead?stateText(ctx,{on:short,off:full}):text(short),href:`tel:${doctors[doctor].tel}`,
  spoken:callDoctorSpoken(doctor),attributes:{'data-open-call':doctor,...attributes}});
}

/** A quiet link with an arrow: `arrow` stays inside the site, `out` leaves it (and opens a new tab). */
export function textLink({label,href,icon:after='arrow',external=false,note='',className='',attributes={}}={}){
 const mark=after?icon(external?'out':after):'';
 const inner=`<span>${text(label)}</span>${mark}${note?`<span class="visually-hidden"> ${e(note)}</span>`:''}`;
 if(href===undefined||href===null)return `<button${attrs({type:'button',class:classes('text-link',className),...attributes})}>${inner}</button>`;
 return `<a${attrs({class:classes('text-link',className),href,...(external?{target:'_blank',rel:'noopener'}:{}),...attributes})}>${inner}</a>`;
}

/** A round 48 px icon button (shelf arrows, close). `label` is required: the icon has no words. */
export function roundButton({icon:name,label,quiet=false,className='',attributes={}}){
 if(!label)throw new RangeError('A round button needs a spoken label');
 return `<button${attrs({type:'button',class:classes('round-button',quiet&&'round-button--quiet',className),'aria-label':label,...attributes})}>${icon(name)}</button>`;
}

/**
 * One chip of a choice row. In the page it is a link (so it works without scripts and is never
 * a disabled form control); the owning part's behaviour turns the row into a radio group.
 */
export function chip({label,href,chosen=false,className='',attributes={}}){
 return `<a${attrs({class:classes('chip',className),href,'data-chip':true,'data-chosen':chosen,...attributes})}><span class="chip__label">${text(label)}</span></a>`;
}

/**
 * One tab of a tab list (a real <button role="tab">; its part's behaviour moves the selection).
 *   count  a number shown after the label ("All 26")
 */
export function tab({label,id,controls,selected=false,count=null,className='',attributes={}}){
 const number=count===null?'':` <span class="tab__count">${text(count)}</span>`;
 return `<button${attrs({type:'button',class:classes('tab',className),role:'tab',id,'aria-controls':controls,'aria-selected':selected?'true':'false',tabindex:selected?null:'-1',...attributes})}>${text(label)}${number}</button>`;
}

/** A flat label: information, never pressable. tone: 'gold' (honours) or 'plain'. */
export function tag({label,icon:name='',tone='plain',className=''}){
 oneOf(tone,['plain','gold'],'tag tone');
 return `<p${attrs({class:classes('tag',`tag--${tone}`,className)})}>${name?icon(name):''}${text(label)}</p>`;
}

// The Contact message form: a sheet of writing paper that shows one screen at a time.
//
// The engine fixes the fields (name, email, optional phone, message) and the emailed six-digit
// code; every hook it reads is printed here (build plan, contract 2.5). What this file designs is
// the screens: opening · ready · sending · the code · expired · locked · received · closed
// (messages switched off) · could not open · storage blocked. `data-state` on the root names the
// screen; clinic/contact-form.js decides it and shows or hides the parts.
//
// The page is printed in the `opening` screen: fields flat and unavailable, no live-looking Send.
// Without scripts the form is not shown at all; a plain note offers Call and WhatsApp instead.
import {messageForm as words,contactPage} from '../../../clinic/page-content/contact.mjs';
import {callDoctorLabel,callRows} from '../../../clinic/page-content/shared.mjs';
import {attrs,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {button,callButton} from '../../parts/button/button.mjs';

/** The row under a field that says what is wrong: an icon and words, never colour alone. */
function fieldError(name){
 return `<p class="message-form__error" id="contact-${name}-error" data-contact-error="${name}" hidden>${icon('alert')}<span data-error-text></span></p>`;
}

function field(item){
 const hint=item.hint?`<p class="message-form__hint" id="contact-${item.name}-hint">${text(item.hint)}</p>`:'';
 const describedBy=`contact-${item.name}-error${item.hint?` contact-${item.name}-hint`:''}`;
 return `<div class="message-form__field"><label class="message-form__label" for="contact-${item.name}">${text(item.label)}`
  +`${item.required?'':` <span class="message-form__optional">(${text(words.optional)})</span>`}</label>`
  +`<input${attrs({class:'message-form__input',id:`contact-${item.name}`,name:item.name,type:item.type,inputmode:item.inputmode||null,autocomplete:item.autocomplete,
   maxlength:String(item.maxlength),required:item.required,'aria-describedby':describedBy})}>${fieldError(item.name)}${hint}</div>`;
}

/** Call and WhatsApp, for every screen on which a message cannot be written. */
function instead(ctx){
 const calls=callRows().map(row=>callButton(ctx,{doctor:row.id,label:callDoctorLabel(row.id),variant:'second'})).join('');
 return calls+button({label:contactPage.whatsapp.label,href:contactPage.whatsapp.href,variant:'second',icon:'whatsapp',iconAfter:'out',external:true,note:contactPage.whatsapp.opens});
}

/**
 * One screen that replaces the fields: a heading and a sentence. The heading takes the focus when
 * its screen opens. `mark` sets a small sign before the heading's words (the thank-you's check).
 */
function panel(name,{title,lead='',body,mark=''}){
 return `<div class="message-form__panel message-form__panel--${name}" data-contact-panel="${name}" hidden>`
  +`<h3 class="message-form__panel-title" tabindex="-1" data-contact-panel-title>${mark?`${icon(mark,{className:'message-form__panel-mark'})}<span>${text(title)}</span>`:text(title)}</h3>`
  +`${lead?`<p class="message-form__panel-lead">${text(lead)}</p>`:''}<p class="message-form__panel-text">${text(body)}</p></div>`;
}

/** The three steps beside the sheet. The numbers are real: the order is fixed. */
function steps(){
 return `<ol class="message-form__steps" aria-label="${text(words.stepsLabel)}" data-message-steps data-needs-script>`
  +words.steps.map((step,index)=>`<li${attrs({class:'message-form__step','data-message-step':step.id,'aria-current':index===0?'step':null})}>`
   +`<span class="message-form__step-number" aria-hidden="true">${index+1}</span><span class="message-form__step-label"><span class="wide-only">${text(step.label)}</span><span class="narrow-only">${text(step.short)}</span></span></li>`).join('')
  +`</ol><p class="message-form__why" data-needs-script>${text(words.stepsWhy)}</p>`;
}

function codeScreen(){
 const code=words.code;
 return `<div class="message-form__code" data-contact-verification hidden>`
  +`<h3 class="message-form__panel-title" tabindex="-1" data-contact-code-title>${text(code.title)}</h3>`
  +`<p class="message-form__panel-text" data-contact-sent-to>${text(code.sentTo(''))}</p>`
  +`<div class="message-form__code-entry" data-contact-code-entry><div class="message-form__field">`
  +`<label class="message-form__label" for="contact-code">${text(code.label)}</label>`
  +`<input class="message-form__input message-form__input--code" id="contact-code" name="code" inputmode="numeric" enterkeyhint="send" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" aria-describedby="contact-code-error contact-code-help">`
  +`${fieldError('code')}</div>`
  +button({label:code.verify,size:'large',className:'message-form__confirm',attributes:{'data-contact-verify':true}})+`</div>`
  // "Send another code" is a paper button: raised when it can be pressed, flat while the countdown runs.
  +`<div class="message-form__resend">${button({label:code.resend,variant:'second',size:'compact',attributes:{'data-contact-resend':true}})}`
  +`<p class="message-form__meta"><span data-contact-countdown></span> <span data-contact-remaining></span></p></div>`
  +`<p class="message-form__help" id="contact-code-help">${text(code.help)}</p></div>`;
}

export function messageForm(ctx){
 const message=words.message;
 return `<div class="message-form" data-message-form data-state="opening">`
  +`<div class="message-form__guide">${steps()}</div>`
  +`<form class="message-form__sheet" data-contact-form method="post" novalidate aria-label="${text(words.label)}" data-needs-script>`
  +`<p class="message-form__status" data-contact-status role="status" aria-live="polite">${text(words.status.opening)}</p>`
  +`<div class="message-form__alert" data-contact-alert tabindex="-1" hidden>${icon('alert')}<p data-contact-error-summary role="alert" hidden></p></div>`
  // screen: the fields
  +`<fieldset class="message-form__fields" data-contact-fields disabled><legend class="visually-hidden">${text(words.legend)}</legend>`
  +words.fields.map(field).join('')
  +`<div class="message-form__field"><label class="message-form__label" for="contact-message">${text(message.label)}</label>`
  +`<textarea class="message-form__input message-form__input--message" id="contact-message" name="message" rows="3" required minlength="2" maxlength="${message.maxlength}" aria-describedby="contact-message-error"></textarea>`
  +`${fieldError('message')}</div></fieldset>`
  +`<div class="message-form__compose" data-contact-compose>`
  +`<p class="message-form__consent" id="contact-collection">${text(words.consent)} <button class="text-link message-form__notice" type="button" aria-haspopup="dialog" data-collection-notice>${text(words.notice)}</button></p>`
  // The built document prints Send locked; the form's logic then switches it on and off (aria-disabled:
  // it keeps its place in the keyboard's path, so the focus is never lost while a message is sent).
  +`<button class="button button--main button--large message-form__send" type="submit" aria-describedby="contact-collection" data-contact-send><span class="button__label" data-contact-send-label>${text(words.send)}</span></button></div>`
  // screen: the emailed code (also expired and locked)
  +codeScreen()
  // screens that replace the fields
  +panel('received',{title:words.received.title,lead:words.received.lead,body:words.received.text,mark:'check'})
  +panel('closed',{title:words.closed.title,body:words.closed.text})
  +panel('failed',{title:words.failed.title,body:words.failed.text})
  +panel('blocked',{title:words.blocked.title,body:words.blocked.text})
  +`<div class="message-form__instead" data-contact-instead hidden>${instead(ctx)}</div>`
  +`<div class="message-form__actions">`
  +button({labelMarkup:`<span data-contact-retry-label>${text(words.retry)}</span>`,variant:'second',attributes:{'data-contact-retry':true,hidden:true}})
  +button({label:words.check,variant:'second',attributes:{'data-contact-check':true,hidden:true}})
  +button({label:words.received.restart,variant:'second',attributes:{'data-contact-restart':true,hidden:true}})
  +`</div></form>`
  // without scripts: an honest note, never a form that cannot be sent
  +`<div class="message-form__sheet message-form__plain" data-without-script><p class="message-form__panel-text">${text(words.withoutScript)}</p>`
  +`<div class="message-form__instead">${instead(ctx)}</div></div>`
  +`</div>`;
}

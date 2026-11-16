// The Contact message form — SKELETON with every hook the engine reads (contract 2.5).
// The fields are fixed by the engine: name, email (a six-digit code is emailed and must be
// entered), phone (optional), message. The fieldset is printed disabled; the form's own script
// (clinic/contact-form.js) opens it when the engine says the form may be used.
import {messageForm as words} from '../../../clinic/page-content/contact.mjs';
import {footer} from '../../../clinic/page-content/shared.mjs';
import {attrs,text} from '../../lib/html.mjs';

function field(item){
 const describedBy=`contact-${item.name}-error${item.name==='phone'?' contact-phone-hint':''}`;
 return `<label class="message-form__field" for="contact-${item.name}">${text(item.label)} <span>(${text(item.required?words.required:words.optional)})</span>`
  +`<input${attrs({id:`contact-${item.name}`,name:item.name,type:item.type,autocomplete:item.autocomplete,maxlength:String(item.maxlength),required:item.required,'aria-describedby':describedBy})}>`
  +`<span class="message-form__error" id="contact-${item.name}-error" data-contact-error="${item.name}"></span></label>`;
}

export function messageForm(ctx){
 return `<form class="message-form" data-contact-form method="post" novalidate aria-label="${text(words.label)}" aria-describedby="contact-collection">`
  +`<fieldset class="message-form__fields" data-contact-fields disabled><legend class="visually-hidden">${text(words.legend)}</legend>`
  +words.fields.map(field).join('')
  +`<p class="message-form__hint" id="contact-phone-hint">${text(words.phoneHint)}</p>`
  +`<label class="message-form__field" for="contact-message">${text(words.message)} <span>(${text(words.required)})</span>`
  +`<textarea id="contact-message" name="message" rows="4" required minlength="2" maxlength="4000" aria-describedby="contact-message-error"></textarea>`
  +`<span class="message-form__error" id="contact-message-error" data-contact-error="message"></span></label>`
  +`<button class="button button--main" type="submit"><span class="button__label">${text(words.send)}</span></button></fieldset>`
  +`<p class="message-form__hint" id="contact-collection">${text(words.consent)} <button class="text-link" type="button" data-collection-notice>${text(footer.detailsNotice)}</button></p>`
  +`<p class="message-form__status" data-contact-status role="status" aria-live="polite">${text(words.opening)}</p>`
  +`<p class="message-form__summary" data-contact-error-summary role="alert" hidden></p>`
  +`<div class="message-form__verification" data-contact-verification hidden><label class="message-form__field" for="contact-code">${text(words.code)}`
  +`<input id="contact-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" aria-describedby="contact-code-help"></label>`
  +`<p id="contact-code-help">${text(words.codeHelp)}</p>`
  +`<button class="button button--main" type="button" data-contact-verify><span class="button__label">${text(words.verify)}</span></button>`
  +`<button class="text-link" type="button" data-contact-resend>${text(words.resend)}</button><span data-contact-countdown></span></div>`
  +`<div class="message-form__actions"><button class="text-link" type="button" data-contact-check hidden>${text(words.check)}</button>`
  +`<button class="text-link" type="button" data-contact-retry hidden>${text(words.retry)}</button>`
  +`<button class="text-link" type="button" data-contact-restart hidden>${text(words.restart)}</button></div></form>`;
}

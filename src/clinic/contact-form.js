import {createEnquiryBrowser} from '../../appointment-system/browser/enquiry/index.mjs';
import {createEnquiryAPI} from '../../appointment-system/browser/enquiry/protocol.mjs';
export function contactFormMarkup(){return `<form class="form-panel" data-contact-form method="post" novalidate aria-label="Ask the clinic" aria-describedby="contact-collection">
<fieldset data-contact-fields disabled><legend class="sr-only">Your contact details and question</legend>${[['name','Full name','text','name',100],['email','Email address','email','email',254],['phone','Phone number','tel','tel',32]].map(([name,label,type,auto,max])=>`<label for="contact-${name}">${label} <span>(${name==='phone'?'optional':'required'})</span><input id="contact-${name}" name="${name}" type="${type}" autocomplete="${auto}" maxlength="${max}" ${name==='phone'?'':'required'} aria-describedby="contact-${name}-error${name==='phone'?' contact-phone-hint':''}"><span class="field-error" id="contact-${name}-error" data-contact-error="${name}"></span></label>`).join('')}<p id="contact-phone-hint" class="field-hint">If you leave a phone number, include the country code, such as +91.</p><label for="contact-message">Your question <span>(required)</span><textarea id="contact-message" name="message" rows="4" required minlength="2" maxlength="4000" aria-describedby="contact-message-error"></textarea><span class="field-error" id="contact-message-error" data-contact-error="message"></span></label><button class="button" type="submit">Send message <span aria-hidden="true">↗</span></button></fieldset>
<p id="contact-collection" class="field-hint">The clinic uses your details to answer your question. We will email a six-digit code to check your address. <button class="text-link" type="button" data-collection-notice>How your details are used</button></p>
<p data-contact-status role="status" aria-live="polite">Opening the message form…</p><p data-contact-error-summary role="alert" hidden></p>
<div data-contact-verification hidden><label for="contact-code">Six-digit email code<input id="contact-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" aria-describedby="contact-code-help"></label><p id="contact-code-help">Enter the code sent to your email address.</p><button class="button" type="button" data-contact-verify>Check code</button><button class="text-link" type="button" data-contact-resend>Send another code</button><span data-contact-countdown></span></div>
<div class="actions"><button class="text-link" type="button" data-contact-check hidden>Check message status</button><button class="text-link" type="button" data-contact-retry hidden>Try again</button><button class="text-link" type="button" data-contact-restart hidden>Ask another question</button></div></form>`;}
export function validateContact(form){
 const fields=Object.fromEntries(['name','email','phone','message'].map(key=>[key,form.elements[key].value.trim()]));const errors={};
 if(fields.name.length<2||fields.name.length>100)errors.name='Enter your full name (2–100 characters).';
 if(!fields.email||!form.elements.email.validity.valid)errors.email='Enter a valid email address.';
 if(fields.phone&&!/^\+[1-9][0-9 ()-]{6,30}$/.test(fields.phone))errors.phone='Include your country code and check the number.';
 if(fields.message.length<2||fields.message.length>4000)errors.message='Write your question (2–4,000 characters).';
 for(const key of Object.keys(fields)){form.querySelector(`[data-contact-error="${key}"]`).textContent=errors[key]||'';form.elements[key].setAttribute('aria-invalid',String(!!errors[key]));}
 if(Object.keys(errors).length){form.elements[Object.keys(errors)[0]].focus();return null;}
 return {...fields,subject:'Website enquiry',source:'contact',kind:'contact'};
}
export function bindContactForm(form,{signal,profile=__BOOKING_PROFILE__,browser,api=createEnquiryAPI()}={}){
 if(!form)return()=>{};
 const controller=(browser||createEnquiryBrowser({version:1,installation_id:profile.installation_id,environment:profile.environment,channels:{contact:{legacy_receipts:[]}}})).controller('contact');
 const find=key=>form.querySelector(`[data-contact-${key}]`),fields=find('fields'),status=find('status'),error=find('error-summary'),code=form.elements.code;
 let ready=false,policyFailed=false,alive=true,checking=false;
 const dispose=()=>{if(!alive)return;alive=false;unsubscribe();stop();};
 const announce=value=>{if(status.textContent!==value)status.textContent=value;};
 function update(){if(!alive)return;const state=controller.getSnapshot(),receipt=state.receipt,phase=receipt?.state;
  fields.disabled=!ready||state.started||state.busy||state.blocked;
  error.hidden=!state.error;error.textContent=state.error||'';
  find('verification').hidden=!['awaiting_verification','expired','locked'].includes(phase);
  find('verify').disabled=state.busy||state.expired||phase!=='awaiting_verification'||state.waiting>0;
  code.disabled=find('verify').disabled;
  find('resend').disabled=state.busy||state.resendWait>0||!(receipt?.sends_remaining>0)||state.waiting>0;
  find('countdown').textContent=state.resendWait>0?`Another code can be sent in ${state.resendWait}s.`:'';
  find('check').hidden=!state.started||phase==='received';find('check').disabled=state.busy||state.waiting>0;
  find('retry').hidden=!(policyFailed||state.retry);find('retry').disabled=state.busy||state.waiting>0||checking;
  find('restart').hidden=phase!=='received';find('restart').disabled=state.busy;
  if(state.blocked)announce('Your browser could not safely save the message reference. Please allow session storage or call the clinic.');
  else if(phase==='received')announce('The clinic has received your question.');
  else if(phase==='awaiting_verification')announce('Check your email for the six-digit code. Your question will be sent after you confirm it.');
  else if(phase==='locked')announce('This code can no longer be checked. Request another code if available, or call the clinic.');
  else if(phase==='expired')announce('This code has expired. Request another code if available.');
  else if(state.busy)announce('Checking your message…');
  else if(policyFailed)announce('We could not open the message form. Try again or call the clinic.');
  else if(state.started)announce('Checking the message reference. Use Check message status if needed.');
  else if(ready)announce('Send your question, then confirm your email address.');
 }
 const unsubscribe=controller.subscribe(update),stop=controller.start();
 async function prepare(){if(checking||!alive)return;checking=true;policyFailed=false;update();try{await api.policy(signal);if(alive)ready=true;}catch{if(alive){ready=false;policyFailed=true;}}finally{checking=false;update();}}
 form.addEventListener('submit',event=>{event.preventDefault();if(!ready||fields.disabled)return;const payload=validateContact(form);if(payload)void controller.submit(payload);},{signal});
 find('verify').addEventListener('click',async()=>{if(!/^[0-9]{6}$/.test(code.value)){code.setAttribute('aria-invalid','true');code.focus();return;}code.removeAttribute('aria-invalid');const value=code.value;code.value='';await controller.verify(value);},{signal});
 find('resend').addEventListener('click',()=>{code.value='';void controller.resend();},{signal});
 find('check').addEventListener('click',()=>void controller.check(),{signal});
 find('retry').addEventListener('click',()=>policyFailed?void prepare():void controller.retryRequest(),{signal});
 find('restart').addEventListener('click',async()=>{if(await controller.restart()){form.reset();form.elements.name.focus();}},{signal});
 signal?.addEventListener('abort',dispose,{once:true});
 // Handlers now own these controls; the enclosing fieldset and update() keep
 // them unavailable until current policy and controller state permit use.
 form.querySelectorAll('[data-unbound-control]').forEach(control=>{control.disabled=false;control.removeAttribute('data-unbound-control');});
 update();void prepare();return dispose;
}

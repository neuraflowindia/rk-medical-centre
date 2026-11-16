// Contact: the page's own behaviour. The shared parts on the page bind themselves
// (runtime/parts.mjs). Everything added here must stop when `signal` aborts; the file must
// import cleanly outside a browser.
import {bindContactForm} from '../../../clinic/contact-form.js';

export function bindContact(root,{signal,ctx,services}={}){
 const form=root?.querySelector('[data-contact-form]');
 if(form)bindContactForm(form,{signal});
}

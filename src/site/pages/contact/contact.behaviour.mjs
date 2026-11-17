// Contact: the page's own behaviour. The shared parts on the page bind themselves
// (runtime/parts.mjs): the live sign, the "Today" tag, the Call controls, the details dialog.
// Here: the message form, and the full privacy notice opening when it is the place asked for.
// Everything added here stops when `signal` aborts; the file imports cleanly outside a browser.
import {bindContactForm} from '../../../clinic/contact-form.js';
import {privacyNotice} from '../../../clinic/page-content/contact.mjs';

/** Does this address ask for the full notice ("/contact#privacy-notice") (pure)? */
export function noticeWanted(hash,id=privacyNotice.full.id){
 return typeof hash==='string'&&hash==='#'+id;
}

/**
 * The full notice is a closed row until it is wanted. It opens by itself when the page is
 * reached at its place (the dialog's "Read the full notice", or a link from elsewhere): the
 * router moves the focus to the place, and a focused notice opens.
 */
export function bindNotice(notice,{signal,hash='',motion}={}){
 if(!notice)return;
 const open=()=>{if(!notice.open)notice.open=true;};
 if(noticeWanted(hash,notice.id))open();
 notice.addEventListener('focus',open,{signal});
 // The page grows and shrinks with the notice: parts still waiting to enter are measured again.
 notice.addEventListener('toggle',()=>motion?.remeasure?.(),{signal});
}

export function bindContact(root,{signal,services,windowObject=globalThis.window}={}){
 if(!root)return;
 const form=root.querySelector('[data-contact-form]');
 if(form)bindContactForm(form,{signal});
 bindNotice(root.querySelector('[data-privacy-notice]'),{signal,hash:windowObject?.location?.hash||'',motion:services?.motion});
}

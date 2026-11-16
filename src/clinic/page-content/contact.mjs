// Words for the Contact page and its message form. No markup lives in this file; facts are
// imported, never retyped. (Skeleton: the page head and the form's present words. The Contact
// builder fills in the rest.)
export const contactPage=Object.freeze({
 runningHead:'Contact',
 heading:'Call, message or visit.',
 emphasis:'or visit.',
 findBooking:'Already booked? Find your booking'
});

/** The message form: labels, hints and the consent line. The fields are fixed by the booking engine. */
export const messageForm=Object.freeze({
 label:'Ask the clinic',
 legend:'Your contact details and question',
 fields:Object.freeze([
  Object.freeze({name:'name',label:'Full name',type:'text',autocomplete:'name',maxlength:100,required:true}),
  Object.freeze({name:'email',label:'Email address',type:'email',autocomplete:'email',maxlength:254,required:true}),
  Object.freeze({name:'phone',label:'Phone number',type:'tel',autocomplete:'tel',maxlength:32,required:false})
 ]),
 required:'required',
 optional:'optional',
 phoneHint:'If you leave a phone number, include the country code, such as +91.',
 message:'Your question',
 send:'Send message',
 consent:'The clinic uses your details to answer your question. We will email a six-digit code to check your address.',
 opening:'Opening the message form…',
 code:'Six-digit email code',
 codeHelp:'Enter the code sent to your email address.',
 verify:'Check code',
 resend:'Send another code',
 check:'Check message status',
 retry:'Try again',
 restart:'Ask another question'
});

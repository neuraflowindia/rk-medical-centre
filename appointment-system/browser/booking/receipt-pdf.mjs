import {isV2,showDuration,locationLabel} from './experience-contract.mjs';
import {checkedReceiptFacts,appointmentLabel,money} from './protocol.mjs';

/** Only the facts printed in the document participate in its freshness check. */
export const pdfFacts=receipt=>JSON.stringify(['request_id','booking_revision','appointment_state','service_name',
 'starts_at','ends_at','timezone','amount_paise','captured_paise','refunded_paise','currency','meeting_mode','meeting_state','meet_url']
 .map(key=>receipt[key]??null).concat(isV2(receipt)?[receipt.facts_version,receipt.resource_id,receipt.resource_name,receipt.payment_method,receipt.amount_due_paise,receipt.display_duration,receipt.location?.name??null,receipt.location?.address??null,receipt.location?.maps_url??null]:[]));

export async function buildAppointmentPDF(receipt,{brand,load,contacts=[],generatedAt=new Date()}){
 const r=checkedReceiptFacts(receipt,receipt.request_id);
 if(r.appointment_state!=='confirmed' || !r.booking_revision || !r.meeting_mode)throw Error('receipt_changed');
 if(typeof brand!=='string' || !brand.trim() || brand.length>150)throw Error('pdf_unavailable');
 if(!Array.isArray(contacts)||contacts.length>10||!contacts.every(c=>c&&Object.keys(c).sort().join(',')==='label,phone'
  &&typeof c.label==='string'&&c.label.trim()&&c.label.length<=100&&!/[\u0000-\u001f\u007f]/.test(c.label)&&/^\+[1-9][0-9]{6,14}$/.test(c.phone)))throw Error('pdf_unavailable');
 const {PDFDocument,PDFName,PDFString,fontkit,fontBytes}=await load();
 if(!(fontBytes instanceof Uint8Array) || !fontBytes.length || fontBytes.length>1048576)throw Error('pdf_unavailable');
 const document=await PDFDocument.create();document.registerFontkit(fontkit);
 const font=await document.embedFont(fontBytes,{subset:true});
 const supported=new Set(font.getCharacterSet());
 const lines=[['Appointment details',20],[brand,16],[r.service_name,16],
  ...(isV2(r)?[['Doctor: '+r.resource_name,12]]:[]),
  ['Appointment: '+appointmentLabel(r.starts_at,r.timezone),12],['Time zone: '+r.timezone,12],
  ...(showDuration(r)?[['Duration: '+Math.round((Date.parse(r.ends_at)-Date.parse(r.starts_at))/60000)+' minutes',12]]:[]),
  ['Agreed fee: '+money(r.amount_paise),12],
  ...(r.payment_method==='at_clinic'?[['Payment method: Pay at the clinic',12],['Amount to pay at the clinic: '+money(r.amount_due_paise),12]]:
   [...(isV2(r)?[['Payment method: Online',12]]:[]),['Payment recorded: '+money(r.captured_paise),12],['Refund recorded: '+money(r.refunded_paise),12]]),['Booking reference: '+r.request_id,10],
  ...(r.meeting_mode==='in_person'?[['Clinic: '+locationLabel(r),12],['Directions: Open map',12]]:[[r.meeting_mode==='internal'?'Meeting: contact the practice for the arrangements.':r.meet_url?
   'Google Meet: '+r.meet_url:r.meeting_state==='needs_attention'?
   'Meeting link needs attention. Please contact the practice.':'Meeting link is being prepared. Download again later for the link.',12]]),
  ...(isV2(r)?[['For cancellations or changes, contact the clinic.',12],...contacts.map(c=>[c.label+': '+c.phone,12])]:[]),
  ['Generated: '+generatedAt.toISOString(),10],['Appointment details only. This document is not a tax invoice.',10]];
 for(const [line] of lines)for(const character of line)if(!supported.has(character.codePointAt(0)))throw Error('pdf_font_unavailable');
 let page,y,pageAnnotations;const margin=40,width=595.28,height=841.89,available=width-margin*2;
 function newPage(){page=document.addPage([width,height]);y=height-margin;pageAnnotations=[];}
 function wrap(text,size){
  const result=[];let current='';
  for(const word of text.split(/\s+/)){
   const candidate=current?current+' '+word:word;
   if(font.widthOfTextAtSize(candidate,size)<=available){current=candidate;continue;}
   if(current){result.push(current);current='';}
   for(const character of word){if(current && font.widthOfTextAtSize(current+character,size)>available){result.push(current);current='';}current+=character;}
  }
  if(current)result.push(current);return result;
 }
 newPage();
 for(const [line,size] of lines){
  for(const part of wrap(line,size)){
   if(y-size*1.45<margin)newPage();y-=size*1.45;
   page.drawText(part,{x:margin,y,size,font});
   const target=r.meeting_mode==='in_person'&&line==='Directions: Open map'?r.location.maps_url:r.meet_url;
   const linkedText=r.meeting_mode==='in_person'?'Open map':target;
   if(target && part.includes(linkedText)){
    const start=part.indexOf(linkedText),x=margin+font.widthOfTextAtSize(part.slice(0,start),size);
    const annotation=document.context.register(document.context.obj({Type:'Annot',Subtype:'Link',
     Rect:[x,y-2,x+font.widthOfTextAtSize(linkedText,size),y+size],Border:[0,0,0],
     A:{Type:'Action',S:'URI',URI:PDFString.of(target)}}));
    pageAnnotations.push(annotation);
    page.node.set(PDFName.of('Annots'),document.context.obj(pageAnnotations));
   }
  }
  y-=8;
 }
 const bytes=await document.save();
 return {bytes,filename:'appointment-'+r.request_id+'.pdf'};
}

/** Shared two-read PDF preparation. No receipt credential or write capability. */
export async function prepareVerifiedPDF({read,current,valid,prepared,brand,loadPDF,contacts=[]}){
 const before=await read(),facts=pdfFacts(before);
 if(before.appointment_state!=='confirmed' || !before.booking_revision || !before.meeting_mode)throw Error('receipt_changed');
 const file=prepared?.facts===facts?prepared:await buildAppointmentPDF(before,{brand,load:loadPDF,contacts});
 const after=await read();
 if(facts!==pdfFacts(after) || facts!==pdfFacts(current()||{}))throw Error('receipt_changed');
 if(!valid())throw Error('unavailable');
 return {file,facts};
}

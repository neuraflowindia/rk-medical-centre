import React, {useEffect, useId, useRef, useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {createUseBooking} from '../../appointment-system/browser/booking/index.mjs';
import {productState} from '../../appointment-system/browser/product-state.mjs';
import {dateRange, timeLabel, money} from '../../appointment-system/browser/display-formatting.mjs';
import {ReceiptFields, BookingDetailsFields, DateField, VerificationFields} from './shared-fields.jsx';
import './clinic-booking.css';
import {bookingBrowser} from './browser.mjs';
import {paymentAvailable} from '../../appointment-system/browser/booking/index.mjs';
import {clinicContacts} from './clinic-contacts.mjs';
const useBooking = createUseBooking(React, bookingBrowser);
const serviceFor = doctor => ['sanjay','parul'].includes(doctor)?'dr-'+doctor+'-gupta':'';
function ClinicContact({service,bookingHelp=false}){
  const selected=clinicContacts.find(item=>item.service===service);
  return <p>{bookingHelp?'Call the clinic: ':'For cancellations or changes, contact the clinic: '}{(selected?[selected]:clinicContacts).map((item,index)=><React.Fragment key={item.service}>{index>0?' · ':''}<a href={'tel:'+item.phone}>{item.label}: {item.display}</a></React.Fragment>)}</p>;
}

function Booking({draft={}}){
  const initialService=useRef(serviceFor(draft.doctor));
  const flow=useBooking(initialService.current),{state:s,dispatch}=flow,id=useId();
  const product=useSyncExternalStore(productState.subscribe,productState.getSnapshot,productState.getServerSnapshot);
  useEffect(()=>{
    for(const [name,value] of Object.entries({full_name:draft.name||'',phone:draft.phone||'',email:draft.email||'',notes:draft.message||'',
      country:draft.phone?.trim().startsWith('+')?'other':'91'}))dispatch({type:'details',name,value});
  },[]);
  const canEdit=!s.busy&&!s.credential&&s.phase!=='blocked'&&flow.available;
  const edit=(name,value)=>{
    if(!canEdit)return;
    if(name==='service'&&s.policy?.policy.services.some(item=>item.id===value&&item.enabled)){
      const doctor=['sanjay','parul'].find(item=>serviceFor(item)===value);if(doctor)draft.doctor=doctor;
    }
    dispatch({type:'edit',name,value});
  };
  const detail=(name,value)=>{
    if(!canEdit)return;
    const key={full_name:'name',phone:'phone',email:'email',notes:'message'}[name];if(key)draft[key]=value;
    dispatch({type:'details',name,value});
  };
  const p=s.policy?.policy,service=p?.services.find(item=>item.id===s.service);
  const disabled=s.busy||!flow.available||!!s.credential;
  if(!flow.viewAvailable)return <div className="clinic-booking-unavailable" role="status">
    <h2>{product.checking?'Checking appointment booking…':'Online booking is currently unavailable'}</h2>
    <p>You can call the clinic to arrange your visit.</p>
    <ClinicContact service={s.service||serviceFor(draft.doctor)} bookingHelp/>
    <button className="text-link" onClick={()=>productState.refresh({force:true})} disabled={product.checking}>Check again</button>
  </div>;
  const range=s.policy?dateRange(s.policy):null;
  const validPolicy=p?.version===2 && p.meeting==='in_person' && p.display_duration===false;
  const methodAvailable=validPolicy&&paymentAvailable(s.policy,s.payment_method);
  const ready=flow.available&&validPolicy&&s.policyFresh&&s.slotsFresh&&s.slot&&s.quote&&methodAvailable&&s.ack&&!s.busy;
  const selectedDay=validPolicy&&s.day?new Intl.DateTimeFormat('en-IN',{timeZone:p.timezone,dateStyle:'medium'}).format(new Date(s.day+'T12:00:00Z')):'';
  const selectedPayment=s.payment_method==='at_clinic'?'Pay at the clinic':s.payment_method==='online'?'Pay online':'';
  const fields=[['full_name','Full name','text','name',true,100],['phone','Phone number','tel','tel-national',p?.required_contacts.includes('phone')??true,32],
    ['email','Email address','email','email',p?.required_contacts.includes('email')??false,254]];
  return <div className="clinic-booking">
    {s.error&&<p className="booking-error" role="alert">{s.error}</p>}
    {s.receipt?<><ReceiptFields flow={flow}/><div className="booking-actions">
      <button className="button secondary" onClick={flow.check} disabled={s.busy||!flow.available}>Refresh details</button>
      {s.receipt.next_actions.includes('resume_payment')&&<button className="button" disabled={s.busy||!flow.available} onClick={flow.resume}>Continue payment</button>}
      {s.receipt.next_actions.includes('check_payment')&&!s.receipt.next_actions.includes('resume_payment')&&<button className="button secondary" disabled={s.busy||!flow.available} onClick={flow.resume}>Check payment status</button>}
      {s.receipt.next_actions.includes('choose_new_time')&&<button className="text-link" disabled={s.busy||!flow.available} onClick={flow.restart}>Book another appointment</button>}
    </div><ClinicContact service={clinicContacts.find(item=>item.service===s.receipt.resource_id||item.label===s.receipt.resource_name)?.service}/><p>Booking another appointment does not change this one.</p></>:
    s.credential?<div role="status"><h2>Checking your booking</h2><p>We are checking the same request, so it cannot be booked twice.</p>
      <button className="button" disabled={s.busy||!flow.available} onClick={flow.check}>Check my booking</button>
      {flow.canRetryOriginal&&<button className="button secondary" disabled={s.busy||!flow.available} onClick={flow.retryOriginal}>Retry the same request</button>}</div>:
    <form className="booking-form" aria-label="Book an appointment" onSubmit={event=>{event.preventDefault();if(ready)void flow.start();}}>
      <section className="booking-stage booking-stage-time" aria-labelledby={id+'time-heading'}>
      <div className="form-heading booking-stage-heading"><span className="mini-number" aria-hidden="true">1</span><div><h2 id={id+'time-heading'}>Your doctor and starting time</h2><p>Choose your doctor, a date and an available starting time.</p></div></div>
      {s.loadingPolicy&&<p role="status">Checking the doctors’ schedules…</p>}
      {!s.loadingPolicy&&!validPolicy&&<p role="alert">We could not load the clinic’s appointment options. Please try again.</p>}
      {!s.policyFresh&&<button type="button" className="text-link" disabled={!flow.available||s.loadingPolicy} onClick={flow.loadPolicy}>Reload appointment options</button>}
      <fieldset disabled={disabled||!validPolicy||!s.policyFresh} className="doctor-choices"><legend>Choose your doctor</legend>
        {(validPolicy?p.services.filter(item=>item.enabled):[]).map(item=><label key={item.id} className={s.service===item.id?'selected':''}>
          <input type="radio" name={id+'doctor'} value={item.id} checked={s.service===item.id} onChange={()=>edit('service',item.id)}/>
          <span><strong>{item.name}</strong><small>{money(item.pricing.amount_paise)} · At the clinic</small></span></label>)}
      </fieldset>
      <DateField label="Appointment date" value={s.day} required min={range?.first_date} max={range?.last_date}
        available={flow.available} disabled={disabled||!validPolicy||!s.policyFresh} onChange={value=>edit('day',value)} theme="rk-date"/>
      <fieldset disabled={disabled||!s.slotsFresh} className="slot-choices"><legend>Available starting times</legend>
        {s.slotsStatus==='loading'&&<p role="status">Checking available times…</p>}
        {s.slotsStatus==='ready'&&s.slots.length===0&&<p>No appointments are available on this date. Please choose another date.</p>}
        {s.slots.map(slot=><label key={slot.starts_at} className={s.slot?.starts_at===slot.starts_at?'selected':''}>
          <input type="radio" name={id+'time'} checked={s.slot?.starts_at===slot.starts_at} onChange={()=>edit('slot',slot)}/>
          <span>{timeLabel(slot.starts_at,p.timezone)}</span></label>)}
      </fieldset>
      {s.slotsStatus==='error'&&<button type="button" className="text-link" disabled={disabled||s.loadingPolicy} onClick={flow.loadPolicy}>Check available times again</button>}
      </section>
      <section className="booking-stage booking-stage-details" aria-labelledby={id+'details-heading'}>
      <div className="form-heading booking-stage-heading"><span className="mini-number" aria-hidden="true">2</span><div><h2 id={id+'details-heading'}>Your details</h2><p>Add the contact details the clinic needs for your visit.</p></div></div>
      <div className="field-pair">{fields.map(([name,label,type,auto,required,maxLength])=><label key={name} htmlFor={id+name}>
        {label} <span>({required?'required':'optional'})</span>
        <input id={id+name} type={type} autoComplete={auto} maxLength={maxLength} required={required}
          value={s.details[name]} disabled={disabled} onChange={event=>{detail(name,event.target.value);
            if(name==='phone')detail('country',event.target.value.trim().startsWith('+')?'other':'91');}}/>
      </label>)}</div>
      <p className="field-hint">For an Indian number, enter 10 digits. For another country, include + and the country code. Your email is only needed if you would like an email copy.</p>
      <label htmlFor={id+'notes'}>Anything you would like the doctor to know? <span>(optional)</span>
        <textarea id={id+'notes'} maxLength={2000} rows={3} value={s.details.notes} disabled={disabled} onChange={event=>detail('notes',event.target.value)}/></label>
      <VerificationFields flow={flow}/>
      </section>
      <section className="booking-stage booking-stage-payment" aria-labelledby={id+'payment-heading'}>
      <div className="form-heading booking-stage-heading"><span className="mini-number" aria-hidden="true">3</span><div><h2 id={id+'payment-heading'}>Check your visit and payment</h2><p>Review your choices and select an available payment option.</p></div></div>
      <div className="appointment-summary" role="group" aria-labelledby={id+'summary-heading'}>
        <h3 id={id+'summary-heading'}>Your appointment choices</h3>
        <dl className="booking-selection">
          <div><dt>Doctor</dt><dd>{validPolicy&&service?service.name:'Choose your doctor'}</dd></div>
          <div><dt>Date</dt><dd>{selectedDay||'Choose a date'}</dd></div>
          <div><dt>Starting time</dt><dd>{validPolicy&&s.slot&&s.slotsFresh&&s.policyFresh?timeLabel(s.slot.starts_at,p.timezone):s.loadingPolicy||s.slotsStatus==='loading'?'Checking available times…':'Choose a starting time'}</dd></div>
          <div><dt>Consultation fee</dt><dd>{validPolicy&&s.quote&&s.policyFresh&&s.slotsFresh?money(s.quote.amount_paise):s.loadingPolicy||s.slotsStatus==='loading'?'Checking the fee…':'Shown with appointment options'}</dd></div>
          <div><dt>Payment</dt><dd>{selectedPayment?selectedPayment+(!s.policyFresh?' — checking availability':methodAvailable?'':' — currently unavailable'):'Choose a payment option'}</dd></div>
        </dl>
        {validPolicy&&<p className="booking-selection-location">{p.location.name} — {p.location.address}</p>}
        <p className="field-hint">These are your current choices. Your appointment has not been confirmed yet.</p>
      </div>
      <fieldset className="payment-choices" disabled={disabled||!validPolicy||!s.policyFresh}><legend>Payment option</legend>
        {(validPolicy?p.payment_methods:[]).map(method=><label key={method} className={`${s.payment_method===method?'selected':''} ${paymentAvailable(s.policy,method)?'':'payment-unavailable'}`}>
          <input type="radio" name={id+'payment'} disabled={!paymentAvailable(s.policy,method)} checked={s.payment_method===method} onChange={()=>edit('payment_method',method)}/>
          <span><strong>{method==='at_clinic'?'Pay at the clinic':'Pay online'}</strong><small>{!paymentAvailable(s.policy,method)?'Temporarily unavailable':method==='at_clinic'?'Reserve your visit now. Pay when you arrive.':'Continue to secure payment after checking your details.'}</small></span>
        </label>)}</fieldset>
      {s.payment_method&&!methodAvailable&&<p role="status" className="field-hint">This payment option is unavailable. Please choose another available option.</p>}
      <section className="booking-cancellation" aria-labelledby={id+'cancellation'}>
        <h3 id={id+'cancellation'}>If you need to change or cancel</h3>
        <ClinicContact service={s.service}/>
        {s.payment_method==='at_clinic'&&<p>You have chosen to pay at the clinic, so no online payment will be taken for this booking.</p>}
      </section>
      <label className="booking-ack"><input type="checkbox" checked={s.ack} disabled={disabled||!s.slot||!methodAvailable}
        onChange={event=>dispatch({type:'ack',value:event.target.checked})}/><span>I have checked my doctor, date, starting time and contact details.</span></label>
      <button type="submit" className="button" disabled={!ready}>{s.busy?'Saving your request…':s.payment_method==='at_clinic'?'Confirm appointment — pay at the clinic':s.payment_method==='online'?'Continue to payment':'Choose a payment option'} ↗</button>
      </section>
    </form>}
    <a className="text-link booking-find" data-booking-only href="/booking-details">Already booked? View your appointment ↗</a>
  </div>;
}
function mount(node,element,signal){
  if(!node||signal?.aborted)return ()=>{};
  const root=createRoot(node);root.render(element);let live=true;
  const stop=()=>{if(live){live=false;root.unmount();}};
  signal?.addEventListener('abort',stop,{once:true});return stop;
}
export const mountBooking=(node,{draft,signal}={})=>mount(node,<Booking draft={draft}/>,signal);
export const mountBookingDetails=(node,{signal}={})=>mount(node,<><BookingDetailsFields/><ClinicContact/></>,signal);

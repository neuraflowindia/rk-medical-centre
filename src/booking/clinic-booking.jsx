// The booking screens: the engine's three stages shown as three steps, then the appointment card.
// Every booking decision stays in the sealed package's coordinator (useBooking); this file only
// draws its state. Words and step rules live in booking-steps.mjs so they can be tested.
import React, {useEffect, useId, useRef, useState, useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {createUseBooking} from '../../appointment-system/browser/booking/index.mjs';
import {productState} from '../clinic/product-state.mjs';
import {dateRange} from '../../appointment-system/browser/display-formatting.mjs';
import {ReceiptFields, BookingDetailsFields, DateField, VerificationFields} from './shared-fields.jsx';
import './clinic-booking.css';
import {bookingBrowser} from './browser.mjs';
import {paymentAvailable} from '../../appointment-system/browser/booking/index.mjs';
import {bookingUnavailable} from '../site/pages/booking/booking.mjs';
import {archPortrait} from '../site/parts/photo-figure/photo-figure.mjs';
import {words, STEPS, DETAIL_FIELDS, keepTogether as kt, serviceFor, doctorFor, usablePolicy, doctorChoices, sittingHours, dayTiles, dayBeyondTiles, dayLong,
  slotGroups, waitsForAdmission, holdEdit, releaseEdits, screenFor, stepOneMissing, stepThreeMissing, askFor, mustChooseAgain, phoneCountry, detailProblems,
  paymentOrder, confirmLabel, confirmHint, visitSummary, barLines, paymentNote, contactRows, appointmentCard, calendarObject} from './booking-steps.mjs';

const useBooking = createUseBooking(React, bookingBrowser);
const classes = (...names) => names.filter(Boolean).join(' ');

function Icon({name}) {
  return <svg className="icon" aria-hidden="true" focusable="false"><use href={'#i-' + name}/></svg>;
}

/** Icon and words; `calm` is for news that is not a fault. */
function Notice({calm = false, icon, role = 'alert', children}) {
  return <div className={classes('booking-notice', calm && 'booking-notice--calm')} role={role}>
    <Icon name={icon || (calm ? 'info' : 'alert')}/>{children}
  </div>;
}

/** Said beside the thing that is still missing, after the step's main button was pressed too early. */
function Ask({children}) {
  return <p className="booking-ask" role="alert"><Icon name="info"/><span>{children}</span></p>;
}

/** "To change or cancel, call Dr. Sanjay Gupta: 94150 49410" (one doctor if known, otherwise both). */
function ClinicContact({service, bookingHelp = false}) {
  return <p className="booking-contact"><span className="booking-contact__lead">{bookingHelp ? words.contact.help : words.contact.change}</span>
    {contactRows(service).map(row => <a key={row.id} className="booking-contact__link" href={row.href} aria-label={row.spoken}><Icon name="phone"/><span>{kt(row.name)}: {kt(row.digits)}</span></a>)}</p>;
}

/**
 * An action that needs the engine's admission (the last press, a re-check) is kept for the moment
 * the five-second booking-state check is running, then handed over; the engine itself still
 * refuses anything it may not admit. `waiting` is true while one is being kept.
 */
function useHeldAction(available, viewAvailable) {
  const kept = useRef(null), [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!viewAvailable) { kept.current = null; setWaiting(false); return; }
    if (available && kept.current) { const run = kept.current; kept.current = null; setWaiting(false); run(); }
  }, [available, viewAvailable]);
  const act = run => {
    if (available) { run(); return; }
    kept.current = run; setWaiting(true);
  };
  return [act, waiting];
}

function Progress({step}) {
  const current = STEPS.find(item => item.id === step);
  return <>
    <ol className="booking-progress" aria-label={words.progressLabel}>
      {STEPS.map(item => {
        const state = item.id === step ? 'current' : item.id < step ? 'done' : 'ahead';
        return <li key={item.id} className={'booking-progress__step is-' + state} aria-current={state === 'current' ? 'step' : undefined}>
          <span className="booking-progress__mark">{state === 'done' ? <Icon name="check"/> : item.id}</span>
          <span className="booking-progress__label">{item.label}</span>
        </li>;
      })}
    </ol>
    <p className="booking-progress__count" aria-hidden="true">{words.stepCount(step, STEPS.length, current.label)}</p>
  </>;
}

/** "Your visit": who, when, how much, where. The same card serves the side column and step 3. */
function VisitSummary({summary, id, onChange, aside = false}) {
  // A fact not chosen yet is a dash for the eye and words for a screen reader.
  const empty = <dd className="is-empty"><span aria-hidden="true">—</span><span className="visually-hidden">{words.summary.empty}</span></dd>;
  const value = (text, waiting = false) => text ? <dd>{kt(text)}</dd> : waiting ? <dd className="is-empty">{words.summary.checking}</dd> : empty;
  return <section className="visit-summary" aria-labelledby={id}>
    {aside && <img className="visit-summary__object" src={calendarObject.src} width={calendarObject.width} height={calendarObject.height} alt="" loading="lazy" decoding="async"/>}
    <div className="visit-summary__head"><h3 className="visit-summary__title" id={id}>{words.summary.title}</h3>
      {aside ? <p className="tag tag--plain">{words.summary.pending}</p>
        : onChange && <button type="button" className="text-link visit-summary__change" onClick={onChange}><Icon name="edit"/><span>{words.change}</span></button>}</div>
    <div className="visit-summary__doctor">
      {summary.doctor?.avatar
        ? <img className="visit-summary__face" src={summary.doctor.avatar.src} width={summary.doctor.avatar.width} height={summary.doctor.avatar.height} alt="" decoding="async"/>
        : <span className="visit-summary__face visit-summary__face--empty" aria-hidden="true"><Icon name="person"/></span>}
      <div>{summary.doctor
        ? <><p className="visit-summary__name">{kt(summary.doctor.name)}</p><p className="visit-summary__role">{summary.doctor.role}</p></>
        : <p className="visit-summary__role">{words.missing.doctor}</p>}</div>
    </div>
    <div className="visit-summary__tear" aria-hidden="true"/>
    <dl className="visit-summary__facts">
      <div><dt>{words.summary.day}</dt>{value(summary.day)}</div>
      <div><dt>{words.summary.time}</dt>{value(summary.time, summary.waiting)}</div>
      <div><dt>{words.summary.fee}</dt>{summary.fee
        ? <dd>{summary.fee}{summary.payment && <span className="visit-summary__pay"> · {summary.payment}</span>}</dd>
        : empty}</div>
      {summary.place && <div><dt>{words.summary.place}</dt><dd>{kt(summary.place.name)}
        <small className="visit-summary__address">{kt(summary.place.address)}</small><small className="visit-summary__area">{summary.place.short}</small></dd></div>}
    </dl>
    {aside && onChange && <button type="button" className="text-link visit-summary__change" onClick={onChange}><Icon name="edit"/><span>{words.summary.change}</span></button>}
  </section>;
}

/** One labelled box of step 2, with its help and, after "Continue", what is wrong with it. */
function Field({id, label, optional = false, hint, error, children}) {
  return <div className="booking-field">
    <label className="booking-field__label" htmlFor={id}>{label}{optional && <span className="booking-field__optional"> ({words.details.optional})</span>}</label>
    {children}
    {error
      ? <p className="booking-field__error" id={id + '-error'}><Icon name="alert"/><span>{error}</span></p>
      : hint && <p className="booking-field__hint" id={id + '-hint'}>{hint}</p>}
  </div>;
}

/** The appointment card: the engine's receipt, as something to keep. */
function AppointmentCard({receipt, titleRef, id}) {
  const card = appointmentCard(receipt);
  return <article className={classes('appointment-card', 'appointment-card--' + card.state)} aria-labelledby={id}>
    <div className="appointment-card__head">
      {card.tag && <p className="tag appointment-card__tag">{card.state === 'confirmed' && <Icon name="check"/>}{card.tag}</p>}
      <h2 className="appointment-card__title" id={id} ref={titleRef} tabIndex={-1}>{card.title}</h2>
    </div>
    <div className="appointment-card__who">
      {card.doctor.portrait && <div className="appointment-card__portrait" dangerouslySetInnerHTML={{__html: archPortrait(card.doctor.portrait, {sizes: '96px', alt: '', eager: true})}}/>}
      <div>
        <p className="appointment-card__name">{kt(card.doctor.name)}</p>
        {card.doctor.role && <p className="appointment-card__role">{card.doctor.role}</p>}
      </div>
    </div>
    <p className="appointment-card__when"><time dateTime={card.instant} className="appointment-card__day">{card.day}</time>
      <span className="appointment-card__time">{kt(card.time)}</span></p>
    <div className="appointment-card__tear" aria-hidden="true"/>
    <div className="appointment-card__foot">
      {card.place && <p className="appointment-card__place"><Icon name="pin"/><span><strong>{kt(card.place.name)}</strong>{card.place.address}
        <a className="appointment-card__directions" href={card.place.maps} target="_blank" rel="noopener noreferrer">{words.receipt.directions}<Icon name="out"/><span className="visually-hidden"> {words.receipt.opensMaps}</span></a></span></p>}
      {card.pay && <p className="appointment-card__line"><Icon name="banknote"/><strong>{card.pay}</strong></p>}
      {card.bring && <p className="appointment-card__line"><Icon name="file"/><span>{card.bring}</span></p>}
    </div>
  </article>;
}

function Booking({draft = {}}) {
  const initialService = useRef(serviceFor(draft.doctor));
  const flow = useBooking(initialService.current), {state: s, dispatch} = flow, id = useId();
  const product = useSyncExternalStore(productState.subscribe, productState.getSnapshot, productState.getServerSnapshot);
  const [step, setStep] = useState(1);
  // The engine starts with its first doctor; the page waits for the visitor's own choice unless they came for one.
  const [chosen, setChosen] = useState(!!initialService.current);
  const [changing, setChanging] = useState(false);
  const [later, setLater] = useState(false);
  const [held, setHeld] = useState(null);
  const [problems, setProblems] = useState({});
  const [record, setRecord] = useState(false);
  const [gone, setGone] = useState(false);
  // The part of the step the visitor was shown after pressing the main button too early ("" = none).
  const [asked, setAsked] = useState('');
  const root = useRef(null), title = useRef(null), laterBox = useRef(null), first = useRef(true), fieldNodes = useRef({}), parts = useRef({});
  const [act, waiting] = useHeldAction(flow.available, flow.viewAvailable);

  useEffect(() => {
    for (const [name, value] of Object.entries({full_name: draft.name || '', phone: draft.phone || '', email: draft.email || '', notes: draft.message || '',
      country: phoneCountry(draft.phone)})) dispatch({type: 'details', name, value});
  }, []);

  const p = s.policy?.policy, usable = usablePolicy(s.policy);
  // Draft controls follow `viewAvailable`: the form stays usable through the engine's five-second
  // booking-state checks. Only actions that book, pay or re-read need its admission (`available`).
  const canEdit = !s.busy && !s.credential && s.phase !== 'blocked' && flow.viewAvailable;
  const disabled = s.busy || !flow.viewAvailable || !!s.credential;
  const screen = screenFor({viewAvailable: flow.viewAvailable, state: s});

  // A change of doctor or day made during a state check waits until the engine can read that day's times.
  useEffect(() => {
    if (!held || !flow.available || !s.policy) return;
    for (const [name, value] of releaseEdits(held)) dispatch({type: 'edit', name, value});
    setHeld(null);
  }, [held, flow.available, s.policy]);
  useEffect(() => { if (!flow.viewAvailable) setHeld(null); }, [flow.viewAvailable]);

  const edit = (name, value) => {
    if (!canEdit) return;
    if (name === 'service') {
      if (!p?.services.some(item => item.id === value && item.enabled)) return;
      const doctor = doctorFor(value); if (doctor) draft.doctor = doctor;
    }
    setGone(false);
    if (waitsForAdmission(name) && (!flow.available || held)) { setHeld(current => holdEdit(current, name, value)); return; }
    dispatch({type: 'edit', name, value});
  };
  const detail = (name, value) => {
    if (!canEdit) return;
    const key = {full_name: 'name', phone: 'phone', email: 'email', notes: 'message'}[name]; if (key) draft[key] = value;
    dispatch({type: 'details', name, value});
    if (problems[name]) setProblems(({[name]: _, ...rest}) => rest);
  };

  const shown = {service: held?.service ?? s.service, day: held?.day ?? s.day};
  const hours = sittingHours(s.policy, shown.service);
  const range = s.policy ? dateRange(s.policy) : null;
  const choices = doctorChoices(s.policy);
  const tiles = usable && range ? dayTiles({first: range.first_date, last: range.last_date, hours}) : [];
  const laterOpen = later || dayBeyondTiles(tiles, shown.day);
  const groups = usable ? slotGroups(s.slots, {timezone: p.timezone, hours, day: shown.day}) : [];
  const methodAvailable = usable && paymentAvailable(s.policy, s.payment_method);
  const summary = visitSummary({state: s, usable, chosen, shown: held || {}, methodAvailable});
  const missing = stepOneMissing({chosen, held, state: s, usable});
  // What the last press needs. Admission is not part of it: a press during a state check is kept (useHeldAction).
  const missingLast = stepThreeMissing({usable, state: s, methodAvailable, held});
  const ready = !missingLast && !s.busy;
  const readyNow = useRef(ready); readyNow.current = ready;
  const timesShown = s.slotsStatus === 'ready' && s.slots.length > 0 && !held;
  const ask = askFor({step, missing: step === 1 ? missing : step === 3 ? missingLast : '', timesShown});
  // Once the missing thing is there (or the step has moved on), nothing is pointed at any more.
  useEffect(() => { if (asked && asked !== ask) setAsked(''); }, [asked, ask]);

  // The chosen time has gone (someone else took it, or the day's times changed): back to step 1 to choose again.
  useEffect(() => {
    if (screen === 'form' && !held && mustChooseAgain({step, state: s, usable})) { setGone(!s.error); setStep(1); }
  }, [screen, step, s.slot, s.slotsStatus, s.policyFresh, usable, held]);
  useEffect(() => { if (s.slot) setGone(false); }, [s.slot]);

  // A new step (or the card after the last press) starts at its heading.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    title.current?.focus({preventScroll: true});
    root.current?.scrollIntoView({block: 'start'});
  }, [step, screen === 'receipt', screen === 'checking']);

  const go = next => { setProblems({}); setStep(next); };
  const chooseDoctor = service => { setChosen(true); setChanging(false); edit('service', service); };
  const openLater = () => {
    if (laterOpen) { if (!dayBeyondTiles(tiles, shown.day)) setLater(false); return; }
    setLater(true);
    // Show the package's date box and open its calendar in the same press. The box is brought to the
    // top of the screen first, so the calendar opens below it instead of over the header.
    requestAnimationFrame(() => {
      const box = laterBox.current; if (!box) return;
      if (window.innerHeight - box.getBoundingClientRect().bottom < 440) box.scrollIntoView({block: 'start', behavior: 'instant'});
      box.querySelector('.abs-date-group button')?.click();
    });
  };
  // The main button is never a dead press: pressed too early, it shows the visitor what is still missing.
  const pointTo = what => {
    if (!what) return;
    setAsked(what);
    requestAnimationFrame(() => {
      const node = parts.current[what]; if (!node) return;
      node.scrollIntoView({block: what === 'tick' ? 'nearest' : 'center'});
      node.querySelector('input:not(:disabled), button:not(:disabled)')?.focus({preventScroll: true});
    });
  };
  const advance = () => {
    if (step === 1) { if (missing) pointTo(ask); else go(2); return; }
    if (step === 2) {
      const found = detailProblems(s.details, {requiredContacts: p?.required_contacts});
      setProblems(found);
      const wrong = DETAIL_FIELDS.find(name => found[name]);
      if (wrong) { fieldNodes.current[wrong]?.focus(); return; }
      go(3); return;
    }
    if (s.busy || waiting) return;
    if (missingLast) { pointTo(ask); return; }
    act(() => { if (readyNow.current) void flow.start(); });
  };

  if (screen === 'unavailable') {
    // Booking stopped while someone was here: the same panel as the page's own, with the clinic's numbers.
    return <div className="clinic-booking clinic-booking--paused" onClick={event => { if (event.target.closest('[data-booking-retry]')) void productState.refresh({force: true}); }}
      dangerouslySetInnerHTML={{__html: bookingUnavailable({state: product.checking ? 'checking' : 'unavailable', doctor: doctorFor(shown.service) || draft.doctor || '', kept: true})}}/>;
  }

  const error = s.error && <Notice><p>{s.error}</p></Notice>;

  if (screen === 'receipt') {
    const r = s.receipt, service = serviceFor(doctorFor(r.resource_id));
    const busy = s.busy || waiting;
    return <div className="clinic-booking clinic-booking--receipt" ref={root}>
      <div className="booking-receipt">
        {error}
        <div className="appointment-ticket">
          <img className="appointment-ticket__object" src={calendarObject.src} width={calendarObject.width} height={calendarObject.height} alt="" decoding="async"/>
          <AppointmentCard receipt={r} titleRef={title} id={id + 'card'}/>
          <div className="appointment-card__tear" aria-hidden="true"/>
          <div className={classes('booking-record', record && 'is-open')} id={id + 'record'}>
            <ReceiptFields flow={flow} showTitle={false}/>
            <button type="button" className="text-link booking-record__toggle" aria-expanded={record} aria-controls={id + 'record'} onClick={() => setRecord(open => !open)}>
              <span>{record ? words.receipt.record.hide : words.receipt.record.show}</span><Icon name="down"/></button>
          </div>
        </div>
        <div className="booking-receipt__more">
          {r.next_actions.includes('resume_payment') && <button type="button" className="button button--main" disabled={busy} onClick={() => act(flow.resume)}><span className="button__label">{words.receipt.resume}</span></button>}
          {r.next_actions.includes('check_payment') && !r.next_actions.includes('resume_payment') && <button type="button" className="button button--second" disabled={busy} onClick={() => act(flow.resume)}><span className="button__label">{words.receipt.checkPayment}</span></button>}
          <button type="button" className="text-link" disabled={busy} onClick={() => act(flow.check)}><span>{words.receipt.refresh}</span></button>
          {r.next_actions.includes('choose_new_time') && <button type="button" className="text-link" disabled={busy} onClick={() => act(flow.restart)}><span>{words.receipt.another}</span><Icon name="arrow"/></button>}
        </div>
        <div className="booking-receipt__notes">
          <ClinicContact service={service}/>
          {r.next_actions.includes('choose_new_time') && <p className="booking-contact">{words.receipt.anotherNote}</p>}
        </div>
      </div>
    </div>;
  }

  if (screen === 'checking' || screen === 'blocked') {
    return <div className="clinic-booking clinic-booking--waiting" ref={root}>
      {screen === 'checking'
        ? <div className="booking-panel" role="status">
          <h2 className="clinic-booking__title" ref={title} tabIndex={-1}>{words.checking.title}</h2>
          <p>{words.checking.text}</p>
          {error}
          <div className="booking-panel__actions">
            <button type="button" className="button button--main" disabled={s.busy || waiting} onClick={() => act(flow.check)}><span className="button__label">{words.checking.check}</span></button>
            {flow.canRetryOriginal && <button type="button" className="button button--second" disabled={s.busy || waiting} onClick={() => act(flow.retryOriginal)}><span className="button__label">{words.checking.retry}</span></button>}
          </div>
          <ClinicContact service={s.service} bookingHelp/>
        </div>
        // The saved booking in this browser cannot be read: the engine's sentence and the numbers; no form that cannot work.
        : <div className="booking-panel">{error}<ClinicContact bookingHelp/></div>}
    </div>;
  }

  const stepInfo = STEPS.find(item => item.id === step);
  const lines = barLines(summary, missing);
  const sending = s.busy || waiting;
  const optionsStale = !usable || !s.policyFresh;
  const timesWaiting = !!held || s.slotsStatus === 'loading';
  const noTimes = !timesWaiting && s.slotsStatus === 'ready' && s.slots.length === 0;
  const methods = usable ? paymentOrder(p.payment_methods, method => paymentAvailable(s.policy, method)) : [];
  // The tick box waits for the payment option (choosing one clears the tick in the engine); pressed before that, it points there.
  const tickWaits = missingLast === 'payment' || missingLast === 'checking';
  // Flat until the step is complete, but never dead: a press shows what is missing (advance).
  const notReady = step === 1 ? !!missing : step === 3 ? !!missingLast && !sending : false;
  const fields = [
    ['full_name', words.details.name, 'text', 'name', true, 100, words.details.someoneElse],
    ['phone', words.details.phone, 'tel', 'tel-national', p?.required_contacts.includes('phone') ?? true, 32, words.details.phoneHint],
    ['email', words.details.email, 'email', 'email', p?.required_contacts.includes('email') ?? false, 254, words.details.emailHint]
  ];

  return <div className="clinic-booking clinic-booking--steps" ref={root} data-step={step}>
    <div className="clinic-booking__main">
      <Progress step={step}/>
      {error}
      {gone && !s.error && <Notice icon="clock"><p>{words.time.gone}</p></Notice>}
      <form className="booking-form" aria-label={words.formLabel} noValidate onSubmit={event => { event.preventDefault(); advance(); }}>
        <section className={'clinic-booking__step clinic-booking__step--' + step} aria-labelledby={id + 'step'}>
          <h2 className="clinic-booking__title" id={id + 'step'} ref={title} tabIndex={-1}>{stepInfo.title}</h2>

          {step === 1 && <>
            {s.loadingPolicy && !usable && <p className="booking-wait" role="status">{words.options.checking}</p>}
            {!s.loadingPolicy && !usable && <Notice><p>{words.options.failed}</p><ClinicContact bookingHelp/></Notice>}
            {!s.policyFresh && !s.loadingPolicy && <button type="button" className="button button--second" disabled={waiting} onClick={() => act(flow.loadPolicy)}><span className="button__label">{words.options.retry}</span></button>}
            {usable && <fieldset className={classes('doctor-choices', chosen && !changing && 'is-folded', asked === 'doctor' && 'is-asked')} disabled={disabled || optionsStale}
              ref={node => { parts.current.doctor = node; }}>
              <legend>{words.doctor.legend}</legend>
              <button type="button" className="text-link doctor-choices__change" onClick={() => setChanging(true)}><span>{words.change}</span></button>
              <div className="doctor-choices__list">
                {choices.map(item => {
                  const selected = chosen && shown.service === item.service;
                  return <label key={item.service} className={classes('doctor-choice', 'doctor-choice--' + item.tone, selected && 'selected')} data-booking-doctor={item.id || item.service}>
                    <input type="radio" className="visually-hidden" name={id + 'doctor'} value={item.service} checked={selected} onChange={() => chooseDoctor(item.service)}
                      onClick={() => { if (selected) setChanging(false); }}/>
                    <span className="doctor-choice__card">
                      {item.avatar ? <img className="doctor-choice__face" src={item.avatar.src} width={item.avatar.width} height={item.avatar.height} alt="" decoding="async"/> : <span/>}
                      <span className="doctor-choice__who"><span className="doctor-choice__name">{kt(item.name)}</span>{item.role && <span className="doctor-choice__role">{item.role}</span>}</span>
                      <span className="doctor-choice__tick" aria-hidden="true"><Icon name="check"/></span>
                    </span>
                  </label>;
                })}
              </div>
              {!chosen && <p className="doctor-choices__more"><span>{words.doctor.unsure}</span>
                <a className="text-link" href={words.doctor.meetPath}><span>{words.doctor.meet}</span><Icon name="arrow"/></a></p>}
            </fieldset>}
            {usable && !chosen && <p className={classes('booking-prompt', asked === 'doctor' && 'is-asked')} role={asked === 'doctor' ? 'alert' : undefined}>{words.doctor.prompt}</p>}

            {usable && chosen && <fieldset className={classes('booking-days', asked === 'day' && 'is-asked')} disabled={disabled || optionsStale} ref={node => { parts.current.day = node; }}>
              <legend>{words.day.legend}</legend>
              {asked === 'day' && <Ask>{words.ask.day}</Ask>}
              <div className="booking-days__row">
                {tiles.map(tile => <button type="button" key={tile.iso} className="day-tile" data-booking-day={tile.iso} aria-pressed={shown.day === tile.iso} disabled={!tile.available}
                  aria-label={tile.spoken + (tile.available ? '' : ', ' + words.day.notOffered)} onClick={() => edit('day', tile.iso)}>
                  <span className="day-tile__label">{tile.label}</span><span className="day-tile__number">{tile.number}</span><span className="day-tile__month">{tile.month}</span>
                </button>)}
                <button type="button" className="day-tile day-tile--later" data-booking-other-date aria-expanded={laterOpen} aria-controls={id + 'later'} onClick={openLater}>
                  <Icon name="calendar"/><span>{words.day.later}</span></button>
              </div>
              <div className="booking-days__later" id={id + 'later'} ref={laterBox} hidden={!laterOpen}>
                <DateField label={words.day.dateField} value={shown.day} required min={range?.first_date} max={range?.last_date}
                  available={flow.viewAvailable} disabled={disabled || optionsStale} onChange={value => edit('day', value)} theme="rk-date"/>
              </div>
            </fieldset>}

            {usable && chosen && <fieldset className={classes('slot-choices', asked === 'time' && 'is-asked')} disabled={disabled || !s.slotsFresh || !!held} ref={node => { parts.current.time = node; }}>
              <legend>{words.time.legend}</legend>
              {asked === 'time' && <Ask>{words.ask.time}</Ask>}
              {timesWaiting && <div className="slot-group"><p className="booking-wait" role="status">{words.time.checking}</p>
                <div className="slot-group__pills" aria-hidden="true"><span className="time-pill__ghost"/><span className="time-pill__ghost"/><span className="time-pill__ghost"/></div></div>}
              {noTimes && <Notice calm role="status"><p>{words.time.noneLeft(dayLong(shown.day))}</p><ClinicContact service={shown.service} bookingHelp/></Notice>}
              {!timesWaiting && !noTimes && s.slotsStatus !== 'error' && <div className="slot-choices__groups">
                {groups.map(group => <div className="slot-group" key={group.id} role="group" aria-labelledby={id + group.id}>
                  <p className="slot-group__label" id={id + group.id}>{group.label}</p>
                  {group.slots.length
                    ? <div className="slot-group__pills">{group.slots.map(slot => {
                      const selected = s.slot?.starts_at === slot.starts_at;
                      return <label key={slot.starts_at} className={classes('time-pill', selected && 'selected')} data-booking-time={slot.starts_at}>
                        <input type="radio" className="visually-hidden" name={id + 'time'} checked={selected} onChange={() => edit('slot', slot)}/>
                        <span className="time-pill__face">{kt(slot.label)}</span></label>;
                    })}</div>
                    : <p className="slot-group__none">{group.none}</p>}
                </div>)}
              </div>}
            </fieldset>}
            {usable && chosen && s.slotsStatus === 'error' && !held && <button type="button" className="button button--second" disabled={disabled || s.loadingPolicy || waiting}
              onClick={() => act(flow.loadPolicy)}><span className="button__label">{words.time.retry}</span></button>}
          </>}

          {step === 2 && <div className="booking-fields">
            {Object.keys(problems).length > 0 && <Notice><p>{words.errors.summary}</p></Notice>}
            {fields.map(([name, label, type, auto, required, maxLength, hint]) => <Field key={name} id={id + name} label={label} optional={!required} hint={hint} error={problems[name]}>
              <input className="booking-input" id={id + name} ref={node => { fieldNodes.current[name] = node; }} type={type} autoComplete={auto} maxLength={maxLength} required={required}
                inputMode={name === 'phone' ? 'tel' : undefined} aria-invalid={problems[name] ? 'true' : undefined} aria-describedby={id + name + (problems[name] ? '-error' : '-hint')}
                value={s.details[name]} disabled={disabled} onChange={event => { detail(name, event.target.value);
                  if (name === 'phone') detail('country', phoneCountry(event.target.value)); }}/>
            </Field>)}
            <VerificationFields flow={flow} className="booking-verify" inputClassName="booking-input" buttonClassName="button button--second"/>
            <Field id={id + 'notes'} label={words.details.notes} optional>
              <textarea className="booking-input booking-input--area" id={id + 'notes'} maxLength={2000} rows={3} value={s.details.notes} disabled={disabled}
                onChange={event => detail('notes', event.target.value)}/>
            </Field>
          </div>}

          {step === 3 && <>
            <VisitSummary summary={summary} id={id + 'visit-step'} onChange={() => go(1)}/>
            <fieldset className={classes('payment-choices', asked === 'payment' && 'is-asked')} disabled={disabled || optionsStale} ref={node => { parts.current.payment = node; }}>
              <legend>{words.payment.legend}</legend>
              {asked === 'payment' && <Ask>{words.ask.payment}</Ask>}
              <div className="payment-choices__list">
                {methods.map(method => {
                  const available = paymentAvailable(s.policy, method), selected = s.payment_method === method;
                  return <label key={method} className={classes('payment-choice', selected && 'selected', !available && 'payment-unavailable')} data-booking-payment={method}>
                    <input type="radio" className="visually-hidden" name={id + 'payment'} disabled={!available} checked={selected} onChange={() => edit('payment_method', method)}/>
                    <span className="payment-choice__card"><span className="payment-choice__dot" aria-hidden="true"><Icon name="check"/></span>
                      <span className="payment-choice__words"><span className="payment-choice__name">{words.payment[method]}</span>
                        <span className="payment-choice__note">{paymentNote(method, {available, fee: summary.fee})}</span></span></span>
                  </label>;
                })}
              </div>
            </fieldset>
            {s.payment_method && !methodAvailable && <p role="status" className="booking-pay-note">{words.payment.chosenUnavailable}</p>}
            <p className="booking-pay-note">{words.payment.later}</p>
          </>}
        </section>

        <div className={classes('booking-bar', step === 3 && 'booking-bar--last')}>
          {/* The last two presses stay together and in sight: the tick box and what it confirms, then the button. */}
          {step === 3 && <div className={classes('booking-last', asked === 'tick' && 'is-asked')} ref={node => { parts.current.tick = node; }}>
            <label className={classes('booking-ack', tickWaits && 'is-waiting')}>
              <input type="checkbox" checked={s.ack} disabled={disabled} aria-disabled={tickWaits || undefined} aria-describedby={id + 'last'}
                onChange={event => { if (tickWaits) pointTo(ask); else dispatch({type: 'ack', value: event.target.checked}); }}/>
              <span className="booking-ack__box" aria-hidden="true"><Icon name="check"/></span><span className="booking-ack__words">{words.confirm.ack}</span></label>
            <p className="booking-confirm-hint" id={id + 'last'} role="status">{confirmHint({missing: missingLast})}</p>
          </div>}
          {step === 1 && <p className="booking-bar__summary"><span className="booking-bar__top">{kt(lines.top)}</span>{lines.bottom && <span className="booking-bar__bottom">{kt(lines.bottom)}</span>}</p>}
          {step === 1 && missing && <p className="booking-bar__hint" aria-hidden="true">{words.missing[missing]}</p>}
          {step === 2 && <button type="button" className="booking-bar__summary" onClick={() => go(1)} aria-label={`${words.summary.change}: ${lines.top}, ${lines.bottom}`}>
            <span className="booking-bar__top">{kt(lines.top)}</span><span className="booking-bar__bottom">{kt(lines.bottom)}</span><Icon name="edit"/></button>}
          {step > 1 && <button type="button" className={classes('text-link booking-bar__back', step === 2 && 'booking-bar__back--laptop')} disabled={sending} onClick={() => go(step - 1)}><span>{words.back}</span></button>}
          <button type="submit" className={classes('button button--main button--large booking-bar__main', notReady && 'is-not-ready', step === 3 && sending && 'is-busy')} data-booking-continue
            disabled={step === 2 && disabled} aria-busy={step === 3 && sending ? 'true' : undefined} aria-describedby={step === 3 ? id + 'last' : undefined}>
            <span className="button__label">{step === 3 ? confirmLabel({busy: sending, method: methodAvailable ? s.payment_method : '', offered: methods.filter(method => paymentAvailable(s.policy, method))}) : words.next}</span>
            {step < 3 && <Icon name="arrow"/>}
          </button>
        </div>
      </form>
    </div>
    <aside className="clinic-booking__aside"><VisitSummary summary={summary} id={id + 'visit'} onChange={step > 1 ? () => go(1) : null} aside/></aside>
  </div>;
}

function mount(node, element, signal) {
  if (!node || signal?.aborted) return () => {};
  const root = createRoot(node); root.render(element); let live = true;
  const stop = () => { if (live) { live = false; root.unmount(); } };
  signal?.addEventListener('abort', stop, {once: true}); return stop;
}
export const mountBooking = (node, {draft, signal} = {}) => mount(node, <Booking draft={draft}/>, signal);
export const mountBookingDetails = (node, {signal} = {}) => mount(node, <div className="clinic-booking clinic-booking--find"><BookingDetailsFields/><ClinicContact bookingHelp/></div>, signal);

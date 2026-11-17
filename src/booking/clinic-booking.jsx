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
import {safeStorage} from '../site/lib/storage.mjs';
import {words, STEPS, DETAIL_FIELDS, keepTogether as kt, serviceFor, doctorFor, usablePolicy, doctorChoices, sittingHours, dayTiles, dayBeyondTiles, dayLong,
  slotGroups, waitsForAdmission, holdEdit, releaseEdits, screenFor, stepOneMissing, stepThreeMissing, askFor, mustChooseAgain, phoneCountry, detailProblems,
  paymentOrder, confirmLabel, confirmHint, visitSummary, barLines, paymentNote, contactRows, appointmentCard, calendarObject,
  readMark, withMark, draftRecord, saveDraft, loadDraft, clearDraft, flowStart, restoreNext, furthestStep, arrival, retreat, advanceMark, DRAFT_MINUTES,
  waitingView, visitLine, WAIT_GRACE, liftAboveBar, tidyPhone, tileMove, tileStop, readFault, askedDoctor, FIRST_TIMES, blockedWords} from './booking-steps.mjs';

const classes = (...names) => names.filter(Boolean).join(' ');

// What the booking steps still hold while the page stays open. The site draws the whole page again
// when the browser goes Back or Forward, which starts these screens afresh; they then take up the
// same engine coordinator again (it is made to be stopped and started), so nothing chosen, typed
// or said by the engine is lost and nothing is read from storage. In memory only; a fresh arrival
// on the booking page replaces it.
//   controller  the engine's coordinator of the booking in hand
//   here        the flow's mark on the history entry last shown
//   leftAt      when the screens were last taken down: a redraw follows within a moment; anything
//               later is a return from another page, and `here` no longer says where the visitor came from
//   ui          the little the screens add of their own: was the doctor the visitor's choice, why step 1 is shown again
//   blocked     what the engine said if it would not start in this browser (its next reading wipes the sentence)
const live = {controller: null, here: null, leftAt: 0, ui: null, blocked: ''};
const REDRAW_MS = 500;
const useBooking = createUseBooking(React, {product: bookingBrowser.product, controller: () => live.controller});

// The tab's own storage: where the engine keeps its booking reference, and where an unfinished
// booking is kept so that a refresh brings it back (booking-steps.mjs says exactly what is kept
// and for how long). While the page stays open the record is also removed by the clock, not only
// when it is next read. A browser that refuses site storage breaks nothing here: the site's own
// guard holds the record in memory instead, so it is simply gone after a refresh.
const tabStore = safeStorage(() => window.sessionStorage);
const tabStorage = () => tabStore;
let draftClock = 0;
function keepDraft(record) {
  saveDraft(tabStorage, record);
  clearTimeout(draftClock); draftClock = setTimeout(() => clearDraft(tabStorage), DRAFT_MINUTES * 60000);
}
function dropDraft() { clearTimeout(draftClock); clearDraft(tabStorage); }

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
 * the five-second booking-state check is running, or while the engine is busy with a read of its
 * own, then handed over; the engine itself still refuses anything it may not admit. So no button
 * has to be switched off for those moments, and no press is lost. `waiting` is true while one is kept.
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
          <span className="booking-progress__label">{item.label}{state === 'done' && <span className="visually-hidden">, {words.stepDone}</span>}</span>
        </li>;
      })}
    </ol>
    <p className="booking-progress__count" aria-hidden="true">{words.stepCount(step, STEPS.length, current.label)}</p>
  </>;
}

/**
 * "Your visit": who, when, how much, where; on the last step also whose visit it is, as typed on
 * step 2 (`onDetails` leads back there). The same card serves the side column and step 3.
 */
function VisitSummary({summary, id, onChange, onDetails = null, aside = false}) {
  // A fact not chosen yet is a dash for the eye and words for a screen reader.
  const empty = <dd className="is-empty"><span aria-hidden="true">—</span><span className="visually-hidden">{words.summary.empty}</span></dd>;
  const value = (text, waiting = false) => text ? <dd>{kt(text)}</dd> : waiting ? <dd className="is-empty">{words.summary.checking}</dd> : empty;
  return <section className="visit-summary" aria-labelledby={id}>
    {aside && <img className="visit-summary__object" src={calendarObject.src} width={calendarObject.width} height={calendarObject.height} alt="" loading="lazy" decoding="async"/>}
    <div className="visit-summary__head"><h3 className="visit-summary__title" id={id}>{words.summary.title}</h3>
      {aside ? <p className="tag tag--plain">{words.summary.pending}</p>
        : onChange && <button type="button" className="text-link visit-summary__change" onClick={onChange} aria-label={words.summary.change}><Icon name="edit"/><span>{words.change}</span></button>}</div>
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
        <small className="visit-summary__address">{kt(summary.place.address)}</small></dd></div>}
    </dl>
    {aside && onChange && <button type="button" className="text-link visit-summary__change" onClick={onChange}><Icon name="edit"/><span>{words.summary.change}</span></button>}
    {onDetails && <>
      <div className="visit-summary__tear" aria-hidden="true"/>
      <div className="visit-summary__head"><h3 className="visit-summary__title" id={id + 'who'}>{words.summary.details}</h3>
        {!aside && <button type="button" className="text-link visit-summary__change" onClick={onDetails} aria-label={words.summary.changeDetails}><Icon name="edit"/><span>{words.change}</span></button>}</div>
      <dl className="visit-summary__facts" aria-labelledby={id + 'who'}>
        <div><dt>{words.summary.patient}</dt><dd>{summary.patient.name}</dd></div>
        {summary.patient.phone && <div><dt>{words.summary.phone}</dt><dd>{kt(summary.patient.phone)}</dd></div>}
        {/* a long address breaks after its @, not in the middle of a word */}
        {summary.patient.email && <div><dt>{words.summary.email}</dt><dd>{summary.patient.email.split('@').map((part, index) => index ? <React.Fragment key={index}>@<wbr/>{part}</React.Fragment> : part)}</dd></div>}
      </dl>
      {aside && <button type="button" className="text-link visit-summary__change" onClick={onDetails}><Icon name="edit"/><span>{words.summary.changeDetails}</span></button>}
    </>}
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
      {card.place && <p className="appointment-card__place"><Icon name="pin"/><span><strong>{kt(card.place.name)}</strong>{kt(card.place.address)}
        <a className="appointment-card__directions" href={card.place.maps} target="_blank" rel="noopener noreferrer">{words.receipt.directions}<Icon name="out"/><span className="visually-hidden"> {words.receipt.opensMaps}</span></a></span></p>}
      {card.pay && <p className="appointment-card__line"><Icon name="banknote"/><strong>{card.pay}</strong></p>}
      {card.bring && <p className="appointment-card__line"><Icon name="file"/><span>{card.bring}</span></p>}
    </div>
  </article>;
}

function Booking({draft = {}}) {
  // Back, Forward and a refresh return to a history entry this flow marked: its step and the
  // choices come back (from what the page still holds, or after a refresh from the record kept in
  // the tab). A fresh arrival starts at step 1 with a new coordinator and reads nothing that was kept.
  const boot = useRef(null);
  if (!boot.current) {
    const mark = readMark(window.history.state);
    const redrawn = !!live.here && performance.now() - live.leftAt < REDRAW_MS;
    const held = mark && live.controller ? {state: live.controller.getSnapshot(), here: redrawn ? live.here : mark, chosen: !!live.ui?.chosen} : null;
    const start = flowStart({mark, live: held, saved: mark && !held ? loadDraft(tabStorage, Date.now()) : null});
    const kept = start.saved;
    if (kept) {
      Object.assign(draft, {name: kept.details.full_name, phone: kept.details.phone, email: kept.details.email, message: kept.details.notes});
      if (kept.chosen && doctorFor(kept.service)) draft.doctor = doctorFor(kept.service);
    } else if (!start.live) draft.doctor = askedDoctor(window.location.search, draft.doctor);
    const service = start.live ? held.state.service : kept?.chosen && kept.service ? kept.service : serviceFor(draft.doctor);
    if (!start.live) {
      live.controller = bookingBrowser.controller(service); live.ui = null;
      const began = live.controller.getSnapshot();
      live.blocked = began.phase === 'blocked' ? began.error : '';
    }
    live.here = {step: start.step, depth: start.depth};
    boot.current = {...start, service, chosen: start.live ? held.chosen : kept ? kept.chosen : !!service, gone: start.live && live.ui?.gone || ''};
  }
  const initialService = useRef(boot.current.service);
  const flow = useBooking(initialService.current), {state: s, dispatch} = flow, id = useId();
  const product = useSyncExternalStore(productState.subscribe, productState.getSnapshot, productState.getServerSnapshot);
  const [step, setStep] = useState(boot.current.step);
  // The kept choices still being handed back to the engine after a refresh (null = none).
  const [restoring, setRestoring] = useState(boot.current.saved);
  // What this history entry says: its step, and how many entries of the flow lie before it.
  const here = useRef(live.here);
  // The engine starts with its first doctor; the page waits for the visitor's own choice unless they came for one.
  const [chosen, setChosen] = useState(boot.current.chosen);
  const [changing, setChanging] = useState(false);
  const [later, setLater] = useState(false);
  const [held, setHeld] = useState(null);
  const [problems, setProblems] = useState(() => boot.current.short === 'details' ? detailProblems(live.controller.getSnapshot().details, {requiredContacts: live.controller.getSnapshot().policy?.policy.required_contacts}) : {});
  const [record, setRecord] = useState(false);
  // Why the visitor is back on step 1 without a starting time: 'taken' (it is no longer offered), 'again'
  // (booking was paused), the engine's own sentence about it, or ''. It outlives the engine's next reading.
  const [gone, setGone] = useState(boot.current.gone);
  live.ui = {chosen, gone};
  // (said to the page's memory at once as well: a move through the browser's history may follow before the next drawing)
  const sayGone = why => { live.ui = {chosen, gone: why}; setGone(why); };
  // The part of the step the visitor was shown after pressing the main button too early ("" = none).
  const [asked, setAsked] = useState(() => ['doctor', 'time', 'day'].includes(boot.current.short) ? boot.current.short : '');
  const root = useRef(null), title = useRef(null), laterBox = useRef(null), first = useRef(true), fieldNodes = useRef({}), parts = useRef({}), dayRow = useRef(null), bar = useRef(null);
  // Phones show the days as one row moved sideways: has it been moved to its end?
  const [daysEnd, setDaysEnd] = useState(false);
  const [act, waiting] = useHeldAction(flow.available && !s.busy, flow.viewAvailable);
  // What the page is waiting for after the last press: 'save', 'open' (a saved booking read again), 'check', or ''.
  const [wait, setWait] = useState(() => s.credential ? 'open' : '');
  const engaged = useRef(false);
  useEffect(() => {
    if (!wait) { engaged.current = false; return undefined; }
    if (s.busy) { engaged.current = true; return undefined; }
    if (engaged.current && !waiting) { engaged.current = false; setWait(''); return undefined; }
    // the engine did not take the request up (it refuses during a "try again later" pause): never wait for ever
    const timer = setTimeout(() => setWait(''), WAIT_GRACE);
    return () => clearTimeout(timer);
  }, [wait, s.busy, waiting]);

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

  // ----- the steps as history entries -----
  const relabel = mark => { here.current = live.here = mark; window.history.replaceState(withMark(window.history.state, mark), ''); };
  const forward = next => {
    setProblems({}); setStep(next);
    const mark = advanceMark(here.current, next);
    window.history.pushState(withMark(window.history.state, mark), ''); here.current = live.here = mark;
  };
  // An earlier step: through the browser's own history, so its Back and Forward stay true to the steps.
  const backTo = target => {
    setProblems({}); setStep(target);
    const move = retreat({from: here.current, target});
    if (move.go) window.history.go(move.go); else relabel(move.mark);
  };
  // This entry is the flow's: marked with its step (or left at once, when its step cannot be shown).
  // Reached by Back or Forward, the step starts at its heading, as it does when "Continue" leads to it.
  useEffect(() => {
    if (boot.current.go) { window.history.go(boot.current.go); return; }
    relabel(boot.current.relabel || here.current);
    if (boot.current.live) title.current?.focus({preventScroll: true});
  }, []);
  const requiredContacts = p?.required_contacts;
  const allowed = restoring ? STEPS.length : furthestStep({missing, problems: detailProblems(s.details, {requiredContacts})});
  // Back or Forward onto an entry of this flow, handled in place. The site's router asks first
  // (a `site:history` event that can be cancelled) when it offers that; where it does not, it draws
  // the page again and these screens start on the entry as above: the same result, less smoothly.
  const onArrival = useRef(null);
  onArrival.current = mark => {
    const from = here.current; here.current = live.here = mark;
    const move = arrival({mark, from, steps: screen === 'form', allowed});
    if (move.mark) relabel(move.mark);
    if (move.step) {
      if (move.step < mark.step) {
        // this entry's step cannot be shown yet: say why, as "Continue" would
        if (move.step === 1) pointTo(askFor({step: 1, missing, timesShown}));
        else setProblems(detailProblems(s.details, {requiredContacts}));
      } else setProblems({});
      setStep(move.step);
    }
    if (move.go) window.history.go(move.go);
  };
  useEffect(() => {
    const onHistory = event => {
      const mark = readMark(window.history.state);
      if (!mark) return; // an entry outside the flow: the site's router shows that page
      event.preventDefault();
      onArrival.current(mark);
    };
    window.addEventListener('site:history', onHistory);
    return () => window.removeEventListener('site:history', onHistory);
  }, []);

  // ----- what is kept for Back, Forward and refresh -----
  useEffect(() => {
    if (!restoring) return;
    if (!flow.viewAvailable || s.credential || s.phase === 'blocked') { setRestoring(null); return; }
    if (!flow.available || held) return; // the engine reads a day's times only while booking is admitted
    const next = restoreNext({saved: restoring, state: s, usable});
    for (const [name, value] of next.edits) dispatch({type: 'edit', name, value});
    if (!next.done) return;
    setRestoring(null);
    // the starting time could not be brought back: step 1, with the reason when it is no longer offered
    if (!next.kept && next.gone) sayGone('taken');
    if (!next.kept && step > 1) backTo(1);
  }, [restoring, s, usable, flow.available, flow.viewAvailable, held]);
  useEffect(() => {
    if (s.credential || s.receipt) { dropDraft(); return; } // sent: nothing is kept any more
    if (restoring || screen !== 'form' || !usable) return;
    keepDraft(draftRecord({state: s, chosen, now: Date.now()}));
  }, [restoring, screen, usable, chosen, s.credential, s.receipt, s.service, s.day, s.slot, s.payment_method, s.details]);

  // The chosen time has gone (someone else took it, or the day's times changed): back to step 1 to choose again.
  const paused = useRef(false);
  if (screen === 'unavailable') paused.current = true;
  useEffect(() => {
    if (screen !== 'form' || held || restoring || !mustChooseAgain({step, state: s, usable})) return;
    sayGone(s.error || (paused.current ? 'again' : 'taken')); paused.current = false; backTo(1);
  }, [screen, step, s.slot, s.slotsStatus, s.policyFresh, usable, held, restoring]);
  useEffect(() => { if (s.slot) { sayGone(''); paused.current = false; } }, [s.slot]);
  // A new booking after a finished one starts at step 1.
  const wasReceipt = useRef(false);
  useEffect(() => {
    if (screen === 'form' && wasReceipt.current && step > 1) backTo(1);
    wasReceipt.current = screen === 'receipt';
  }, [screen]);

  useEffect(() => () => { live.leftAt = performance.now(); }, []);
  // The page around the steps is told which screen is shown: its head changes once a booking is made.
  useEffect(() => {
    const page = root.current?.closest('.page-booking');
    if (!page) return undefined;
    page.setAttribute('data-booking-screen', screen);
    return () => page.removeAttribute('data-booking-screen');
  }, [screen]);
  // A new step, the waiting screen and each of its states, and the card after the last press start at their heading.
  const waitView = screen === 'checking' ? waitingView({wait, error: s.error}) : '';
  // So does the panel shown when booking stops in the middle of the steps: it is short, and the page
  // may be scrolled well past it.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const heading = screen === 'unavailable' ? root.current?.querySelector('.page-booking__status') : title.current;
    if (heading && !heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading?.focus({preventScroll: true});
    root.current?.scrollIntoView({block: 'start'});
  }, [step, screen === 'receipt', waitView, screen === 'unavailable']);

  const settle = useRef(false);
  const chooseDoctor = service => { settle.current = !chosen; setChosen(true); setChanging(false); edit('service', service); };
  // The visitor has just chosen a doctor: where the first row of times would not be in sight above
  // the bar (short laptop screens), the days come to the top of the screen, so days and times are seen together.
  useEffect(() => {
    if (!settle.current || !chosen) return;
    settle.current = false;
    requestAnimationFrame(() => {
      const day = parts.current.day, time = parts.current.time;
      if (!day || !time) return;
      const foot = bar.current ? Math.min(bar.current.getBoundingClientRect().top, window.innerHeight) : window.innerHeight;
      if (foot - time.getBoundingClientRect().top < FIRST_TIMES) day.scrollIntoView({block: 'start'});
    });
  }, [chosen]);
  // The chosen day is in sight in the row of days (after a refresh it may lie beyond the first few).
  useEffect(() => {
    const row = dayRow.current, tile = row?.querySelector('[aria-pressed="true"]');
    if (!row || !tile || row.scrollWidth <= row.clientWidth) return;
    const from = tile.getBoundingClientRect().left - row.getBoundingClientRect().left;
    if (from < 0 || from + tile.offsetWidth > row.clientWidth) row.scrollTo({left: Math.max(0, row.scrollLeft + from - 24), behavior: 'instant'});
  }, [shown.day, chosen, tiles.length]);
  const moveDays = () => {
    const row = dayRow.current; if (!row) return;
    row.scrollTo({left: daysEnd ? 0 : row.scrollLeft + row.clientWidth * 0.8});
  };
  const dayKeys = event => {
    const to = tileMove(tiles, event.target.dataset?.bookingDay || '', event.key);
    if (!to) return;
    event.preventDefault(); dayRow.current?.querySelector(`[data-booking-day="${to}"]`)?.focus();
  };
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
  // A control that takes the cursor while it sits under the bar is brought above it (Tab, arrow keys, a phone's keyboard).
  const keepClear = event => {
    const node = event.target, held = bar.current;
    if (!held || held.contains(node) || getComputedStyle(held).position !== 'sticky') return;
    // the hidden radio of a card, tile or pill: the thing that is seen sits beside it
    const face = node.classList?.contains('visually-hidden') && node.nextElementSibling || node;
    requestAnimationFrame(() => {
      const lift = liftAboveBar({box: face.getBoundingClientRect(), bar: held.getBoundingClientRect()});
      if (lift) window.scrollBy({top: lift});
    });
  };
  // The main button is never a dead press: pressed too early, it shows the visitor what is still missing.
  const pointTo = what => {
    if (!what) return;
    setAsked(what);
    requestAnimationFrame(() => {
      const node = parts.current[what]; if (!node) return;
      node.scrollIntoView({block: what === 'tick' ? 'nearest' : 'center'});
      // the first thing in it that can be chosen (not the group's own "Change" or "More days")
      node.querySelector('input:not(:disabled), button:not(:disabled):not(.text-link)[tabindex="0"], button:not(:disabled):not(.text-link):not([tabindex])')?.focus({preventScroll: true});
    });
  };
  const advance = () => {
    if (step === 1) { if (missing) pointTo(ask); else forward(2); return; }
    if (step === 2) {
      // a mobile number typed with a 0 in front is put right, not refused
      const phone = tidyPhone(s.details.phone);
      if (phone !== s.details.phone) detail('phone', phone);
      const found = detailProblems({...s.details, phone}, {requiredContacts: p?.required_contacts});
      setProblems(found);
      const wrong = DETAIL_FIELDS.find(name => found[name]);
      if (wrong) { fieldNodes.current[wrong]?.focus(); return; }
      forward(3); return;
    }
    if (s.busy || waiting) return;
    if (missingLast) { pointTo(ask); return; }
    setWait('save');
    act(() => { if (readyNow.current) void flow.start(); else setWait(''); });
  };
  // "Check my booking" and "Retry the same request": the quiet waiting state while the engine asks.
  const askAgain = run => { setWait('check'); act(run); };

  if (screen === 'unavailable') {
    // Booking stopped while someone was here: the same panel as the page's own, with the clinic's numbers.
    return <div className="clinic-booking clinic-booking--paused" ref={root} onClick={event => { if (event.target.closest('[data-booking-retry]')) void productState.refresh({force: true}); }}
      dangerouslySetInnerHTML={{__html: bookingUnavailable({state: product.checking ? 'checking' : 'unavailable', doctor: doctorFor(shown.service) || draft.doctor || '', kept: true})}}/>;
  }

  // A reading that failed on step 1 has one notice of the page's own (with the number to call); the engine's sentence is for everything else.
  const fault = screen === 'form' ? readFault({step, usable, chosen, held, state: s}) : '';
  const error = s.error && !fault && s.error !== gone && <Notice><p>{s.error}</p></Notice>;

  if (screen === 'receipt') {
    const r = s.receipt, service = serviceFor(doctorFor(r.resource_id));
    const can = action => r.next_actions.includes(action), settled = r.appointment_state === 'confirmed';
    const refresh = <button type="button" className="text-link booking-record__refresh" onClick={() => act(flow.check)}><span>{words.receipt.refresh}</span></button>;
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
            {/* a confirmed visit needs no re-reading: the engine's "Refresh details" sits with the full record */}
            {settled && record && refresh}
          </div>
        </div>
        <div className="booking-receipt__more">
          {can('resume_payment') && <button type="button" className="button button--main" onClick={() => act(flow.resume)}><span className="button__label">{words.receipt.resume}</span></button>}
          {can('check_payment') && !can('resume_payment') && <button type="button" className="button button--second" onClick={() => act(flow.resume)}><span className="button__label">{words.receipt.checkPayment}</span></button>}
          {can('choose_new_time') && <button type="button" className="button button--second booking-receipt__another" onClick={() => act(flow.restart)}><span className="button__label">{words.receipt.another}</span><Icon name="arrow"/></button>}
          {!settled && refresh}
          {can('choose_new_time') && <p className="booking-receipt__note">{words.receipt.anotherNote}</p>}
        </div>
        <div className="booking-receipt__notes"><ClinicContact service={service}/></div>
      </div>
    </div>;
  }

  if (screen === 'checking' || screen === 'blocked') {
    const view = waitView || 'stalled', saved = view === 'saving' ? visitLine(summary) : '';
    const blocked = blockedWords({storageRefused: !tabStore.persistent(), sentence: live.blocked});
    return <div className="clinic-booking clinic-booking--waiting" ref={root}>
      {screen === 'checking'
        ? <div className={classes('booking-panel', view !== 'stalled' && 'booking-panel--busy')} role="status" aria-busy={view !== 'stalled' ? 'true' : undefined} data-booking-wait={view}>
          {view !== 'stalled' && <span className="booking-pulse" aria-hidden="true"><i/><i/><i/></span>}
          <h2 className="clinic-booking__title" ref={title} tabIndex={-1}>{words.waiting[view].title}</h2>
          {/* the engine's own sentence when it has one; otherwise what is happening */}
          <p className="booking-panel__text">{view === 'stalled' && s.error ? s.error : words.waiting[view].text}</p>
          {saved && <p className="booking-panel__visit"><Icon name="calendar"/><span>{kt(saved)}</span></p>}
          {view === 'stalled' && <>
            <div className="booking-panel__actions">
              <button type="button" className="button button--main" onClick={() => askAgain(flow.check)}><span className="button__label">{words.waiting.check}</span></button>
              {flow.canRetryOriginal && <button type="button" className="button button--second" onClick={() => askAgain(flow.retryOriginal)}><span className="button__label">{words.waiting.retry}</span></button>}
            </div>
            <ClinicContact service={s.service} bookingHelp/>
          </>}
        </div>
        // The engine will not take a booking in this browser (it cannot read what it keeps in the tab):
        // why, in plain words, and the numbers; no form that cannot work.
        : <div className="booking-panel" data-booking-blocked>
          <h2 className="clinic-booking__title" ref={title} tabIndex={-1}>{blocked.title}</h2>
          <p className="booking-panel__text">{blocked.text}</p>
          {error}
          <ClinicContact bookingHelp/>
        </div>}
    </div>;
  }

  const stepInfo = STEPS.find(item => item.id === step);
  const lines = barLines(summary, missing);
  const sending = s.busy || waiting;
  const optionsStale = !usable || !s.policyFresh;
  // (when the engine re-reads the same day it keeps that day's times: they stay on screen meanwhile)
  const timesWaiting = !!held || s.slotsStatus === 'loading' && s.slots.length === 0;
  const noTimes = !timesWaiting && s.slotsStatus === 'ready' && s.slots.length === 0;
  const methods = usable ? paymentOrder(p.payment_methods, method => paymentAvailable(s.policy, method)) : [];
  // The tick box waits for the payment option (choosing one clears the tick in the engine); pressed before that, it points there.
  const tickWaits = missingLast === 'payment' || missingLast === 'checking';
  // Flat until the step is complete, but never dead: a press shows what is missing (advance).
  const notReady = step === 1 ? !!missing : step === 3 ? !!missingLast && !sending : false;
  const dayStop = tileStop(tiles, shown.day);
  const fields = [
    ['full_name', words.details.name, 'text', 'name', true, 100, words.details.someoneElse],
    ['phone', words.details.phone, 'tel', 'tel-national', p?.required_contacts.includes('phone') ?? true, 32, words.details.phoneHint],
    ['email', words.details.email, 'email', 'email', p?.required_contacts.includes('email') ?? false, 254, words.details.emailHint]
  ];

  return <div className="clinic-booking clinic-booking--steps" ref={root} data-step={step}>
    <div className="clinic-booking__main">
      <Progress step={step}/>
      {error}
      {gone && <Notice icon="clock" calm={gone === 'again'}><p>{gone === 'again' ? words.time.again : gone === 'taken' ? words.time.gone : gone}</p></Notice>}
      <form className="booking-form" aria-label={words.formLabel} noValidate onSubmit={event => { event.preventDefault(); advance(); }} onFocus={keepClear}>
        <section className={'clinic-booking__step clinic-booking__step--' + step} aria-labelledby={id + 'step'}>
          <h2 className="clinic-booking__title" id={id + 'step'} ref={title} tabIndex={-1}>{stepInfo.title}</h2>

          {step === 1 && <>
            {s.loadingPolicy && !usable && <p className="booking-wait" role="status">{words.options.checking}</p>}
            {fault === 'options' && <Notice><p>{words.options.failed}</p><ClinicContact bookingHelp/>
              <button type="button" className="button button--second" disabled={waiting} onClick={() => act(flow.loadPolicy)}><span className="button__label">{words.options.retry}</span></button></Notice>}
            {usable && !s.policyFresh && !s.loadingPolicy && <button type="button" className="button button--second" disabled={waiting} onClick={() => act(flow.loadPolicy)}><span className="button__label">{words.options.retry}</span></button>}
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
              {/* phones: a worded way to move the row of days, for a thumb that does not slide it */}
              <button type="button" className="text-link booking-days__more" onClick={moveDays} tabIndex={-1} aria-hidden="true">
                {daysEnd && <Icon name="left"/>}<span>{daysEnd ? words.day.earlier : words.day.more}</span>{!daysEnd && <Icon name="arrow"/>}</button>
              {asked === 'day' && <Ask>{words.ask.day}</Ask>}
              <div className="booking-days__row" ref={dayRow} onKeyDown={dayKeys} onScroll={event => { const row = event.currentTarget; setDaysEnd(row.scrollLeft + row.clientWidth >= row.scrollWidth - 8); }}>
                {tiles.map(tile => <button type="button" key={tile.iso} className="day-tile" data-booking-day={tile.iso} aria-pressed={shown.day === tile.iso} disabled={!tile.available}
                  tabIndex={tile.iso === dayStop ? 0 : -1}
                  aria-label={tile.spoken + (tile.available ? '' : ', ' + words.day.notOffered)} onClick={() => edit('day', tile.iso)}>
                  <span className="day-tile__label">{tile.label}</span><span className="day-tile__number">{tile.number}</span><span className="day-tile__month">{tile.month}</span>
                </button>)}
                <button type="button" className="day-tile day-tile--later" data-booking-other-date aria-expanded={laterOpen} aria-controls={id + 'later'} onClick={openLater}>
                  <Icon name="calendar"/><span>{words.day.later}</span></button>
              </div>
              <div className="booking-days__later" id={id + 'later'} ref={laterBox} hidden={!laterOpen}>
                <DateField label={words.day.dateField} value={shown.day} required min={range?.first_date} max={range?.last_date}
                  available={flow.viewAvailable} disabled={disabled || optionsStale} onChange={value => edit('day', value)} theme="rk-date"/>
                {/* the date box shows numerals only: the day in words, as on the tiles */}
                {dayBeyondTiles(tiles, shown.day) && <p className="booking-days__chosen" role="status">{dayLong(shown.day)}</p>}
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
            {fault === 'times' && <Notice><p>{words.time.failed}</p><ClinicContact service={shown.service} bookingHelp/>
              <button type="button" className="button button--second" disabled={disabled || s.loadingPolicy || waiting} onClick={() => act(flow.loadPolicy)}><span className="button__label">{words.time.retry}</span></button></Notice>}
          </>}

          {step === 2 && <div className="booking-fields">
            <div className="visit-strip">
              <p className="visit-strip__words"><span className="visit-strip__who">{kt(lines.top)}</span><span className="visit-strip__when">{kt(lines.bottom)}</span></p>
              <button type="button" className="text-link visit-strip__change" onClick={() => backTo(1)} aria-label={words.summary.change}><Icon name="edit"/><span>{words.change}</span></button>
            </div>
            {Object.keys(problems).length > 0 && <Notice><p>{words.errors.summary}</p></Notice>}
            {fields.map(([name, label, type, auto, required, maxLength, hint]) => <Field key={name} id={id + name} label={label} optional={!required} hint={hint} error={problems[name]}>
              <input className="booking-input" id={id + name} ref={node => { fieldNodes.current[name] = node; }} type={type} autoComplete={auto} maxLength={maxLength} required={required}
                inputMode={name === 'phone' ? 'tel' : undefined} aria-invalid={problems[name] ? 'true' : undefined} aria-describedby={id + name + (problems[name] ? '-error' : '-hint')}
                value={s.details[name]} disabled={disabled} onChange={event => { detail(name, event.target.value);
                  if (name === 'phone') detail('country', phoneCountry(event.target.value)); }}
                onBlur={name === 'phone' ? event => { const tidy = tidyPhone(event.target.value); if (tidy !== event.target.value) detail('phone', tidy); } : undefined}/>
            </Field>)}
            <VerificationFields flow={flow} className="booking-verify" inputClassName="booking-input" buttonClassName="button button--second"/>
            <Field id={id + 'notes'} label={words.details.notes} optional>
              <textarea className="booking-input booking-input--area" id={id + 'notes'} maxLength={2000} rows={3} value={s.details.notes} disabled={disabled}
                onChange={event => detail('notes', event.target.value)}/>
            </Field>
          </div>}

          {step === 3 && <>
            <VisitSummary summary={summary} id={id + 'visit-step'} onChange={() => backTo(1)} onDetails={() => backTo(2)}/>
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
            <p className="booking-pay-note booking-pay-note--later">{words.payment.later}</p>
          </>}
        </section>

        {fault !== 'options' && <div className={classes('booking-bar', 'booking-bar--' + step, step === 3 && 'booking-bar--last')} ref={bar}>
          {/* The last two presses stay together and in sight: the tick box and what it confirms, then the button. */}
          {step === 3 && <div className={classes('booking-last', asked === 'tick' && 'is-asked')} ref={node => { parts.current.tick = node; }}>
            <label className={classes('booking-ack', tickWaits && 'is-waiting')}>
              <input type="checkbox" checked={s.ack} disabled={disabled} aria-disabled={tickWaits || undefined} aria-describedby={id + 'last'}
                onChange={event => { if (tickWaits) pointTo(ask); else dispatch({type: 'ack', value: event.target.checked}); }}/>
              <span className="booking-ack__box" aria-hidden="true"><Icon name="check"/></span><span className="booking-ack__words">{words.confirm.ack}</span></label>
            <p className="booking-confirm-hint" id={id + 'last'} role="status">{confirmHint({missing: missingLast})}</p>
          </div>}
          {step === 1 && <p className="booking-bar__summary" id={id + 'need'}><span className="booking-bar__top">{kt(lines.top)}</span>{lines.bottom && <span className="booking-bar__bottom">{kt(lines.bottom)}</span>}</p>}
          {step === 1 && missing && <p className="booking-bar__hint" aria-hidden="true">{words.missing[missing]}</p>}
          {step > 1 && <button type="button" className="text-link booking-bar__back" disabled={sending} onClick={() => backTo(step - 1)}><Icon name="left"/><span>{words.back}</span></button>}
          <button type="submit" className={classes('button button--main button--large booking-bar__main', notReady && 'is-not-ready', step === 3 && sending && 'is-busy')} data-booking-continue
            disabled={step === 2 && disabled} aria-busy={step === 3 && sending ? 'true' : undefined} aria-describedby={step === 3 ? id + 'last' : step === 1 && missing ? id + 'need' : undefined}>
            <span className="button__label">{step === 3 ? confirmLabel({busy: sending, method: methodAvailable ? s.payment_method : '', offered: methods.filter(method => paymentAvailable(s.policy, method))}) : words.next}</span>
            {step < 3 && <Icon name="arrow"/>}
          </button>
        </div>}
      </form>
    </div>
    <aside className="clinic-booking__aside"><VisitSummary summary={summary} id={id + 'visit'} onChange={step > 1 ? () => backTo(1) : null} onDetails={step === 3 ? () => backTo(2) : null} aside/></aside>
  </div>;
}

function mount(node, element, signal) {
  if (!node || signal?.aborted) return () => {};
  const root = createRoot(node); root.render(element); let live = true;
  const stop = () => { if (live) { live = false; root.unmount(); } };
  signal?.addEventListener('abort', stop, {once: true}); return stop;
}
export const mountBooking = (node, {draft, signal} = {}) => mount(node, <Booking draft={draft}/>, signal);
/**
 * "Find your booking": the package's own screen. When it has an answer it moves the cursor to the
 * answer's heading; the page then brings that heading to the top of the screen, so the answer is seen
 * (on a phone it used to appear at the foot of the screen, or below it).
 */
function FindBooking() {
  const answered = event => { if (event.target.matches?.('.abs-lookup-results > h2')) event.target.scrollIntoView({block: 'start'}); };
  return <div className="clinic-booking clinic-booking--find" onFocus={answered}><BookingDetailsFields/><ClinicContact bookingHelp/></div>;
}
export const mountBookingDetails = (node, {signal} = {}) => mount(node, <FindBooking/>, signal);

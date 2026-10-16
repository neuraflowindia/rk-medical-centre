import {doctors,doctorFacts,escapeHTML as e} from './model.mjs';
import {doctorOrder,topicLink} from './care-catalogue.mjs';
import {action,arrow,link,solidIcon} from './ui.js';

const presentation={
 sanjay:{role:'Physician, diabetes and general health',educationKeyword:'MBBS and DGO',careCopy:'Patients can meet him for diabetes, blood pressure, thyroid concerns, fever and everyday health problems. A visit gives them a chance to talk about what is worrying them and ask questions about their care.'},
 parul:{role:'Women’s health and pregnancy',educationKeyword:'gold medalist',careCopy:'She sees patients for women’s health concerns, including period problems, PCOS, pregnancy check-ups and care after childbirth. Patients can also discuss their questions about ultrasound and pregnancy care.'}
};

// Highlight a known phrase without letting factual source text become HTML.
function educationSentence(text,keyword){
 return text.split(keyword).map(e).join(`<strong>${e(keyword)}</strong>`);
}

function feature(id){
 const d=doctors[id],facts=doctorFacts[id],copy=presentation[id];
 const qualification=facts.education.split(' — ')[0];
 const factChips=[
  [id==='parul'?'credential':'book',qualification],
  ['book','KGMU Lucknow'],
  ['calendar','30+ years of practice']
 ];
 const care=facts.care.map(item=>`<li><a href="${link(topicLink(item.topic))}">${e(item.text)}</a></li>`).join('');
 return `<article class="doctor-card doctor-card-home home-doctor-feature" data-doctor="${id}" aria-labelledby="home-doctor-${id}">
  <div class="home-doctor-identity" aria-hidden="true">
   <div class="home-doctor-portrait">
    <span class="home-doctor-initials">${e(d.initials)}</span>
    <div class="doctor-decoration"><div data-scene="emblem" data-scene-id="doctor-${id}">${solidIcon(id==='sanjay'?'doctor':'heart')}</div></div>
   </div>
   <p class="home-doctor-identity-name">${e(d.name)}</p>
   <p class="home-doctor-tenure">${solidIcon('calendar')}<span>Practising since ${e(facts.since)}</span></p>
  </div>
  <div class="doctor-copy">
   <p class="eyebrow">${e(copy.role)}</p>
   <h3 id="home-doctor-${id}">${e(d.name)}</h3>
   <div class="home-doctor-biography">
    <p class="doctor-summary">${educationSentence(facts.educationText,copy.educationKeyword)} ${id==='sanjay'?'He':'She'} has been <strong>practising since ${e(facts.since)}</strong>.</p>
    <p class="doctor-summary">${e(copy.careCopy)}</p>
   </div>
   <ul class="doctor-facts home-doctor-facts">${factChips.map(([icon,label])=>`<li>${solidIcon(icon,'solid-icon fact-icon')}<span><strong>${e(label)}</strong></span></li>`).join('')}</ul>
   <ul class="doctor-topics home-doctor-topics">${care}</ul>
   <p class="home-doctor-fee"><strong>₹${e(facts.fee)} · Consultation at the clinic</strong></p>
   <div class="doctor-actions">
    ${action('About '+d.name,d.path)}
    <a class="button secondary" data-booking-only href="${link('/booking?doctor='+id)}"><span class="button-label">Book a visit ${arrow}</span></a>
    <a class="text-link home-doctor-call" href="tel:${d.tel}">${solidIcon('phone')}<span>Call ${e(d.name)}</span></a>
   </div>
  </div>
 </article>`;
}

export function homeDoctors(){
 return `<div class="doctor-grid doctor-grid-home">${doctorOrder.map(feature).join('')}</div>`;
}

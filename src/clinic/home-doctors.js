import {doctors,doctorFacts,escapeHTML as e} from './model.mjs';
import {doctorOrder,topicLink} from './care-catalogue.mjs';
import {arrow,link,solidIcon} from './ui.js';

const presentation={
 sanjay:{role:'Physician, diabetes and general health',educationKeyword:'MBBS and DGO',careCopy:'Patients can meet him for diabetes, blood pressure, thyroid concerns, fever and everyday health problems. A visit gives them a chance to talk about what is worrying them and ask questions about their care.'},
 parul:{role:'Women’s health and pregnancy',educationKeyword:'gold medalist',careCopy:'She sees patients for women’s health concerns, including period problems, PCOS, pregnancy check-ups and care after childbirth. Patients can also discuss their questions about ultrasound and pregnancy care.'}
};
const careIcons={diabetes:'meter','blood-pressure':'heart',thyroid:'report','fever-infections':'medicine','general-health':'person','womens-health':'heart',pregnancy:'calendar',ultrasound:'report'};

// Highlight a known phrase without letting factual source text become HTML.
function educationSentence(text,keyword){
 return text.split(keyword).map(e).join(`<strong>${e(keyword)}</strong>`);
}

function feature(id){
 const d=doctors[id],facts=doctorFacts[id],copy=presentation[id];
 const qualification=facts.education.split(' — ')[0];
 const factChips=[
  [id==='parul'?'medal':'cap',qualification],
  ['university','KGMU Lucknow'],
  ['clock','30+ years of practice']
 ];
 const care=facts.care.map(item=>`<li><a href="${link(topicLink(item.topic))}"><span class="home-doctor-care-icon" aria-hidden="true">${solidIcon(careIcons[item.topic]||'check-circle')}</span><strong>${e(item.text)}</strong></a></li>`).join('');
 return `<article class="doctor-card doctor-card-home home-doctor-feature" data-doctor="${id}" aria-labelledby="home-doctor-${id}">
  <div class="home-doctor-identity" aria-hidden="true">
   <div class="home-doctor-portrait">
    <span class="home-doctor-initials">${e(d.initials)}</span>
    <div class="doctor-decoration"><div data-scene="emblem" data-scene-id="doctor-${id}">${solidIcon(id==='sanjay'?'doctor':'heart')}</div></div>
   </div>
   <p class="home-doctor-identity-name">${e(d.name)}</p>
   <p class="home-doctor-tenure">${solidIcon('clock')}<span><span class="home-doctor-tenure-label">Practising since</span><strong>${e(facts.since)}</strong></span></p>
  </div>
  <div class="doctor-copy">
   <p class="eyebrow home-doctor-role">${solidIcon(id==='sanjay'?'doctor':'heart')}<span>${e(copy.role)}</span></p>
   <h3 id="home-doctor-${id}">${e(d.name)}</h3>
   <div class="home-doctor-biography">
    <p class="doctor-summary">${educationSentence(facts.educationText,copy.educationKeyword)} ${id==='sanjay'?'He':'She'} has been <strong>practising since ${e(facts.since)}</strong>.</p>
    <p class="doctor-summary">${e(copy.careCopy)}</p>
   </div>
   <ul class="doctor-facts home-doctor-facts">${factChips.map(([icon,label])=>`<li${icon==='medal'?' class="home-doctor-medal"':''}><span class="home-fact-symbol">${solidIcon(icon,'solid-icon fact-icon')}</span><strong>${e(label)}</strong></li>`).join('')}</ul>
   <ul class="doctor-topics home-doctor-topics">${care}</ul>
   <div class="doctor-actions">
    <a class="button home-doctor-about" href="${link(d.path)}" aria-label="About ${e(d.name)}"><span class="button-label">About the doctor${arrow}</span></a>
    <a class="button secondary home-doctor-call" href="tel:${d.tel}">${solidIcon('phone')}<span>Call ${e(d.name)}</span></a>
    <p class="home-doctor-fee"><strong>₹${e(facts.fee)} · Consultation at the clinic</strong></p>
    <a class="button secondary home-doctor-book" data-booking-only href="${link('/booking?doctor='+id)}"><span class="button-label">Book a visit ${arrow}</span></a>
   </div>
  </div>
 </article>`;
}

export function homeDoctors(){
 return `<div class="doctor-grid doctor-grid-home">${doctorOrder.map(feature).join('')}</div>`;
}

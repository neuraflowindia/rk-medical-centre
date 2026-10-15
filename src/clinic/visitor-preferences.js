import {parsePreference,preferenceKey,createMeasurement} from './visitor-preferences.mjs';
export function createPreferences(){const measurement=createMeasurement();let memory=null,storageWorks=true;const abort=new AbortController();
 const panel=document.createElement('aside');panel.id='privacy-panel';panel.className='privacy-panel';panel.setAttribute('aria-label','Privacy choices');panel.innerHTML='<h2>Your privacy choices</h2><p>Visit measurement is not currently in use. Only your privacy choice is saved on this device.</p><div class="actions"><button class="button" data-allow disabled>Visit measurement unavailable</button><button class="button secondary" data-deny>Continue without it</button></div><button class="privacy-close" aria-label="Close privacy choices">×</button>';document.body.append(panel);
 function read(){try{const raw=localStorage.getItem(preferenceKey);memory=parsePreference(raw);}catch{storageWorks=false;}measurement.setConsent(false);panel.hidden=true;}
 function choose(value){memory={version:1,measurement:value,savedAt:Date.now()};try{localStorage.setItem(preferenceKey,JSON.stringify(memory));}catch{storageWorks=false;}measurement.setConsent(value);panel.hidden=true;}
 panel.querySelector('[data-deny]').onclick=()=>choose(false);panel.querySelector('.privacy-close').onclick=()=>panel.hidden=true;
 window.addEventListener('storage',e=>{if(e.key===preferenceKey||e.key===null)read();},{signal:abort.signal});read();
 return {measurement,open(){panel.hidden=false;panel.querySelector('[data-deny]').focus();},refresh(){if(storageWorks)read();else if(memory&&!parsePreference(JSON.stringify(memory))){memory=null;measurement.setConsent(false);}},dispose(){abort.abort();panel.remove();}};
}

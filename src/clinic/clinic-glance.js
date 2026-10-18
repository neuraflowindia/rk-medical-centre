import {escapeHTML as e} from './model.mjs';
import {solidIcon} from './ui.js';

// Reading-only facts; callers supply values from the canonical clinic model.
export function clinicGlance(entries,variant='home'){
 const className=variant==='about'?'about-hero-facts':'hero-fact-strip';
 return `<div class="wrap clinic-glance ${className}" role="list" aria-label="Clinic at a glance">${entries.map(({icon,value,detail})=>`<article role="listitem">${solidIcon(icon)}<div><strong>${e(value)}</strong><p>${e(detail)}</p></div></article>`).join('')}</div>`;
}

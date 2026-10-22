/** Reuse the actual page templates; no alternate search-engine body. */
import {header,footer,setRoute} from './ui.js';
import {suppressBookingLinks} from './booking-links.mjs';
import {home} from './home.js';
import {treatments} from './treatments.js';
import {about,doctorPage,profile,contact} from './retained-pages.js';
import {visitFormMarkup} from './visit-form.js';
import {createDraft} from './visit-draft.mjs';
import {resolveSelection} from './care-catalogue.mjs';
import {pageMetadata,siteOrigin} from './page-metadata.mjs';
import {publicGraph,serializeGraph} from './page-schema.mjs';
const templates={'/':home,'/treatment':()=>treatments(resolveSelection('')),'/about-clinic':about,'/meet-doctor':doctorPage,
 '/dr-sanjay-gupta':()=>profile('sanjay'),'/dr-parul-gupta':()=>profile('parul'),'/contact':contact};
export function renderPublicBody(path){
 const render=templates[path];if(!render)throw Error('Not a public template');setRoute(path);
 return header()+`<main id="main" tabindex="-1">${render()}</main>`+footer();
}
export function renderPublicDocument({path,mode,booking,html}){
 if(booking)return html;
 let body=renderPublicBody(path).replace('<div id="visit-inline-anchor"></div>',`<div id="visit-inline-anchor">${visitFormMarkup(createDraft())}</div>`).replaceAll('data-booking-only',`data-booking-only${mode==='off'?' hidden inert':''}`)
  .replace(/<form\b(?![^>]*\bmethod=)/g,'<form method="post"').replace(/<(input|select|textarea)\b(?![^>]*\bdisabled\b)/g,'<$1 disabled data-unbound-control')
  .replace(/<button\b([^>]*type="submit"[^>]*)>/g,'<button$1 disabled data-unbound-control>');
 if(mode==='off')body=suppressBookingLinks(body);
 const graph=serializeGraph(publicGraph(siteOrigin,path,pageMetadata[path]));
 const output=html.replace(/<div id="app">[\s\S]*?(?=<dialog id="reader")/,`<div id="app" data-rendered-path="${path}" data-display-mode="${mode}">${body}</div>`)
  .replace('<html lang="en">',`<html lang="en" data-booking-state="${mode}">`);
 if(!output.includes('data-rendered-path='))throw Error('Public root replacement failed');
 return output.replace('</head>',`<meta property="og:image" content="${siteOrigin}/clinic-assets/rk-medical-centre-social.png"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json" data-site-graph>${graph}</script></head>`);
}

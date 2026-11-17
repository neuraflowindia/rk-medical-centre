/** The pre-render entry. It prints each public page with the site's own templates, once per booking state. */
import {renderApp,pageContext,applyBookingMode,lockUnboundControls} from '../site/runtime/render.mjs';
import {publicPaths} from '../site/runtime/registry.mjs';
import {pageMetadata,siteOrigin} from './page-metadata.mjs';
import {publicGraph,serializeGraph} from './page-schema.mjs';

/** The inside of `#app` for one public page. `mode` is the booking state the document is printed in. */
export function renderPublicBody(path,mode='off',now=new Date()){
 if(!publicPaths.includes(path))throw Error('Not a public template');
 return renderApp(pageContext({path,mode,now}));
}

/**
 * The full document for one page. Booking documents pass through untouched: they are the bare
 * shell and are drawn in the browser. Called by the booking package for 7 pages × 2 states.
 */
export function renderPublicDocument({path,mode,booking,html}){
 if(booking)return html;
 const body=lockUnboundControls(applyBookingMode(renderPublicBody(path,mode),mode));
 const graph=serializeGraph(publicGraph(siteOrigin,path,pageMetadata[path]));
 const output=html.replace(/<div id="app">[\s\S]*?(?=<dialog id="reader")/,()=>`<div id="app" data-rendered-path="${path}" data-display-mode="${mode}">${body}</div>`)
  .replace('<html lang="en">',`<html lang="en" data-booking-state="${mode}">`);
 if(!output.includes('data-rendered-path=')||!output.includes(`<html lang="en" data-booking-state="${mode}">`))throw Error('Public root replacement failed');
 return output.replace('</head>',()=>`${sharingTags(path)}<script type="application/ld+json" data-site-graph>${graph}</script></head>`);
}

const attribute=value=>String(value).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/**
 * What a page shows when its address is shared (a message, a social post): its reviewed title and
 * description, the clinic's picture and its own address. The same values the browser sets after
 * every page change (`applyPageMetadata`), printed here so they are there without scripts.
 */
export function sharingTags(path){
 const entry=pageMetadata[path];
 if(!entry)throw Error('Not a public page');
 const picture=`${siteOrigin}/clinic-assets/rk-medical-centre-social.png`;
 return `<meta property="og:type" content="website"><meta property="og:site_name" content="R. K. Medical Centre">`
  +`<meta property="og:title" content="${attribute(entry.title)}"><meta property="og:description" content="${attribute(entry.description)}">`
  +`<meta property="og:url" content="${siteOrigin}${path}"><meta property="og:image" content="${picture}">`
  +`<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attribute(entry.title)}"><meta name="twitter:description" content="${attribute(entry.description)}"><meta name="twitter:image" content="${picture}">`;
}

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
 return output.replace('</head>',()=>`<meta property="og:image" content="${siteOrigin}/clinic-assets/rk-medical-centre-social.png"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json" data-site-graph>${graph}</script></head>`);
}

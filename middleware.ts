import {next,rewrite} from '@vercel/functions';
import {createRouting} from './appointment-system/hosting/routing.mjs';
import project from './dist/appointment-routing-profile.json' with {type:'json'};
import manifest from './dist/appointment-surface-manifest.json' with {type:'json'};

// Only proved public image paths bypass the function. Mixed assets, encoded paths and all booking/API/control routes retain the guard.
export const config={runtime:'nodejs',matcher:'/((?!(?:clinic-assets|client-photos|certificates)/(?:[a-z0-9_-]+/)*[a-z0-9_-]+\\.(?:webp|png|jpg|jpeg|svg|ico)$).*)'};
export default createRouting({project,manifest,next,rewrite});

import {next,rewrite} from '@vercel/functions';
import {createRouting} from './appointment-system/hosting/routing.mjs';
import project from './dist/appointment-routing-profile.json';
import manifest from './dist/appointment-surface-manifest.json';

// All paths, including static booking assets, pass through the shared guard.
export const config={runtime:'nodejs',matcher:'/:path*'};
export default createRouting({project,manifest,next,rewrite});

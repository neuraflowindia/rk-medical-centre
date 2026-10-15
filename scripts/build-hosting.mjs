import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {requireHostingProfile} from './require-hosting-profile.mjs';
import {buildDisplay} from './display-build.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const project=requireHostingProfile(JSON.parse(readFileSync(new URL('../appointment-settings/project.json',import.meta.url))));
const manifest=buildDisplay({root,project});
console.log(JSON.stringify({publicPages:manifest.public_paths.length,bookingPages:manifest.booking_paths.length,backendPages:manifest.backend_paths.length,hosted:false}));

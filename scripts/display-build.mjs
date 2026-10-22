import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {publicFiles,writeSurfaceManifest} from '../appointment-system/tools/build/surfaces.mjs';
import {generateModes} from '../appointment-system/tools/build/page-modes.mjs';
import {provePublicImages} from './public-asset-boundary.mjs';
import {pageMetadata,utilityMetadata} from '../src/clinic/page-metadata.mjs';
import {renderPublicDocument} from '../src/clinic/public-document.mjs';

export const pages={...pageMetadata,...utilityMetadata};
// Utility pages intentionally have no public-page identity, including before JS.
export function utilityDocument(html){
 return html.replace(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/gi,'')
  .replace(/<meta\b(?=[^>]*\b(?:name|property)=["'](?:og:url|twitter:url)["'])[^>]*>/gi,'')
  .replace(/<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,'');
}
export function buildDisplay({root,project}){
  const dist=resolve(root,'dist'),publicDirectory=resolve(root,'public');
  const publicAssets=Object.fromEntries(publicFiles(publicDirectory).map(path=>[path,path==='/sitemap.xml'?'generated':'general']));
  const manifest=writeSurfaceManifest({dist,publicDirectory,project,
    publicPaths:Object.keys(pages).filter(path=>!path.startsWith('/booking')),
    bookingPaths:['/booking','/booking-details','/booking-help'],
    backendPaths:['/studio','/studio/calendar','/enquiries-studio','/company/booking-control','/company/booking-support','/company/google-repair'],publicAssets});
  generateModes({dist,shell:readFileSync(resolve(dist,'index.html'),'utf8'),pages:{...pages,...pageMetadata},project,manifest,brand:'R. K. Medical Centre',renderPage:renderPublicDocument});
  for(const path of manifest.booking_paths){
    const file=resolve(dist,'__booking_display/on',path.slice(1)+'.html');
    writeFileSync(file,utilityDocument(readFileSync(file,'utf8')));
  }
  writeFileSync(resolve(root,'docs/project-001/public-image-boundary.json'),JSON.stringify(provePublicImages({dist,manifest}),null,2)+'\n');
  // Only public routing identity belongs in the middleware bundle.
  const routing=Object.fromEntries(['installation_id','project_id','environment','origin','aliases','worker','surfaces'].map(key=>[key,project[key]]));
  writeFileSync(resolve(dist,'appointment-routing-profile.json'),JSON.stringify(routing,null,2)+'\n');
  return manifest;
}

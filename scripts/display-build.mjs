import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {publicFiles,writeSurfaceManifest} from '../appointment-system/tools/build/surfaces.mjs';
import {generateModes} from '../appointment-system/tools/build/page-modes.mjs';
import {homeHeadline} from '../src/clinic/model.mjs';

export const pages={
  '/':[homeHeadline,'Speak with our doctors about diabetes and everyday illnesses, period concerns or pregnancy at R. K. Medical Centre, Lucknow.'],
  '/treatment':['Treatments','See what Dr. Sanjay Gupta and Dr. Parul Gupta can help with.'],
  '/about-clinic':['About the clinic','Read about R. K. Medical Centre, clinic hours and preparing for your visit.'],
  '/meet-doctor':['Meet the doctors','Read about the doctors’ qualifications, experience and areas of care.'],
  '/dr-sanjay-gupta':['Dr. Sanjay Gupta','Physician, diabetes and general health consultations in Lucknow.'],
  '/dr-parul-gupta':['Dr. Parul Gupta','Women’s health, pregnancy care and ultrasound consultations in Lucknow.'],
  '/contact':['Contact the clinic','Call the clinic, check visiting hours and find directions.'],
  '/booking':['Book your visit','Choose your doctor and an available starting time.'],
  '/booking-details':['Find your booking','View your appointment details.'],
  '/booking-help':['Find your booking','View your appointment details.'],
};
export function buildDisplay({root,project}){
  const dist=resolve(root,'dist'),publicDirectory=resolve(root,'public');
  const publicAssets=Object.fromEntries(publicFiles(publicDirectory).map(path=>[path,path==='/sitemap.xml'?'generated':'general']));
  const manifest=writeSurfaceManifest({dist,publicDirectory,project,
    publicPaths:Object.keys(pages).filter(path=>!path.startsWith('/booking')),
    bookingPaths:['/booking','/booking-details','/booking-help'],
    backendPaths:['/studio','/studio/calendar','/enquiries-studio','/company/booking-control','/company/booking-support','/company/google-repair'],publicAssets});
  generateModes({dist,shell:readFileSync(resolve(dist,'index.html'),'utf8'),pages,project,manifest,brand:'R. K. Medical Centre'});
  // Only public routing identity belongs in the middleware bundle.
  const routing=Object.fromEntries(['installation_id','project_id','environment','origin','aliases','worker','surfaces'].map(key=>[key,project[key]]));
  writeFileSync(resolve(dist,'appointment-routing-profile.json'),JSON.stringify(routing,null,2)+'\n');
  return manifest;
}

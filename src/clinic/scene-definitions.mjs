import {sceneSpecs} from './choreography-data.mjs';
import {context,E} from './choreography-primitives.mjs';
import {hero,steps,profile,booking} from './choreography-physical.mjs';
import {treatment} from './choreography-topics.mjs';
import {supporting} from './choreography-sections.mjs';
import {bookingSectionScene} from './home-booking-motion.mjs';
import {profileContact} from './choreography-profile-contact.mjs';
export const ENTRANCE_EASE=E;
export const IMPLEMENTED_SCENES=Object.freeze(Object.keys(sceneSpecs));
const physical={H1:hero,H5:steps,P1:profile,B1:booking};
const personal=new Set(['S1','S2','S3','S4','P2','P3','P4','C1','C2']);
const childSpecs=Object.freeze({'H3-card':Object.freeze({...sceneSpecs.H3,duration:480,phoneDuration:480})});
export function sceneParts(root,phone=false,id=root.dataset.sectionScene){
 const base=id.replace(/-panel$|-card$/,''),spec=childSpecs[id]||sceneSpecs[base];
 if(!spec)throw new Error('Unknown choreography scene '+id);
 const c=context(root,id,phone,phone?spec.phoneDuration:spec.duration);
 try{
  if(base==='H8'||base==='H9')bookingSectionScene(c);
  else if(physical[base])physical[base](c);
  else if(base==='T2'||base==='T3')treatment(c);
  else if(personal.has(base))profileContact(c);
  else supporting(c);
 }catch(error){c.cleanup();throw error;}
 c.spec=spec;return c;
}
export function sceneDefinition(id,phone=false){const s=childSpecs[id]||sceneSpecs[id];return s?{duration:phone?s.phoneDuration:s.duration}:null;}
export function matchingScene(scene,id){
 if(!id)return true;
 const aliases={hero:['H1'],services:['H3','T2','T3'],care:['H3','T2','T3'],steps:['H5'],'visit-notebook':['H5'],physician:['T2'],women:['T3'],'profile-sanjay':['S1'],'profile-parul':['P1'],booking:['B1']};
 return scene.id===id||scene.id.startsWith(id+'/')||scene.type===id||aliases[id]?.includes(scene.type.replace(/-panel$|-card$/,''))||!!scene.root.querySelector('[data-scene-id="'+CSS.escape(id)+'"]');
}
export const ambientDefinition=()=>null;
export const chooseAmbientOwner=()=>null;

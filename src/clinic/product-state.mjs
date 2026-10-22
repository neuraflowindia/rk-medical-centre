import {createStateController,publicDisplaySnapshot,admissionAllowed} from '../../appointment-system/browser/product-state.mjs';
const initial=typeof document!=='undefined'&&document.querySelector('meta[name="booking-display-mode"]')?.content==='on';
export const productState=createStateController({serverSnapshot:()=>publicDisplaySnapshot(initial),initialDisplay:true});
export {admissionAllowed};

export const preferenceKey='rk-choreography-measurement';
export function parsePreference(raw,now=Date.now()){try{const p=JSON.parse(raw);return p&&p.version===1&&typeof p.measurement==='boolean'&&Number.isFinite(p.savedAt)&&p.savedAt<=now&&now-p.savedAt<180*86400000?p:null;}catch{return null;}}
/** Keep the visitor's privacy choice on this device. Returns the record, or null when it could not be kept. */
export function savePreference(storage,measurement,now=Date.now()){
 const record={version:1,measurement:measurement===true,savedAt:now};
 try{storage.setItem(preferenceKey,JSON.stringify(record));return record;}catch{return null;}
}
export function createMeasurement(){const events=[];let allowed=false,visible=false,route='',last='',started=false;const paths=new Set(['/','/treatment','/about-clinic','/meet-doctor','/contact']);
 const record=name=>{if(!allowed||!visible)return;if(name==='page'){if(!paths.has(route)||last===route)return;last=route;events.push({name:'page',page:route});}else if(name==='booking-click')events.push({name});else if(name==='booking-start'&&!started){started=true;events.push({name});}};
 return{setConsent(value){const grant=!allowed&&value;allowed=value;if(!value){events.length=0;last='';}else if(grant)record('page');},setVisible(v){visible=v;if(v)record('page');},setRoute(r){if(route!==r)last='';route=r;record('page');},record,snapshot:()=>events.map(e=>({...e}))};}

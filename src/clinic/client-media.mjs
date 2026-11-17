import {doctors} from './model.mjs';

// Source intake, original hashes, exact crops and encoding choices belong to
// the dated implementation/media-evidence.json, outside the hosted app.
function photo(id,caption,alt,stem,width=1448,height=1086,widths=[480,768,1024,1448]){
 const sources=widths.map(size=>({width:size,src:`/client-photos/${stem}-${size}.webp`}));
 return {id,caption,alt,width,height,src:sources.at(-1).src,sources};
}

export const clinicPhotos={
 'waiting-area':photo('waiting-area','Waiting area','Covered clinic waiting area with seating, glass doors and a counter.','clinic-waiting-area'),
 reception:photo('reception','Reception','The clinic reception desk, seating and wall notices, with three people beside the desk.','clinic-reception-desk'),
 entrance:photo('entrance','Clinic entrance','Open black gates and the clinic’s glass entrance doors.','clinic-glass-door-entrance'),
 'sanjay-room':photo('sanjay-room',`${doctors.sanjay.name}’s consultation room`,`${doctors.sanjay.name} at his consultation desk, with an examination couch at the left.`,'sanjay-gupta-consultation-room'),
 'parul-room':photo('parul-room',`${doctors.parul.name}’s consultation room`,`${doctors.parul.name} seated at her consultation desk, with awards and an examination curtain behind.`,'parul-gupta-consultation-room'),
 'street-frontage':photo('street-frontage','Clinic frontage','R. K. Medical Centre’s sign and entrance viewed from the street.','clinic-street-frontage'),
 'clinic-gate':photo('clinic-gate','Clinic gate','The gate beneath the doctors’ blue sign, with a parked car and a street food cart nearby.','clinic-gate-street-view'),
 'sanjay-portrait':photo('sanjay-portrait',doctors.sanjay.name,`${doctors.sanjay.name} seated at his consultation desk.`,'sanjay-gupta-at-desk',480,600,[160,320,480]),
 'parul-portrait':photo('parul-portrait',doctors.parul.name,`${doctors.parul.name} seated at her consultation desk.`,'parul-gupta-at-desk',520,650,[160,320,520])
};

export const clinicAlbum=['waiting-area','reception','entrance','sanjay-room','parul-room','street-frontage','clinic-gate'];
export const doctorPortraits={sanjay:'sanjay-portrait',parul:'parul-portrait'};
export const doctorRoomPhotos={sanjay:'sanjay-room',parul:'parul-room'};

// ---- The version-2 look: tight crops with one colour grade, exported at 1× and 2×. ----
// A crop record's width and height are its 1× size; `sources` lists every exported width.
function crop(id,caption,alt,stem,width,height,widths){
 const sources=widths.map(size=>({width:size,src:`/client-photos/${stem}-${size}.webp`}));
 return {id,caption,alt,width,height,src:sources[0].src,sources};
}
Object.assign(clinicPhotos,{
 'portrait-sanjay':crop('portrait-sanjay','In his consulting room',`${doctors.sanjay.name} at his desk in the consulting room`,'dr-sanjay-gupta-portrait',264,330,[264,528]),
 'portrait-parul':crop('portrait-parul','In her consulting room',`${doctors.parul.name} reading a patient’s notes in her consulting room`,'dr-parul-gupta-portrait',264,330,[264,528]),
 // The first screen's pair: each doctor at the desk. The doctor cards use a closer crop of the same photographs.
 'desk-sanjay':crop('desk-sanjay','In his consulting room',`${doctors.sanjay.name} at his desk in the consulting room`,'dr-sanjay-gupta-at-desk',264,330,[264,528]),
 'desk-parul':crop('desk-parul','In her consulting room',`${doctors.parul.name} reading a patient’s notes in her consulting room`,'dr-parul-gupta-at-desk',264,330,[264,528]),
 'close-sanjay':crop('close-sanjay','In his consulting room',doctors.sanjay.name,'dr-sanjay-gupta-close-up',180,225,[180,360]),
 'close-parul':crop('close-parul','In her consulting room',doctors.parul.name,'dr-parul-gupta-close-up',180,225,[180,360]),
 frontage:crop('frontage','Clinic frontage','The clinic seen from Ring Road: a green wall, a blue board with both doctors’ names and the R. K. Medical Centre sign','frontage-from-ring-road',640,360,[640,1280]),
 waiting:crop('waiting','Waiting area','The covered waiting area with rows of chairs, the pharmacy counter and the glass doors','waiting-area-inside-gate',400,500,[400,520,800])
});
Object.assign(clinicPhotos,{
 // The wider "at work" portraits (Meet the doctors, profile covers). Never shown wider than 300 px.
 'at-work-sanjay':crop('at-work-sanjay','In his consulting room',`${doctors.sanjay.name} at his desk in the consulting room, reading from a tablet, with bookshelves behind him`,'dr-sanjay-gupta-at-work',300,375,[300,600]),
 'at-work-parul':crop('at-work-parul','In her consulting room',`${doctors.parul.name} at her desk in the consulting room, reading a patient’s notes`,'dr-parul-gupta-at-work',300,375,[300,600]),
 // Each doctor's room, 3 : 2 (profiles).
 'room-sanjay':crop('room-sanjay',`${doctors.sanjay.name}’s consulting room`,`${doctors.sanjay.name} speaking from behind his desk, with framed certificates and a whiteboard on the wall`,'dr-sanjay-gupta-consulting-room',444,296,[444,888]),
 'room-parul':crop('room-parul',`${doctors.parul.name}’s consulting room`,`${doctors.parul.name} at her desk beside the ultrasound machine, with awards on the window shelf behind her`,'dr-parul-gupta-consulting-room',420,280,[420,840]),
 // The walk through the clinic (About): arriving at the gate, then the glass doors. The waiting area is `waiting`.
 'walk-gate':crop('walk-gate','The gate on Ring Road','The clinic’s gate on Ring Road, under a blue board with both doctors’ names, beside the green wall','gate-under-blue-board',340,425,[340,680]),
 'walk-doors':crop('walk-doors','The glass doors','Glass doors marked with red crosses under a white canopy, with black grille shutters folded back on either side','glass-doors-with-red-crosses',360,450,[360,720])
});
/** The three-quarter arch portraits of the two doctors. */
export const archPortraits={sanjay:'portrait-sanjay',parul:'portrait-parul'};
/** Home's first screen: each doctor at the desk (264 px frames). */
export const deskPortraits={sanjay:'desk-sanjay',parul:'desk-parul'};
/** Home's doctor cards: a closer crop, so the same picture is not shown twice (176 px frames at most). */
export const closePortraits={sanjay:'close-sanjay',parul:'close-parul'};
/** The wider 4 : 5 "at work" portraits (Meet the doctors, profile covers). Never shown wider than 300 px. */
export const workPortraits={sanjay:'at-work-sanjay',parul:'at-work-parul'};
/** The 3 : 2 room picture of each doctor (profiles, "About the doctor"). */
export const roomCrops={sanjay:'room-sanjay',parul:'room-parul'};
/** Small square faces for rows that name a doctor (call rows, strips, booking). Decorative: alt is empty. */
export const doctorAvatars={
 sanjay:{src:'/client-photos/dr-sanjay-gupta-avatar-168.webp',width:168,height:168,alt:''},
 parul:{src:'/client-photos/dr-parul-gupta-avatar-168.webp',width:168,height:168,alt:''}
};

// Paper-cut and studio objects, trimmed to their own outline. Accents only: always decorative.
const object=(name,width,height)=>({src:`/clinic-assets/object-${name}-${width}.webp`,width,height,alt:''});
export const clinicObjects={
 'blood-pressure-cuff':object('blood-pressure-cuff',420,263),
 'desk-calendar':object('desk-calendar',360,325),
 'doppler-probe':object('doppler-probe',420,236),
 'folded-cloth':object('folded-cloth',400,167),
 'glucose-meter':object('glucose-meter',291,360),
 'map-pin':object('map-pin',224,300),
 pen:object('pen',239,360),
 'question-list':object('question-list',324,380),
 'report-clipboard':object('report-clipboard',295,360),
 'stethoscope-general':object('stethoscope-general',273,360),
 'stethoscope-teal':object('stethoscope-teal',420,413),
 'telephone-handset':object('telephone-handset',354,400),
 thermometer:object('thermometer',227,360),
 'ultrasound-probe':object('ultrasound-probe',360,357)
};

// Certificates with their physical frames cropped away, for the site's own frame: all ten.
// Keyed by the certificate's id in certificate-catalogue.mjs; a certificate without an entry
// here would be shown from its catalogue picture.
export const plainCertificates={
 'sanjay-gupta-certificate-08':{src:'/certificates/sanjay-gupta-certificate-08-plain-704.webp',width:704,height:464},
 'sanjay-gupta-certificate-03':{src:'/certificates/sanjay-gupta-certificate-03-plain-460.webp',width:460,height:650},
 'parul-gupta-certificate-01':{src:'/certificates/parul-gupta-certificate-01-plain-708.webp',width:708,height:528},
 'parul-gupta-certificate-02':{src:'/certificates/parul-gupta-certificate-02-plain-710.webp',width:710,height:530},
 'sanjay-gupta-certificate-01':{src:'/certificates/sanjay-gupta-certificate-01-plain-482.webp',width:482,height:660},
 'sanjay-gupta-certificate-06':{src:'/certificates/sanjay-gupta-certificate-06-plain-646.webp',width:646,height:346},
 'sanjay-gupta-certificate-02':{src:'/certificates/sanjay-gupta-certificate-02-plain-648.webp',width:648,height:362},
 'parul-gupta-certificate-05':{src:'/certificates/parul-gupta-certificate-05-plain-644.webp',width:644,height:468},
 'parul-gupta-certificate-03':{src:'/certificates/parul-gupta-certificate-03-plain-692.webp',width:692,height:518},
 // Photographed framed, at an angle and in dim light: straightened and its light evened out, nothing else.
 'parul-gupta-certificate-04':{src:'/certificates/parul-gupta-certificate-04-plain-640.webp',width:640,height:480}
};

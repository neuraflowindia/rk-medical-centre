import {doctors} from './model.mjs';

// Source intake, original hashes, exact crops and encoding choices belong to
// the dated implementation/media-evidence.json, outside the hosted app.
function photo(id,caption,alt,stem,width=1448,height=1086,widths=[480,768,1024,1448]){
 const sources=widths.map(size=>({width:size,src:`/client-photos/${stem}-${size}.webp`}));
 return {id,caption,alt,width,height,src:sources.at(-1).src,sources};
}

export const clinicPhotos={
 'waiting-area':photo('waiting-area','Waiting area','Covered clinic waiting area with seating, glass doors and a counter.','clinic-waiting-area'),
 entrance:photo('entrance','Clinic entrance','Open black gates and the clinic’s glass entrance doors.','clinic-glass-door-entrance'),
 'sanjay-room':photo('sanjay-room',`${doctors.sanjay.name}’s consultation room`,`${doctors.sanjay.name} at his consultation desk, with an examination couch at the left.`,'sanjay-gupta-consultation-room'),
 'parul-room':photo('parul-room',`${doctors.parul.name}’s consultation room`,`${doctors.parul.name} seated at her consultation desk, with awards and an examination curtain behind.`,'parul-gupta-consultation-room'),
 'street-frontage':photo('street-frontage','Clinic frontage','R. K. Medical Centre’s sign and entrance viewed from the street.','clinic-street-frontage'),
 'sanjay-portrait':photo('sanjay-portrait',doctors.sanjay.name,`${doctors.sanjay.name} seated at his consultation desk.`,'sanjay-gupta-at-desk',480,600,[160,320,480]),
 'parul-portrait':photo('parul-portrait',doctors.parul.name,`${doctors.parul.name} seated at her consultation desk.`,'parul-gupta-at-desk',520,650,[160,320,520])
};

export const clinicAlbum=['waiting-area','entrance','sanjay-room','parul-room','street-frontage'];
export const doctorPortraits={sanjay:'sanjay-portrait',parul:'parul-portrait'};
export const doctorRoomPhotos={sanjay:'sanjay-room',parul:'parul-room'};

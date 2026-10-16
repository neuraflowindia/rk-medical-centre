const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS=['Mo','Tu','We','Th','Fr','Sa','Su'];
// Inset inside the blank paper face, in coordinates of the existing 960px export.
const FACE=[[250,340],[718,245],[810,640],[350,770]];
const GRID_WIDTH=480,GRID_HEIGHT=420;

function calendarMonth(now){
 try{
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now);
  const read=type=>Number(parts.find(part=>part.type===type)?.value);
  const year=read('year'),month=read('month'),day=read('day');
  if(Number.isInteger(year)&&year>=1900&&year<=9999&&month>=1&&month<=12&&day>=1&&day<=31)return {year,month,day};
 }catch{}
 // This artwork never supplies appointment availability, including its static fallback.
 return {year:2026,month:1,day:null};
}

function faceTransform(){
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=FACE;
 const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3;
 const dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
 const denominator=dx1*dy2-dx2*dy1;
 const g=(dx3*dy2-dx2*dy3)/denominator,h=(dx1*dy3-dx3*dy1)/denominator;
 const a=x1-x0+g*x1,b=x3-x0+h*x3,d=y1-y0+g*y1,e=y3-y0+h*y3;
 return `matrix3d(${a/GRID_WIDTH},${d/GRID_WIDTH},0,${g/GRID_WIDTH},${b/GRID_HEIGHT},${e/GRID_HEIGHT},0,${h/GRID_HEIGHT},0,0,1,0,${x0},${y0},0,1)`;
}

function grid({year,month,day}){
 const count=new Date(Date.UTC(year,month,0)).getUTCDate();
 const first=(new Date(Date.UTC(year,month-1,1)).getUTCDay()+6)%7;
 const cell=416/7;
 const labels=WEEKDAYS.map((label,index)=>`<text class="ch-date-weekday" x="${32+(index+.5)*cell}" y="111">${label}</text>`).join('');
 const dates=Array.from({length:count},(_,index)=>{
  const position=first+index,x=32+(position%7+.5)*cell,y=164+Math.floor(position/7)*46;
  return `${index+1===day?`<circle class="ch-date-today" cx="${x}" cy="${y}" r="21"/>`:''}<text class="ch-date-day" x="${x}" y="${y}">${index+1}</text>`;
 }).join('');
 return `<svg class="ch-calendar-date-face" viewBox="0 0 ${GRID_WIDTH} ${GRID_HEIGHT}" width="${GRID_WIDTH}" height="${GRID_HEIGHT}" style="transform:${faceTransform()}" aria-hidden="true" focusable="false"><text class="ch-date-month" x="32" y="49">${MONTHS[month-1]}</text><text class="ch-date-year" x="448" y="49">${year}</text><path class="ch-date-rule" d="M32 76H448"/>${labels}${dates}</svg>`;
}

export function mountCalendarDates(calendar){
 if(!calendar)return ()=>{};
 const layer=document.createElement('span');layer.className='ch-calendar-dates';layer.setAttribute('aria-hidden','true');
 const space=document.createElement('span');space.className='ch-calendar-date-space';layer.append(space);calendar.append(layer);
 let previous='';
 const refresh=()=>{
  const value=calendarMonth(new Date()),identity=`${value.year}-${value.month}-${value.day}`;
  space.style.transform=`scale(${calendar.clientWidth/960})`;
  if(identity!==previous){space.innerHTML=grid(value);previous=identity;}
 };
 const foreground=()=>{if(!document.hidden)refresh();};
 refresh();document.addEventListener('visibilitychange',foreground);window.addEventListener('pageshow',foreground);
 return ()=>{document.removeEventListener('visibilitychange',foreground);window.removeEventListener('pageshow',foreground);layer.remove();};
}

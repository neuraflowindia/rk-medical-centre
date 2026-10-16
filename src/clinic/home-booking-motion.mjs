import {E,pose} from './choreography-primitives.mjs';

function quietLoop(c,element,key,cycle=12000){
 if(!element)return;
 c.loop(element,[
  {transform:pose(0,0,0),offset:0},
  {transform:pose(0,-3,1.2),offset:.08},
  {transform:pose(0,0,0),offset:.2},
  {transform:pose(0,0,0),offset:1}
 ],cycle,{easing:'ease-in-out',key,visibilityRoot:c.stage});
}

export function bookingSectionScene(c){
 if(c.id==='H9'){
  c.stage=c.root.querySelector('.section-heading')||c.root;
  c.media=[];
  c.travel(c.root.querySelector('.home-benefit-heading-icon'),0,c.phone?420:500,[[c.phone?0:-12,c.phone?8:0,-8,.9],[0,-1,1,1,.7],[0,0]],E);
  return;
 }
 if(c.id==='H8'){
  c.stage=c.root.querySelector('.home-consultation-art')||c.root;
  c.media=[...c.stage.querySelectorAll('img')];
  const time=value=>value*c.duration/1500;
  const plane=c.root.querySelector('.home-consultation-media-plane');
  const image=c.root.querySelector('.home-consultation-image-entry');
  c.add(plane,[{transform:pose(c.phone?0:20,c.phone?14:0,0,.96),opacity:.3},{transform:pose(),opacity:1}],0,time(350));
  c.travel(image,time(180),time(850),[[c.phone?0:38,c.phone?28:8,c.phone?0:3,.94],[c.phone?0:-3,-2,-.4,1.01,.72],[0,0]],E);
  c.root.querySelectorAll('.home-consultation-support-icon').forEach((mark,index)=>{
   c.travel(mark,time(650+index*140),time(1050+index*100),[[c.phone?0:(index?10:-10),c.phone?9:0,index?6:-6,.86],[0,-1,0,1,.7],[0,0]],E);
  });
  const arrow=c.root.querySelector('.home-consultation-actions .button [aria-hidden]');
  c.add(arrow,[{opacity:.35,transform:pose(-4,0)},{opacity:1,transform:pose()}],time(1000),time(1350));
  quietLoop(c,c.root.querySelector('.home-consultation-support-idle'),'home-consultation-support',14000);
  return;
 }
 if(c.id!=='H9-card')return;
 const art=c.root.querySelector('.home-benefit-art');
 if(!art)return;
 c.stage=art;c.media=[];
 const index=Math.max(0,[...c.root.parentElement.children].indexOf(c.root));
 const shift=c.phone?0:Math.min(index*30,90);
 const time=value=>Math.min(c.duration,(value+shift)*c.duration/1200);
 const part=name=>art.querySelector(`[data-benefit-part="${name}"]`);
 c.add(part('plate'),[{transform:pose(0,5,0,.7),opacity:0},{transform:pose(),opacity:.08}],0,time(250));
 c.travel(part('main'),time(180),time(550),[[c.phone?0:(index%2?28:-28),c.phone?25:10,index%2?4:-4,.91],[c.phone?0:(index%2?-2:2),-2,index%2?-.6:.6,1.01,.72],[0,0]],E);
 c.travel(part('detail'),time(420),time(850),[[c.phone?0:(index%2?-20:20),c.phone?20:-10,index%2?-9:9,.88],[0,-2,index%2?1:-1,1.02,.75],[0,0]],E);
 c.travel(part('symbol'),time(650),time(1050),[[0,-16,index%2?8:-8,.82],[0,1,0,1.03,.75],[0,0]],E);
 c.travel(part('number'),time(650),time(1050),[[c.phone?0:-9,c.phone?8:0,0,.9],[0,-1,0,1,.72],[0,0]],E);
 quietLoop(c,art.querySelector('[data-benefit-idle]'),'home-benefit-'+c.root.dataset.benefit,11500+index*700);
}

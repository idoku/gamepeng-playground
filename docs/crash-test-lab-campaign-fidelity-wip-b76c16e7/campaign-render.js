// Campaign presentation follows the four-level 0.5.3 sample metal/robot direction.
// Each supported mechanism is drawn from its actual collision geometry. Rails,
// cables and warning fixtures are decoration; they never create contact surfaces.
// Coordinates and damage remain owned by Lab; no screenshot assets or physics writes.
const W=420,H=660,TAU=Math.PI*2;
const clawPositions=new WeakMap();
const finite=(...v)=>v.every(Number.isFinite);
const n=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const validGeometry=g=>Boolean(g&&finite(g.x,g.y)&&Math.abs(g.x)<=10000&&Math.abs(g.y)<=10000&&(g.angle===undefined||Number.isFinite(g.angle))&&(g.shape==='circle'?Number.isFinite(g.r)&&g.r>0&&g.r<=2000:g.shape==='rect'&&finite(g.w,g.h)&&g.w>0&&g.h>0&&g.w<=4000&&g.h<=4000));
export function drawCampaign(ctx,lab,{width=W,height=H}={}){
 if(!ctx||!lab||!finite(width,height)||width<=0||height<=0)return;
 const FLOOR=Math.max(0,Math.min(H,n(lab.floor,603)));
 ctx.save();
 try{
 ctx.setTransform(width/W,0,0,height/H,0,0);
 ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.shadowOffsetX=ctx.shadowOffsetY=0;
 const line=(x,y,x2,y2,color,lw=1)=>{if(!finite(x,y,x2,y2,lw))return;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.stroke();};
 const disk=(x,y,r,fill,stroke,lw=1)=>{if(!finite(x,y,r)||r<=0)return;ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}};
 const box=(x,y,w,h,r,fill,stroke,lw=1)=>{if(!finite(x,y,w,h)||w<=0||h<=0)return;ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}};
 const poly=(points,fill,stroke,lw=1)=>{if(!points.length||!points.every(p=>finite(...p)))return;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}};
 const metal=(x,y,w,h,dark=false)=>{if(!finite(x,y,w,h))return dark?'#26323e':'#d9e6e9';const g=ctx.createLinearGradient(x,y,x+w,y+h*.15);g.addColorStop(0,dark?'#17232e':'#839aab');g.addColorStop(.24,dark?'#4e606c':'#f1fafb');g.addColorStop(.58,dark?'#26323e':'#d9e6e9');g.addColorStop(1,dark?'#101922':'#667e8c');return g;};
 const bolt=(x,y,r=2)=>{disk(x,y,r,'#13212b','#657c89',.6);line(x-r*.5,y+r*.4,x+r*.5,y-r*.4,'#9badb5',.6);};
 const stripes=(x,y,w,h)=>{if(!finite(x,y,w,h)||w<=0||h<=0||w>4000||h>4000)return;box(x,y,w,h,1,'#17222c','#3b515a',.7);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(let dx=-h;dx<w;dx+=7)poly([[x+dx,y+h],[x+dx+3,y+h],[x+dx+h+3,y],[x+dx+h,y]],'#c9a527');ctx.restore();};
 // Geometry-local painting keeps rotated blades, bridge leaves and platforms
 // aligned with the engine. Never infer a hazard from its screen height.
 const surface=(g,paint)=>{
  if(!validGeometry(g)||g.shape!=='rect')return;
  ctx.save();
  try{ctx.translate(g.x,g.y);ctx.rotate(n(g.angle));paint(-g.w/2,-g.h/2,g.w,g.h);}
  finally{ctx.restore();}
 };
 const localCircle=(g,angle,paint)=>{
  if(!validGeometry(g)||g.shape!=='circle')return;
  ctx.save();try{ctx.translate(g.x,g.y);ctx.rotate(n(angle));paint(g.r);}finally{ctx.restore();}
 };
 const label=(s,x,y,size=8,color='#d6b92e')=>{
  if(!finite(x,y,size))return;
  ctx.fillStyle=color;ctx.font=`bold ${size}px Arial,sans-serif`;ctx.textAlign='center';ctx.fillText(String(s),x,y);
 };
 const steel=(g,word='',danger=false)=>surface(g,(x,y,w,h)=>{
  box(x,y,w,h,Math.min(3,h/3),metal(x,y,w,h,true),'#617581',.9);
  line(x+2,y+2,x+w-2,y+2,'#afbdc4',.7);
  if(w>12&&h>10){
   box(x+4,y+5,w-8,h-10,1,'#243340','#111d26',.6);
   if(danger)stripes(x+4,y+3,w-8,Math.min(6,h*.22));
   if(w>25){bolt(x+5,y+h-5,1.6);bolt(x+w-5,y+h-5,1.6);}
  }
  if(word&&h>15)label(word,0,Math.min(5,h/2-4),Math.min(10,w/4));
 });
 const strut=(x,y,xx,yy,width=7)=>{
  line(x,y,xx,yy,'#142633',width+2);line(x,y,xx,yy,'#6d818c',width);
  line(x-1,y,xx-1,yy,'#c0cdd1',Math.max(.7,width*.18));
 };
 const stand=(x,y,w,bottom=FLOOR)=>{
  if(!finite(x,y,w,bottom)||w<=0)return;
  poly([[x,y],[x-w/2,bottom-4],[x+w/2,bottom-4]],metal(x-w/2,y,w,bottom-y,true),'#526571',.8);
  line(x,y+7,x-w*.33,bottom-9,'#80949f',1);
  stripes(x-w/2-6,bottom-6,w+12,5);
 };
 const rail=(left,right,y)=>{
  if(!finite(left,right,y))return;
  strut(left,y,right,y,6);
  for(const x of [left,right]){box(x-4,y-11,8,22,2,metal(x-4,y,8,22,true),'#617581',.7);bolt(x,y,2);}
 };
 const dragCue=m=>{
  if(!m.movable||m.held||(m.type==='anvil'&&m.released))return;
  const radius=n(m.r,n(m.h,50)/2),y=Math.max(117,m.y-radius-17);
  box(m.x-25,y-7,50,10,5,'#0a2639','#2586a8',.7);
  label('↔ DRAG TRAP',m.x,y,5,'#65e0ff');
  line(m.x,y+4,m.x,y+10,'#0782a66b',1);
 };
 const spikes=(g,direction)=>surface(g,(x,y,w,h)=>{
  const horizontal=direction==='left'||direction==='right';
  const length=horizontal?h:w,count=Math.max(1,Math.ceil(length/16)),pitch=length/count;
  const root=horizontal?(direction==='right'?x:x+w):(direction==='down'?y:y+h);
  const tip=horizontal?(direction==='right'?x+w:x):(direction==='down'?y+h:y);
  if(horizontal)strut(root,y,root,y+h,3);else strut(x,root,x+w,root,3);
  for(let i=0;i<count;i++){
   const a=(horizontal?y:x)+i*pitch,b=a+pitch*.5,c=a+pitch;
   const points=horizontal?[[root,a],[tip,b],[root,c]]:[[a,root],[b,tip],[c,root]];
   poly(points,metal(x,y,w,h),'#415d6d',.6);
   // Warm cutting edge, as on the four-level sample's saw and guillotine.
   if(horizontal)line(tip,b,root,c,'#9f4b3d',.8);else line(b,tip,c,root,'#9f4b3d',.8);
  }
 });
 const sawDisk=(g,angle)=>localCircle(g,angle,r=>{
  for(let i=0;i<16;i++){
   ctx.save();ctx.rotate(i*TAU/16);
   poly([[r*.76,-r*.16],[r*.98,-r*.12],[r*.87,r*.12],[r*.75,r*.15]],'#4e606c','#111e29',.8);
   line(r*.98,-r*.12,r*.87,r*.12,'#9b4235',1.3);ctx.restore();
  }
  disk(0,0,r*.78,metal(-r,0,r*2,r,true),'#607582',1.2);
  disk(0,0,r*.59,'#131f28','#d2ae29',2);
  disk(0,0,r*.48,metal(-r*.5,0,r,r,true),'#080f17',1);
  disk(0,0,r*.19,'#15202a','#6a7c88',1.5);disk(0,0,r*.095,'#83939b','#0a151e',1);
 });
 const wheelDisk=(g,angle,kind)=>localCircle(g,angle,r=>{
  const spiked=kind==='railWheel'||kind==='spikedWheel',drum=kind==='drum';
  if(spiked){
   const points=Array.from({length:32},(_,i)=>{const a=i*TAU/32,q=r*(i%2?.74:1);return[Math.cos(a)*q,Math.sin(a)*q];});
   poly(points,metal(-r,-r,r*2,r*2),'#97a9b2',.8);
  }else disk(0,0,r,metal(-r,-r,r*2,r*2,true),'#a1b3bd',1.2);
  disk(0,0,r*(spiked?.69:.85),'#172a36','#c0a245',2);
  disk(0,0,r*.63,metal(-r*.6,0,r*1.2,r,true),'#526976',1);
  for(let i=0;i<8;i++){
   const a=i*TAU/8;ctx.save();ctx.rotate(a);
   if(drum){box(r*.79,-3,r*.2,6,1,metal(r*.79,-3,r*.2,6),'#1b303d',.6);}
   else{line(r*.22,0,r*.57,0,'#a1b2b9',3);if(!spiked)box(r*.85,-2,r*.09,4,1,'#d2ae29');}
   ctx.restore();
  }
  disk(0,0,r*.21,metal(-r*.2,0,r*.4,r*.4),'#142733',1);bolt(0,0,Math.max(2,r*.055));
 });
 const chain=(x,y,xx,yy)=>{
  if(!finite(x,y,xx,yy))return;
  line(x,y,xx,yy,'#172b39',4);
  const steps=Math.max(1,Math.min(120,Math.ceil(Math.hypot(xx-x,yy-y)/9))),angle=Math.atan2(yy-y,xx-x);
  for(let i=0;i<=steps;i++){
   const u=i/steps;ctx.save();ctx.translate(x+(xx-x)*u,y+(yy-y)*u);ctx.rotate(angle);
   ctx.beginPath();ctx.ellipse(0,0,4.7,i%2?1.6:3,0,0,TAU);ctx.strokeStyle='#9bafb9';ctx.lineWidth=1.25;ctx.stroke();ctx.restore();
  }
 };
 const spikeDirection=g=>/left/i.test(g.role)?'left':/right/i.test(g.role)?'right':/down/i.test(g.role)?'down':'up';
 const extendedMachine=(m,gs)=>{
  const t=m.type,rects=gs.filter(g=>g.shape==='rect'),circles=gs.filter(g=>g.shape==='circle');
  if(t==='chainBall'){
   const g=circles[0];if(!g)return true;
   chain(m.pivotX,m.pivotY,g.x,g.y);
   box(m.pivotX-18,m.pivotY-10,36,13,3,metal(m.pivotX-18,m.pivotY,36,13,true),'#5d7784');bolt(m.pivotX,m.pivotY-4,2.5);
   localCircle(g,m.angle,r=>{
    disk(0,0,r,metal(-r,-r,r*2,r*2,true),'#8197a3',1.1);
    disk(0,0,r*.75,metal(-r*.7,0,r*1.4,r,true),'#243e4d',1);
    for(const a of [0,Math.PI/2]){ctx.save();ctx.rotate(a);line(-r*.75,0,r*.75,0,'#12222e',5);line(-r*.75,-1,r*.75,-1,'#90a3ad',1);ctx.restore();}
    disk(0,0,r*.2,metal(-r*.2,0,r*.4,r*.4),'#1b2b35',1);bolt(0,0,2.5);
   });
  }else if(['wheel','railWheel','drum','spikedWheel'].includes(t)){
   const g=circles[0];if(!g)return true;
   if(t==='railWheel')rail(m.minX,m.maxX,n(m.railY,g.y+g.r+10));
   if(t==='drum')stand(g.x,g.y+10,g.r*1.4);
   for(const shape of rects)steel(shape);
   for(const shape of circles)wheelDisk(shape,m.angle,t);
  }else if(t==='railSaw'||t==='verticalSaw'){
   const g=circles[0];if(!g)return true;
   if(t==='verticalSaw'){
    for(const dx of [-20,20])strut(g.x+dx,n(m.minY,g.y)-12,g.x+dx,n(m.maxY,g.y)+25,5);
    box(g.x-32,n(m.maxY,g.y)+23,64,10,2,metal(g.x-32,g.y,64,10,true),'#617581');
    box(g.x-27,g.y-9,54,18,3,metal(g.x-27,g.y,54,18,true),'#617581');
   }else{
    const railY=n(m.railY,g.y+g.r+22);rail(m.minX,m.maxX,railY);
    strut(g.x,railY,g.x,g.y,6);box(g.x-17,railY-8,34,16,3,metal(g.x-17,railY,34,16,true),'#617581');
    for(const dx of [-11,11])disk(g.x+dx,railY,3,'#152735','#97abb5',.7);
   }
   sawDisk(g,m.angle);
  }else if(t==='piston'){
   const anchor=m.side==='right'?W-12:12;
   for(const g of rects){
    for(const dy of [-g.h*.25,g.h*.25])strut(anchor,g.y+dy,g.x,g.y+dy,5);
    box(anchor-8,g.y-g.h*.65,16,g.h*1.3,2,metal(anchor-8,g.y,16,g.h*1.3,true),'#617581');
    steel(g,'20T',true);
   }
  }else if(t==='press'){
   const plate=rects.find(g=>g.role==='topPlate')||rects[0];if(!plate)return true;
   const top=Math.min(n(m.frameTop,184),n(m.minY,plate.y)-30),w=plate.w;
   for(const x of [m.x-w/2-10,m.x+w/2+10])strut(x,top,x,FLOOR,7);
   box(m.x-w/2-20,top-4,w+40,17,3,metal(m.x-w/2-20,top,w+40,17,true),'#617581');
   stripes(m.x-w/2-15,top+6,w+30,5);
   strut(m.x,top+13,plate.x,plate.y-plate.h/2,5);
   for(const g of rects)steel(g,g.role==='topPlate'?(m.label||'PRESS'):'',true);
  }else if(t==='electric'){
   for(const g of rects){
    if(g.role!=='electric'){steel(g);disk(g.x,g.y-g.h/2+4,3,m.active?'#78efff':'#367688');continue;}
    surface(g,(x,y,w,h)=>{
     box(x,y+h,w,8,2,metal(x,y,w,8,true),'#617581');stripes(x+3,y+h+2,w-6,4);
     const active=Boolean(m.active),phase=Math.floor(n(lab.time)*12);
     for(const xx of [x+3,x+w-3]){box(xx-4,y-5,8,h+7,2,metal(xx-4,y,8,h+7),'#395561');disk(xx,y,3,active?'#78efff':'#367688');}
     // Idle electrodes stay visible; energized jagged arcs track actual active state.
     if(active){
      ctx.save();ctx.shadowColor='#00dfff';ctx.shadowBlur=7;
      const points=[[x+5,0]];
      for(let i=1;i<=11;i++)points.push([x+w*i/12,Math.sin(i*8.8+phase)*h*.4]);
      points.push([x+w-5,0]);
      for(let i=1;i<points.length;i++)line(...points[i-1],...points[i],'#a6f4ff',1.5);
      ctx.restore();
     }else line(x+5,0,x+w-5,0,'#194654',.7);
    });
   }
  }else if(['spikeWall','spikeBed','spikeBay','inwardSpikes'].includes(t)){
   if(t==='spikeWall'&&m.travel){
    const home=n(m.homeX,m.x),end=n(m.railEndX,home-n(m.travel)),w=n(m.w,22);
    rail(Math.min(home,end)-w/2,Math.max(home,end)+w/2,n(m.railY,FLOOR-3));
    disk(m.x,m.y-n(m.h)/2-7,2.5,lab.engaged?'#c96145':'#493a36');
   }
   if(t==='spikeBay'){
    // Open decorative uprights are deliberately behind the contact geometry.
    const bed=rects.find(g=>g.role==='spikesUp');
    if(bed)for(const side of [-1,1])strut(bed.x+side*bed.w/2,n(m.crossbarY,bed.y-120),bed.x+side*bed.w/2,bed.y+bed.h/2,5);
   }
   for(const g of rects){
    if(g.hazard)spikes(g,spikeDirection(g));
    else{steel(g,'',g.role==='column');if(g.role==='column')surface(g,(x,y,w,h)=>box(x-4,y+h,w+8,5,1,'#2c414e','#617581',.7));}
   }
  }else if(t==='springSpikes'){
   const spring=rects.find(g=>g.role==='spring'),ceiling=rects.find(g=>g.role==='spikesDown');
   if(ceiling){
    const top=Math.min(126,ceiling.y-50);
    for(const dx of [-ceiling.w*.3,ceiling.w*.3])strut(ceiling.x+dx,top,ceiling.x+dx,ceiling.y-ceiling.h/2,4);
    box(ceiling.x-ceiling.w/2,top-4,ceiling.w,9,2,metal(ceiling.x,top,ceiling.w,9,true),'#617581');spikes(ceiling,'down');
   }
   if(spring){
    const bottom=Math.max(spring.y+spring.h/2+4,FLOOR-5),start=spring.y+spring.h/2;
    const points=[[spring.x-spring.w*.2,start]];
    for(let i=1;i<=7;i++)points.push([spring.x+(i%2?1:-1)*spring.w*.2,start+(bottom-start)*i/7]);
    for(let i=1;i<points.length;i++)strut(...points[i-1],...points[i],1.6);
    box(spring.x-spring.w*.3,bottom,spring.w*.6,4,1,'#405664','#7f929d',.7);
    steel(spring,'',true);surface(spring,()=>{label('↑',0,3,10,'#65e0ff');});
   }
  }else if(t==='conveyor'){
   for(const g of rects)surface(g,(x,y,w,h)=>{
    box(x,y,w,h,Math.min(h/2,8),metal(x,y,w,h,true),'#7c929e',1);
    line(x+8,y+2,x+w-8,y+2,'#bacbd2',1.2);
    const direction=n(g.beltSpeed,n(m.speed,95))<0?-1:1,shift=lab.engaged?direction*((n(lab.time)*27)%22):0;
    for(let u=x+12;u<x+w-6;u+=22){const xx=u+shift;if(xx>x+w-7||xx<x+5)continue;line(xx-4*direction,3,xx+2*direction,-1,'#d6b92e',1.5);line(xx+2*direction,-1,xx-4*direction,-5,'#d6b92e',1.5);}
    for(const u of [x+8,x+w-8]){disk(u,0,Math.min(5,h*.3),metal(u-4,0,8,8),'#192e3b',.7);bolt(u,0,1.5);}
   });
  }else if(t==='cleavers'||t==='pivotBlade'){
   const px=n(m.pivotX,m.x),py=n(m.pivotY,m.y);
   if(t==='cleavers'){strut(px,95,px,py,5);box(px-22,90,44,10,2,metal(px-22,90,44,10,true),'#617581');}
   else stand(px,py,55);
   for(const g of rects)surface(g,(x,y,w,h)=>{
    box(x,y,w,h,2,metal(x,y,w,h),'#35505e',.8);
    line(x,y+h-1,x+w,y+h-1,'#9f4b3d',2);
    line(x+3,y+3,x+w-3,y+3,'#eef8fa',1);
    const center=t==='cleavers'?0:-w/2;
    box(center-3,y+3,6,h-6,1,'#3e5461');
    for(const side of [-1,1])bolt(side*w*.34,0,Math.min(2,h*.12));
   });
   disk(px,py,8,metal(px-8,py,16,16,true),'#91a6b0',.8);bolt(px,py,3);
  }else if(t==='upPiston'){
   for(const g of rects){
    const stopper=g.role==='impactStop';
    for(const dx of [-g.w*.3,g.w*.3])strut(g.x+dx,stopper?185:FLOOR,g.x+dx,g.y,stopper?4:6);
    steel(g,stopper?'IMPACT STOP':'',true);
    if(!stopper)surface(g,()=>label('↑',0,4,10,'#65e0ff'));
   }
  }else if(t==='crusher'){
   for(const g of rects){
    const anchor=g.role==='leftCrusher'?0:W;
    for(const dy of [-g.h*.3,g.h*.3])strut(anchor,g.y+dy,g.x,g.y+dy,6);
    steel(g,'60T',true);
    surface(g,(x,y,w,h)=>{disk(0,y+19,3,m.warning?'#eb7950':'#493a36');const side=g.role==='leftCrusher'?1:-1;line(side*(w/2-2),y+3,side*(w/2-2),y+h-3,'#9f4b3d',2);});
   }
  }else if(t==='barrier'){
   const railY=n(m.railY,180),left=n(m.minX,70),right=n(m.maxX,350);
   for(const x of [left,right])strut(x,110,x,railY,6);rail(left,right,railY);
   for(const g of rects){strut(g.x,railY,g.x,g.y-g.h/2,2);box(g.x-12,railY-6,24,13,3,metal(g.x-12,railY,24,13,true),'#617581');steel(g,'',true);}
  }else if(['bridge','pivotPlatform','tiltPlatform','swingPlatform'].includes(t)){
   const px=n(m.pivotX,m.x),py=n(m.pivotY,m.y);
   if(t==='swingPlatform'){
    const deck=rects.find(g=>g.role==='swingPlatform');
    if(deck){strut(px-deck.w*.38-20,py-8,px+deck.w*.38+20,py-8,7);for(const dx of [-deck.w*.38,deck.w*.38])strut(px+dx,py,deck.x+Math.cos(n(deck.angle))*dx,deck.y+Math.sin(n(deck.angle))*dx,1.5);}
   }
   if(t==='pivotPlatform'||t==='tiltPlatform')stand(px,py,t==='tiltPlatform'?90:32);
   for(const g of rects){
    if(g.role==='support'){steel(g);continue;}
    if(g.role==='scaffold'){
     surface(g,(x,y,w,h)=>{box(x,y,w,12,2,metal(x,y,w,12,true),'#617581');for(const dx of [x+7,x+w-7])strut(dx,y,dx,y+h,5);strut(x+7,y+12,x+w-7,y+h,2);strut(x+w-7,y+12,x+7,y+h,2);});continue;
    }
    if(g.hazard){spikes(g,spikeDirection(g));continue;}
    surface(g,(x,y,w,h)=>{
     box(x,y,w,h,3,metal(x,y,w,h,true),'#8fa7b2',.9);line(x+2,y+1,x+w-2,y+1,'#c3d4da',1);
     if(t==='tiltPlatform'){for(const side of [-1,1]){line(side*12,2,side*22,-2,'#d6b92e',1.5);line(side*22,-2,side*12,-6,'#d6b92e',1.5);}}
     else{stripes(x+3,y+3,w-6,Math.min(6,h-6));if(t==='pivotPlatform')box(x+3,y+3,w*.22,Math.min(6,h-6),1,'#42c2d8');}
     for(const u of [x+5,x+w-5])bolt(u,y+h-4,1.4);
    });
   }
   if(t==='pivotPlatform'||t==='tiltPlatform'){disk(px,py,6,metal(px-6,py,12,12),'#1a3441',1);bolt(px,py,2.5);}
   if(t==='bridge')for(const x of [m.hingeLeft,m.hingeRight]){disk(x,m.y,5,metal(x-5,m.y,10,10),'#19323f',.7);bolt(x,m.y,2);}
  }else return false;
  dragCue(m);return true;
 };
 // Almost invisible vertical wall seams and broad blue illumination, not a grid.
 const bg=ctx.createLinearGradient(0,0,W,0);bg.addColorStop(0,'#091b2a');bg.addColorStop(.48,'#0b2c3f');bg.addColorStop(1,'#071725');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(205,320,10,205,320,350);glow.addColorStop(0,'#10506b65');glow.addColorStop(.65,'#0d38552b');glow.addColorStop(1,'#06101a00');ctx.fillStyle=glow;ctx.fillRect(0,0,W,FLOOR);
 for(const [x,a] of [[68,.025],[137,.034],[242,.032],[315,.023]]){ctx.fillStyle=`rgba(69,144,174,${a})`;ctx.fillRect(x,0,2,FLOOR);line(x+2,95,x+2,FLOOR-28,'#06132125',1);}
 for(const y of [82,220,420]){line(69,y,137,y,'#3974860a');line(243,y+30,314,y+30,'#3974860a');}
 const floor=ctx.createLinearGradient(0,FLOOR,0,H);floor.addColorStop(0,'#07151e');floor.addColorStop(1,'#03090f');ctx.fillStyle=floor;ctx.fillRect(0,FLOOR,W,H-FLOOR);
 const floorGlow=ctx.createLinearGradient(0,FLOOR-9,0,FLOOR+15);floorGlow.addColorStop(0,'#00dfff00');floorGlow.addColorStop(.4,'#00ddff33');floorGlow.addColorStop(1,'#00b9e800');ctx.fillStyle=floorGlow;ctx.fillRect(0,FLOOR-9,W,24);line(0,FLOOR,W,FLOOR,'#00c8e5',.75);
 // The narrow cyan landing halo is visible around the source robot's feet.
 const spawnX=lab.level?.spawn?.x;
 if(finite(spawnX)){ctx.beginPath();ctx.ellipse(spawnX,FLOOR+1,41,3.5,0,0,TAU);ctx.strokeStyle='#00b8da55';ctx.lineWidth=.7;ctx.stroke();}
 for(const m of Array.isArray(lab.machines)?lab.machines:[]){
 if(!m||!finite(m.x,m.y)||Math.abs(m.x)>10000||Math.abs(m.y)>10000)continue;
 const gs=Array.isArray(m.geometry)?m.geometry.filter(validGeometry):[];
 if(!gs.length)continue;
 if(extendedMachine(m,gs))continue;
 if(m.type==='saw'){
 const shape=gs.find(g=>g.shape==='circle');if(!shape)continue;
 const r=shape.r,x=shape.x,y=shape.y;
 // Canonical sample saw geometry shares the machine centre; off-centre test or
 // future source shapes still draw at their true world-space contact centre.
 for(const g of gs)if(g.role==='support'&&finite(g.x,g.y,g.w,g.h))box(g.x-g.w/2,g.y-g.h/2,g.w,g.h,1,metal(g.x-g.w/2,g.y,g.w,g.h,true),'#536471',.7);
 poly([[x-r*.65,FLOOR-4],[x-r*.37,y+r*.36],[x+r*.37,y+r*.36],[x+r*.65,FLOOR-4]],metal(x-r*.6,y,r*1.2,r,true),'#526571',.8);
 stripes(x-r*1.25,FLOOR-6,r*2.5,5);
 ctx.save();ctx.translate(x,y);ctx.rotate(n(m.angle));
 for(let i=0;i<16;i++){const a=i*TAU/16;ctx.save();ctx.rotate(a);poly([[r*.76,-r*.16],[r*.98,-r*.12],[r*.87,r*.12],[r*.75,r*.15]],'#4e606c','#111e29',.8);line(r*.98,-r*.12,r*.87,r*.12,'#9b4235',1.3);ctx.restore();}
 disk(0,0,r*.78,metal(-r,0,r*2,r,true),'#607582',1.2);disk(0,0,r*.59,'#131f28','#d2ae29',2);disk(0,0,r*.48,metal(-r*.5,0,r,r,true),'#080f17',1);disk(0,0,r*.19,'#15202a','#6a7c88',1.5);disk(0,0,r*.095,'#83939b','#0a151e',1);ctx.restore();
 if(m.powered){box(m.x+25,FLOOR-56,37,52,4,metal(m.x+25,FLOOR-56,37,52,true),'#617581');disk(m.x+44,FLOOR-43,3,'#3adaef');stripes(m.x+29,FLOOR-15,29,6);line(m.x+25,FLOOR-37,m.x,FLOOR-37,'#667e8c',3);}
 }else if(m.type==='guillotine'){
 const g=(gs).find(g=>g.role==='blade');if(!g||!finite(g.w,g.h))continue;
 const left=m.x-g.w/2-13,right=m.x+g.w/2+13,top=n(m.frameTop,125);
 for(const x of [left,right]){box(x-3.5,top,7,FLOOR-top,1,metal(x-3.5,top,7,FLOOR-top),'#405669',.8);line(x-1,top+12,x-1,FLOOR-8,'#c4ced1',1);box(x-8,FLOOR-6,16,6,1,'#273c49');}
 box(left-9,top-2,right-left+18,22,3,metal(left-9,top,right-left+18,22,true),'#20323f');stripes(left-6,top+14,right-left+12,5);disk(m.x,top+9,2.1,'#8d3e35');line(m.x,top+21,m.x,g.y-g.h/2,'#798d9a',1);

 ctx.save();ctx.translate(g.x,g.y);ctx.rotate(n(g.angle));poly([[-g.w/2,-g.h/2],[g.w/2,-g.h/2],[g.w/2,g.h/2-g.h*.4],[-g.w/2,g.h/2]],metal(-g.w/2,0,g.w,g.h),'#172c3b',1.2);line(-g.w/2,g.h/2,g.w/2,g.h/2-g.h*.4,'#9f4b3d',2);box(-g.w/2,-g.h/2,g.w,13,2,metal(-g.w/2,-g.h/2,g.w,13,true),'#2c4250',.6);for(const x of [-g.w*.4,0,g.w*.4])bolt(x,-g.h/2+6,1.6);ctx.restore();
 }else if(m.type==='anvil'){
 const g=(gs).find(g=>g.role==='anvil');if(!g||!finite(g.w,g.h)||g.w<=0||g.h<=0)continue;
 const released=Boolean(m.released&&!m.held);
 if(!released||!clawPositions.has(m))clawPositions.set(m,{x:m.x,y:n(m.homeY,m.y)});
 const support=clawPositions.get(m),top=support.y-g.h/2,cy=top-18;
 if(m.returning)line(support.x,cy,m.x,m.y-g.h/2,'#9caeb9',1.4);
 line(support.x,0,support.x,cy,'#243b4b',3);line(support.x-.8,0,support.x-.8,cy,'#a1aeb7',1);
 box(support.x-16,cy-8,32,12,3,metal(support.x-16,cy,32,12,true),'#5d7784',1);
 if(m.returning)disk(support.x,cy-3,2.5,'#35ecff');
 for(const side of [-1,1]){const ex=support.x+side*(released?32:30),ey=cy+(released?3:12),tx=support.x+side*(released?40:25);line(support.x+side*12,cy,ex,ey,'#152735',6);line(support.x+side*12,cy,ex,ey,'#8b9da7',3);line(ex,ey,tx,top+(released?-15:2),'#8b9da7',3);bolt(support.x+side*12,cy,2.5);}
 ctx.save();ctx.translate(g.x,g.y);ctx.rotate(n(g.angle));ctx.scale(g.w/90,g.h/46);poly([[-45,-23],[45,-23],[43,-12],[22,-7],[20,13],[32,19],[32,23],[-32,23],[-32,18],[-21,13],[-21,-7],[-35,-10]],metal(-45,-23,90,46,true),'#637482',1);line(-40,-19,40,-19,'#93a1aa',1);stripes(-32,18,64,5);ctx.fillStyle='#d6b92e';ctx.font='bold 6px Arial,sans-serif';ctx.textAlign='center';ctx.fillText('800 KG',0,5);ctx.restore();
 if(m.movable&&!released&&!m.held){const l=m.x-g.w/2-7,r=m.x+g.w/2+7,t=m.y-g.h/2-6,b=m.y+g.h/2+6;for(const [x,d] of [[l,1],[r,-1]]){line(x,t,x+d*10,t,'#0782a66b',1.5);line(x,t,x,t+9,'#0782a66b',1.5);line(x,b,x+d*10,b,'#0782a66b',1.5);line(x,b,x,b-9,'#0782a66b',1.5);}box(m.x-25,t-13,50,10,5,'#0a2639','#2586a8',.7);ctx.fillStyle='#65e0ff';ctx.font='5px Arial,sans-serif';ctx.textAlign='center';ctx.fillText('↔ DRAG TRAP',m.x,t-6);}
 }else if(m.type==='pendulum'){
 if(!finite(m.pivotX,m.pivotY))continue;
 line(m.pivotX,0,m.pivotX,m.pivotY,'#627b89',8);line(m.pivotX-2,0,m.pivotX-2,m.pivotY,'#afbdc4',2);box(m.pivotX-16,m.pivotY-11,32,20,5,metal(m.pivotX-16,m.pivotY,32,20,true),'#203441');line(m.pivotX,m.pivotY,m.x,m.y,'#0d1c29',8);line(m.pivotX-1,m.pivotY,m.x-1,m.y,'#657985',4);line(m.pivotX-2,m.pivotY,m.x-2,m.y,'#a5b2b8',1);line(m.pivotX+(m.x-m.pivotX)*.48,m.pivotY+(m.y-m.pivotY)*.48,m.pivotX+(m.x-m.pivotX)*.51,m.pivotY+(m.y-m.pivotY)*.51,'#1c2c36',9);disk(m.pivotX,m.pivotY,7,metal(m.pivotX-7,m.pivotY,14,14,true),'#708590',1);bolt(m.pivotX,m.pivotY,3);
 for(const g of gs){if(!finite(g.x,g.y,g.w,g.h)||g.w<=0||g.h<=0)continue;ctx.save();ctx.translate(g.x,g.y);ctx.rotate(n(g.angle));box(-g.w/2,-g.h/2,g.w,g.h,3,metal(-g.w/2,0,g.w,g.h,true),'#617581',1);box(-g.w/2+5,-g.h/2+5,g.w-10,g.h-10,1,'#243340','#111d26',1);for(const x of [-g.w/2+5,g.w/2-5]){box(x-3,-g.h/2,6,g.h,1,'#566976');bolt(x,-g.h/2+5,1.7);bolt(x,g.h/2-5,1.7);}stripes(-g.w/2+9,-4,g.w-18,9);ctx.restore();}
 }
 }
 // Each semantic limb gets its own mechanical segments; all follow its actual angle.
 const joint=(x,y,r)=>{disk(x,y,r,'#101c27','#dec05c',1);disk(x,y,r*.64,metal(x-r,y,r*2,r*2),'#284451',.65);disk(x,y,r*.25,'#15313e','#54abc1',.5);};
 for(const j of Array.isArray(lab.joints)?lab.joints:[]){if(!j)continue;const a=lab.parts?.[j.a],b=lab.parts?.[j.b];if(!a||!b||b.broken||!finite(a.x,a.y,b.x,b.y))continue;const point=(p,anchor)=>{const angle=n(p.angle),x=n(anchor?.[0]),y=n(anchor?.[1]);return{x:p.x+x*Math.cos(angle)-y*Math.sin(angle),y:p.y+x*Math.sin(angle)+y*Math.cos(angle)};};const p=point(a,j.anchorA),q=point(b,j.anchorB);line(p.x,p.y,q.x,q.y,'#13212a',4);line(p.x,p.y,q.x,q.y,'#c0a458',1.8);}
 for(const p of Array.isArray(lab.parts)?lab.parts:[]){
 if(!p||!finite(p.x,p.y,p.rx,p.ry)||p.rx<=0||p.ry<=0)continue;
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(n(p.angle));
 const rx=p.rx,ry=p.ry,damaged=n(p.damage)>.35,silver=metal(-rx,-ry,rx*2,ry*2);
 ctx.shadowColor='#0009';ctx.shadowBlur=3;ctx.shadowOffsetY=1.5;
 if(p.name==='head'){
 box(-rx,-ry,rx*2,ry*2,rx*.72,silver,'#607987',.85);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.beginPath();ctx.ellipse(0,ry*.12,rx*.82,ry*.44,0,0,TAU);ctx.fillStyle=damaged?'#0b1118':'#061721';ctx.fill();ctx.strokeStyle='#577f8b';ctx.lineWidth=.8;ctx.stroke();
 ctx.shadowColor=damaged?'#ff803a':'#00dbff';ctx.shadowBlur=4;
 for(const x of [-rx*.39,rx*.39]){if(damaged){line(x-rx*.16,-ry*.08,x+rx*.16,ry*.2,'#e98d55',1.3);line(x+rx*.16,-ry*.08,x-rx*.16,ry*.2,'#e98d55',1.3);}else box(x-rx*.18,-ry*.06,rx*.36,ry*.19,1,'#43e2ff');}ctx.shadowBlur=0;
 line(-rx*.22,ry*.75,rx*.22,ry*.75,'#526e7b',1);
 for(const side of [-1,1]){box(side*rx-rx*.1,-ry*.1,rx*.2,ry*.45,1,'#344b58','#c5ae54',.6);disk(side*(rx+1),-ry*.04,1,'#e4bd42');}
 line(0,-ry,0,-ry-3,'#acbfc8',1);disk(0,-ry-3.5,1.7,'#e1bc47');box(-rx*.12,-ry+2,rx*.24,ry*.31,1,'#edd16c');
 }else if(p.name==='body'){
 poly([[-rx,-ry*.82],[-rx*.63,-ry],[rx*.63,-ry],[rx,-ry*.82],[rx*.8,ry*.4],[rx*.5,ry],[-rx*.5,ry],[-rx*.8,ry*.4]],silver,'#75939f',.8);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 box(-rx*.65,-ry*.7,rx*1.3,ry*.7,3,'#1c4253','#7facb8',.7);box(-rx*.4,-ry*.57,rx*.8,ry*.39,2,'#0786ab','#75ecff',.7);line(-rx*.27,-ry*.45,rx*.27,-ry*.45,'#62ecff',1);
 stripes(-rx*.86,-ry*.02,rx*1.72,3.7);poly([[-rx*.55,ry*.1],[rx*.55,ry*.1],[rx*.3,ry*.7],[-rx*.3,ry*.7]],'#0e2838','#d5b754',1);disk(0,ry*.3,rx*.17,'#4ce3ff');
 for(const side of [-1,1]){line(side*rx*.8,-ry*.18,side*rx*.65,ry*.65,'#7b939e',1);bolt(side*rx*.64,-ry*.84,1);}
 if(p.coreDestroyed){line(-rx*.6,-ry*.5,rx*.4,ry*.5,'#21353e',2);line(rx*.5,-ry*.5,-rx*.4,ry*.6,'#21353e',2);}
 }else{
 const leg=String(p.name).includes('leg');
 box(-rx*.75,-ry,rx*1.5,ry*2,rx*.45,'#223c4b','#91aab5',.8);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 box(-rx,-ry+1,rx*2,ry*.79,rx*.48,silver,'#6c8997',.8);
 box(-rx*.93,-ry*.03,rx*1.86,ry*.93,rx*.45,silver,'#7895a1',.8);
 joint(0,-ry*.65,Math.min(rx*.7,ry*.29));joint(0,ry*.11,Math.min(rx*.68,ry*.26));
 line(-rx*.5,ry*.38,-rx*.5,ry*.68,'#edf8fb',1);line(rx*.5,ry*.38,rx*.5,ry*.68,'#6b8c9b',1);
 if(leg){box(-rx*.98,ry*.8,rx*2.15,ry*.25,2,'#1b2c36','#b0bdc2',.7);line(-rx*.9,ry*1.04,rx*1.08,ry*1.04,'#d2b03f',1.5);}else{box(-rx*.77,ry*.75,rx*1.54,ry*.26,2,silver,'#506d7d',.8);line(0,ry*.87,0,ry,'#557b8d',.7);}
 }
 if(damaged){ctx.globalAlpha=Math.min(.65,n(p.damage)*.45);poly([[-rx*.65,-ry*.35],[-rx*.1,-ry*.13],[-rx*.35,ry*.1],[rx*.4,ry*.43],[rx*.1,ry*.02],[rx*.55,-ry*.4]],'#21313b');ctx.globalAlpha=1;}
 ctx.restore();
 // Smoke is visual feedback only, and drifts upward in world space after contact.
 if(damaged&&finite(lab.time,p.contactAt)&&lab.time-p.contactAt<2.4){ctx.save();for(let i=0;i<3;i++){const phase=((lab.time*.72+i/3)%1+1)%1;ctx.globalAlpha=(1-phase)*.19;disk(p.x+Math.sin(i*2.7+lab.time)*4,p.y-p.ry-phase*29,2+phase*6,'#6e818c');}ctx.restore();}
 }
 for(const f of Array.isArray(lab.effects)?lab.effects:[]){if(!f||!finite(f.x,f.y,f.vx,f.vy,f.life)||f.life<=0)continue;ctx.globalAlpha=Math.min(1,f.life/.18);line(f.x,f.y,f.x-f.vx*.022,f.y-f.vy*.022,'#ffd079',1.2);}
 }finally{ctx.restore();}
}

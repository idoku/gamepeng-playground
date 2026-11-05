// Procedural source-study presentation for the first four challenges.
// Coordinates and damage remain owned by Lab; no screenshot assets or physics writes.
const W=420,H=660,TAU=Math.PI*2;
const clawPositions=new WeakMap();
const finite=(...v)=>v.every(Number.isFinite);
const n=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
export function drawFidelity(ctx,lab,{width=W,height=H}={}){
 if(!ctx||!lab||!finite(width,height)||width<=0||height<=0)return;
 const FLOOR=n(lab.floor,603);
 ctx.save();
 try{
 ctx.setTransform(width/W,0,0,height/H,0,0);
 ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.shadowOffsetX=ctx.shadowOffsetY=0;
 const line=(x,y,x2,y2,color,lw=1)=>{if(!finite(x,y,x2,y2,lw))return;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.stroke();};
 const disk=(x,y,r,fill,stroke,lw=1)=>{if(!finite(x,y,r)||r<=0)return;ctx.beginPath();ctx.arc(x,y,r,0,TAU);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}};
 const box=(x,y,w,h,r,fill,stroke,lw=1)=>{if(!finite(x,y,w,h)||w<=0||h<=0)return;ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}};
 const poly=(points,fill,stroke,lw=1)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}};
 const metal=(x,y,w,h,dark=false)=>{const g=ctx.createLinearGradient(x,y,x+w,y+h*.15);g.addColorStop(0,dark?'#17232e':'#839aab');g.addColorStop(.24,dark?'#4e606c':'#f1fafb');g.addColorStop(.58,dark?'#26323e':'#d9e6e9');g.addColorStop(1,dark?'#101922':'#667e8c');return g;};
 const bolt=(x,y,r=2)=>{disk(x,y,r,'#13212b','#657c89',.6);line(x-r*.5,y+r*.4,x+r*.5,y-r*.4,'#9badb5',.6);};
 const stripes=(x,y,w,h)=>{box(x,y,w,h,1,'#17222c','#3b515a',.7);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(let dx=-h;dx<w;dx+=7)poly([[x+dx,y+h],[x+dx+3,y+h],[x+dx+h+3,y],[x+dx+h,y]],'#c9a527');ctx.restore();};
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
 for(const m of lab.machines||[]){
 if(!m||!finite(m.x,m.y))continue;
 if(m.type==='saw'){
 const r=n(m.r,35);if(r<=0)continue;
 for(const g of m.geometry||[])if(g.role==='support'&&finite(g.x,g.y,g.w,g.h))box(g.x-g.w/2,g.y-g.h/2,g.w,g.h,1,metal(g.x-g.w/2,g.y,g.w,g.h,true),'#536471',.7);
 poly([[m.x-r*.65,FLOOR-4],[m.x-r*.37,m.y+r*.36],[m.x+r*.37,m.y+r*.36],[m.x+r*.65,FLOOR-4]],metal(m.x-r*.6,m.y,r*1.2,r,true),'#526571',.8);
 stripes(m.x-r*1.25,FLOOR-6,r*2.5,5);
 ctx.save();ctx.translate(m.x,m.y);ctx.rotate(n(m.angle));
 for(let i=0;i<16;i++){const a=i*TAU/16;ctx.save();ctx.rotate(a);poly([[r*.76,-r*.16],[r*.98,-r*.12],[r*.87,r*.12],[r*.75,r*.15]],'#4e606c','#111e29',.8);line(r*.98,-r*.12,r*.87,r*.12,'#9b4235',1.3);ctx.restore();}
 disk(0,0,r*.78,metal(-r,0,r*2,r,true),'#607582',1.2);disk(0,0,r*.59,'#131f28','#d2ae29',2);disk(0,0,r*.48,metal(-r*.5,0,r,r,true),'#080f17',1);disk(0,0,r*.19,'#15202a','#6a7c88',1.5);disk(0,0,r*.095,'#83939b','#0a151e',1);ctx.restore();
 }else if(m.type==='guillotine'){
 const g=(m.geometry||[]).find(g=>g.role==='blade');if(!g||!finite(g.w,g.h))continue;
 const left=m.x-g.w/2-13,right=m.x+g.w/2+13,top=n(m.frameTop,125);
 for(const x of [left,right]){box(x-3.5,top,7,FLOOR-top,1,metal(x-3.5,top,7,FLOOR-top),'#405669',.8);line(x-1,top+12,x-1,FLOOR-8,'#c4ced1',1);box(x-8,FLOOR-6,16,6,1,'#273c49');}
 box(left-9,top-2,right-left+18,22,3,metal(left-9,top,right-left+18,22,true),'#20323f');stripes(left-6,top+14,right-left+12,5);disk(m.x,top+9,2.1,'#8d3e35');line(m.x,top+21,m.x,g.y-g.h/2,'#798d9a',1);
 
 ctx.save();ctx.translate(g.x,g.y);ctx.rotate(n(g.angle));poly([[-g.w/2,-g.h/2],[g.w/2,-g.h/2],[g.w/2,g.h/2-g.h*.4],[-g.w/2,g.h/2]],metal(-g.w/2,0,g.w,g.h),'#172c3b',1.2);line(-g.w/2,g.h/2,g.w/2,g.h/2-g.h*.4,'#9f4b3d',2);box(-g.w/2,-g.h/2,g.w,13,2,metal(-g.w/2,-g.h/2,g.w,13,true),'#2c4250',.6);for(const x of [-g.w*.4,0,g.w*.4])bolt(x,-g.h/2+6,1.6);ctx.restore();
 }else if(m.type==='anvil'){
 const g=(m.geometry||[]).find(g=>g.role==='anvil');if(!g||!finite(g.w,g.h)||g.w<=0||g.h<=0)continue;
 const released=Boolean(m.released&&!m.held);
 if(!released||!clawPositions.has(m))clawPositions.set(m,{x:m.x,y:n(m.homeY,m.y)});
 const support=clawPositions.get(m),top=support.y-g.h/2,cy=top-18;
 if(m.returning)line(support.x,cy,m.x,m.y-g.h/2,'#9caeb9',1.4);
 line(support.x,0,support.x,cy,'#243b4b',3);line(support.x-.8,0,support.x-.8,cy,'#a1aeb7',1);
 box(support.x-16,cy-8,32,12,3,metal(support.x-16,cy,32,12,true),'#5d7784',1);
 if(m.returning)disk(support.x,cy-3,2.5,'#35ecff');
 for(const side of [-1,1]){const ex=support.x+side*(released?32:30),ey=cy+(released?3:12),tx=support.x+side*(released?40:25);line(support.x+side*12,cy,ex,ey,'#152735',6);line(support.x+side*12,cy,ex,ey,'#8b9da7',3);line(ex,ey,tx,top+(released?-15:2),'#8b9da7',3);bolt(support.x+side*12,cy,2.5);}
 ctx.save();ctx.translate(g.x,g.y);ctx.rotate(n(g.angle));ctx.scale(g.w/90,g.h/46);poly([[-45,-23],[45,-23],[43,-12],[22,-7],[20,13],[32,19],[32,23],[-32,23],[-32,18],[-21,13],[-21,-7],[-35,-10]],metal(-45,-23,90,46,true),'#637482',1);line(-40,-19,40,-19,'#93a1aa',1);stripes(-32,18,64,5);ctx.fillStyle='#d6b92e';ctx.font='bold 6px Arial,sans-serif';ctx.textAlign='center';ctx.fillText('800 KG',0,5);ctx.restore();
 if(!released&&!m.held){const l=m.x-g.w/2-7,r=m.x+g.w/2+7,t=m.y-g.h/2-6,b=m.y+g.h/2+6;for(const [x,d] of [[l,1],[r,-1]]){line(x,t,x+d*10,t,'#0782a66b',1.5);line(x,t,x,t+9,'#0782a66b',1.5);line(x,b,x+d*10,b,'#0782a66b',1.5);line(x,b,x,b-9,'#0782a66b',1.5);}box(m.x-25,t-13,50,10,5,'#0a2639','#2586a8',.7);ctx.fillStyle='#65e0ff';ctx.font='5px Arial,sans-serif';ctx.textAlign='center';ctx.fillText('↔ DRAG TRAP',m.x,t-6);}
 }else if(m.type==='pendulum'){
 if(!finite(m.pivotX,m.pivotY))continue;
 line(m.pivotX,0,m.pivotX,m.pivotY,'#627b89',8);line(m.pivotX-2,0,m.pivotX-2,m.pivotY,'#afbdc4',2);box(m.pivotX-16,m.pivotY-11,32,20,5,metal(m.pivotX-16,m.pivotY,32,20,true),'#203441');line(m.pivotX,m.pivotY,m.x,m.y,'#0d1c29',8);line(m.pivotX-1,m.pivotY,m.x-1,m.y,'#657985',4);line(m.pivotX-2,m.pivotY,m.x-2,m.y,'#a5b2b8',1);line(m.pivotX+(m.x-m.pivotX)*.48,m.pivotY+(m.y-m.pivotY)*.48,m.pivotX+(m.x-m.pivotX)*.51,m.pivotY+(m.y-m.pivotY)*.51,'#1c2c36',9);disk(m.pivotX,m.pivotY,7,metal(m.pivotX-7,m.pivotY,14,14,true),'#708590',1);bolt(m.pivotX,m.pivotY,3);
 for(const g of m.geometry||[]){if(!finite(g.x,g.y,g.w,g.h)||g.w<=0||g.h<=0)continue;ctx.save();ctx.translate(g.x,g.y);ctx.rotate(n(g.angle));box(-g.w/2,-g.h/2,g.w,g.h,3,metal(-g.w/2,0,g.w,g.h,true),'#617581',1);box(-g.w/2+5,-g.h/2+5,g.w-10,g.h-10,1,'#243340','#111d26',1);for(const x of [-g.w/2+5,g.w/2-5]){box(x-3,-g.h/2,6,g.h,1,'#566976');bolt(x,-g.h/2+5,1.7);bolt(x,g.h/2-5,1.7);}stripes(-g.w/2+9,-4,g.w-18,9);ctx.restore();}
 }
 }
 // Each semantic limb gets its own mechanical segments; all follow its actual angle.
 const joint=(x,y,r)=>{disk(x,y,r,'#101c27','#dec05c',1);disk(x,y,r*.64,metal(x-r,y,r*2,r*2),'#284451',.65);disk(x,y,r*.25,'#15313e','#54abc1',.5);};
 for(const j of lab.joints||[]){const a=lab.parts?.[j.a],b=lab.parts?.[j.b];if(!a||!b||b.broken||!finite(a.x,a.y,b.x,b.y))continue;const point=(p,anchor)=>{const angle=n(p.angle),x=n(anchor?.[0]),y=n(anchor?.[1]);return{x:p.x+x*Math.cos(angle)-y*Math.sin(angle),y:p.y+x*Math.sin(angle)+y*Math.cos(angle)};};const p=point(a,j.anchorA),q=point(b,j.anchorB);line(p.x,p.y,q.x,q.y,'#13212a',4);line(p.x,p.y,q.x,q.y,'#c0a458',1.8);}
 for(const p of lab.parts||[]){
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
 const leg=p.name.includes('leg');
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
 for(const f of lab.effects||[]){if(!finite(f.x,f.y,f.vx,f.vy,f.life)||f.life<=0)continue;ctx.globalAlpha=Math.min(1,f.life/.18);line(f.x,f.y,f.x-f.vx*.022,f.y-f.vy*.022,'#ffd079',1.2);}
 }finally{ctx.restore();}
}

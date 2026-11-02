import {Lab,LEVELS,VERSION,WIDTH,HEIGHT,FLOOR,SAVE_KEY,parseProgress,advanceProgress} from './engine.js';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let stored;
try{stored=parseProgress(localStorage.getItem(SAVE_KEY));}catch{stored={value:{schema:1,current:0,unlocked:0,completed:false},writable:false,reason:'Browser storage is unavailable. This session will not be saved.'};}
let progress=stored.value,lab=new Lab(progress.current),settled=false,resultShown=false,resultAt=0,last=performance.now(),paused=false,lastUI='';
const metrics={frames:0,totalMs:0,maxFrameMs:0};
// Read-only diagnostics describe the running build; no debug outcome controls are exposed.
Object.defineProperty(window,'crashLabDiagnostics',{get:()=>Object.freeze({version:VERSION,level:lab.index+1,detached:lab.count,completed:lab.complete,frames:metrics.frames,meanFrameMs:metrics.frames?metrics.totalMs/metrics.frames:0,maxFrameMs:metrics.maxFrameMs,particles:lab.effects.length,saveWritable:stored.writable})});
$('version').textContent=VERSION;$('save-note').textContent=stored.reason;
function save(){if(!stored.writable)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}catch{stored.writable=false;$('save-note').textContent='Save failed. You can keep playing in this session.';}}
function start(index){lab.up(true);lab=new Lab(index);settled=false;resultShown=false;progress.current=index;save();for(const d of document.querySelectorAll('dialog[open]'))d.close();update();draw();}
function update(){
  const i=lab.index,l=lab.level;
  const signature=`${i}:${lab.count}:${lab.note}`;if(signature===lastUI)return;lastUI=signature;
  $('test-label').textContent=`TEST 0${i+1} / 04`;$('machine').textContent=l.machine.toUpperCase();$('objective').textContent=l.goal+'.';$('parts').innerHTML=`${String(lab.count).padStart(2,'0')}<span>/10</span>`;$('hint').textContent=lab.note;
  $('progress').innerHTML=LEVELS.map((_,n)=>`<i class="${n<i?'done':n===i?'current':''}"></i>`).join('');
}
function finish(){if(!lab.complete||resultShown)return;if(!settled){settled=true;progress=advanceProgress(progress,lab.index);save();resultAt=performance.now()+650;return;}if(performance.now()<resultAt)return;resultShown=true;
  $('result-label').textContent=lab.index===3?'ALL FOUR TESTS COMPLETE':`TEST 0${lab.index+1} COMPLETE`;
  $('result-title').innerHTML=lab.index===3?'A job well<br>dismantled.':'Beautifully<br>broken.';
  $('result-copy').textContent=lab.index===3?'Four machines. One very patient robot. Your notebook is saved; run the lab again or revisit a test.':`${lab.count} component${lab.count===1?'':'s'} detached. Fresh hardware is ready in the next test.`;
  $('next').innerHTML=lab.index===3?'RUN THE LAB AGAIN <span>↗</span>':'NEXT TEST <span>↗</span>';
  $('result').showModal();
}
$('reset').onclick=()=>start(lab.index);$('again').onclick=()=>start(lab.index);$('next').onclick=()=>start(lab.index===3?0:lab.index+1);
$('new-run').onclick=()=>start(0);
$('menu').onclick=()=>{lab.up(true);$('level-buttons').replaceChildren(...LEVELS.map((l,i)=>{const b=document.createElement('button');b.className='level-row';b.disabled=i>progress.unlocked;b.innerHTML=`<b>0${i+1}</b><span>${l.name}</span><em>${i>progress.unlocked?'○':'↗'}</em>`;b.onclick=()=>start(i);return b;}));$('selector').showModal();};
$('about').onclick=()=>{lab.up(true);$('performance').textContent=`Observed rendering: ${metrics.frames} frames; mean ${(metrics.totalMs/Math.max(1,metrics.frames)).toFixed(1)} ms; worst ${metrics.maxFrameMs.toFixed(1)} ms. Browser/device-specific; not input-latency proof.`;$('notes').showModal();};document.querySelector('.wordmark').onclick=e=>{e.preventDefault();$('menu').click();};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{last=performance.now();});
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height};}
canvas.addEventListener('pointerdown',e=>{e.preventDefault();const p=point(e);if(lab.down(p.x,p.y)){canvas.setPointerCapture(e.pointerId);canvas.classList.add('grabbing');update();draw();}});
canvas.addEventListener('pointermove',e=>{if(!lab.grab)return;const p=point(e);lab.move(p.x,p.y);update();draw();finish();});
function release(e){if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);lab.up(e.type==='pointercancel');canvas.classList.remove('grabbing');update();}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
window.addEventListener('blur',()=>{lab.up(true);canvas.classList.remove('grabbing');});
document.addEventListener('visibilitychange',()=>{paused=document.hidden;lab.up(true);last=performance.now();});
const C={ink:'#273c3b',green:'#c4f34b',paper:'#eff0e5',line:'#ced5c0',cyan:'#80d4cd',amber:'#f6b34b'};
function round(x,y,w,h,r=5,fill=C.paper,stroke=C.ink){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function line(x1,y1,x2,y2,color=C.ink,width=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
function circle(x,y,r,fill,stroke=C.ink){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}}
function text(t,x,y,size=10,color=C.ink,align='center'){ctx.fillStyle=color;ctx.font=`${size}px ui-monospace,monospace`;ctx.textAlign=align;ctx.fillText(t,x,y);}
function stripes(x,y,w,h){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=C.amber;ctx.fillRect(x,y,w,h);for(let i=-h;i<w+h;i+=13){ctx.beginPath();ctx.moveTo(x+i,y);ctx.lineTo(x+i+7,y);ctx.lineTo(x+i+7-h,y+h);ctx.lineTo(x+i-h,y+h);ctx.fillStyle=C.ink;ctx.fill();}ctx.restore();}
function grabTag(label,x,y){ctx.save();ctx.setLineDash([3,4]);ctx.strokeStyle='#92a286';ctx.lineWidth=1;ctx.strokeRect(x-46,y-12,92,23);ctx.setLineDash([]);text(label,x,y+3,8,'#6e7e63');ctx.restore();}
function machine(){
  const t=lab.time;
  if(lab.level.kind==='saw'){
    round(278,575,50,25,3,'#819383');round(255,598,96,8,2,C.ink);stripes(259,598,88,7);
    ctx.save();ctx.translate(303,557);ctx.rotate(t*4);ctx.beginPath();for(let i=0;i<32;i++){const a=i*Math.PI/16,r=i%2?39:46;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle='#a7b3a4';ctx.fill();ctx.strokeStyle=C.ink;ctx.lineWidth=1.5;ctx.stroke();circle(0,0,32,C.paper);circle(0,0,24,C.green);for(let i=0;i<3;i++){const a=i*2.094;circle(Math.cos(a)*17,Math.sin(a)*17,3.5,C.ink,null);}circle(0,0,8,C.ink);circle(0,0,3,'#8cd7d0',null);ctx.restore();text('CUTTING ZONE',303,635,8,'#76836b');
  }
  if(lab.level.kind==='blade'){
    round(259,357,12,245,2,C.ink);round(355,357,12,245,2,C.ink);round(249,344,128,18,3,'#8fa08a');stripes(273,346,79,14);round(249,598,128,9,2,C.ink);
    ctx.save();ctx.translate(281,lab.bladeY);ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(64,-17);ctx.lineTo(64,6);ctx.lineTo(0,22);ctx.closePath();ctx.fillStyle=C.amber;ctx.fill();ctx.strokeStyle=C.ink;ctx.lineWidth=2;ctx.stroke();line(5,16,60,2,'#fff4ce',3);ctx.restore();
    line(276,372,276,580,'#b7c3ac',1);line(349,372,349,580,'#b7c3ac',1);text('HEAD CHECK',313,635,8,'#76836b');
  }
  if(lab.level.kind==='anvil'){
    const a=lab.anvil;ctx.save();ctx.translate(a.x,a.y);ctx.fillStyle='#283e3c';ctx.beginPath();ctx.moveTo(-45,-20);ctx.lineTo(46,-20);ctx.lineTo(42,-8);ctx.lineTo(13,0);ctx.lineTo(13,12);ctx.lineTo(30,18);ctx.lineTo(30,23);ctx.lineTo(-30,23);ctx.lineTo(-30,18);ctx.lineTo(-13,12);ctx.lineTo(-13,-2);ctx.lineTo(-38,-8);ctx.closePath();ctx.fill();line(-38,-15,38,-15,'#a4b7a6',3);text('HEAVY',0,-4,7,C.green);ctx.restore();grabTag('DRAG THE ANVIL',a.x,a.y-44);text('DROP ZONE',112,635,8,'#76836b');
  }
  if(lab.level.kind==='hammer'){
    const h=lab.hammer;ctx.save();ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(h.pivotX,h.pivotY,h.length,.95,2.18);ctx.strokeStyle='#a9b89d';ctx.lineWidth=1;ctx.stroke();ctx.restore();line(h.pivotX-31,h.pivotY-12,h.pivotX+31,h.pivotY-12,C.ink,7);circle(h.pivotX,h.pivotY,8,C.paper);line(h.pivotX,h.pivotY,h.x,h.y,C.ink,5);line(h.pivotX+3,h.pivotY,h.x+3,h.y,'#98a68d',1);
    circle(h.x+3,h.y+5,h.r,'#bcc6ad',null);circle(h.x,h.y,h.r,C.amber);circle(h.x,h.y,h.r-7,'#f5c966');for(let i=0;i<4;i++){const a=i*Math.PI/2+.7;circle(h.x+Math.cos(a)*23,h.y+Math.sin(a)*23,2.5,C.ink,null);}circle(h.x,h.y,9,C.ink);grabTag('GRAB & SWING',h.x,h.y-54);text('IMPACT ZONE',286,635,8,'#76836b');
  }
}
function robot(){
  for(const j of lab.joints){const a=lab.parts[j.a],b=lab.parts[j.b];if(!a.broken&&!b.broken){line(a.x,a.y,b.x,b.y,C.ink,7);line(a.x,a.y,b.x,b.y,'#9ba98f',3);}}
  for(const p of lab.parts){ctx.save();ctx.translate(p.x,p.y);if(p.broken)ctx.rotate((lab.time-p.hitAt)*(p.id%2?1:-1)*1.6);ctx.shadowColor='#273c3b20';ctx.shadowBlur=3;ctx.shadowOffsetY=3;
    if(p.name==='head'){
      round(-22,-21,44,42,12,C.paper);ctx.shadowColor='transparent';round(-17,-14,34,23,8,C.ink);round(-14,-11,28,17,6,C.cyan,null);circle(-6,-3,2.7,C.ink,null);circle(6,-3,2.7,C.ink,null);line(-5,15,5,15,'#8e9e85',2);line(0,-23,0,-30,C.ink,2);circle(0,-31,3,C.green);round(-27,-6,5,13,2,C.amber);round(22,-6,5,13,2,C.amber);
    }else if(p.name==='body'){
      round(-21,-29,42,58,8,C.paper);ctx.shadowColor='transparent';round(-15,-18,30,33,4,C.green);text('01',0,4,15,C.ink);circle(-11,-24,2,C.ink,null);circle(11,-24,2,C.ink,null);line(-9,22,9,22,'#a9b49d',2);
    }else{
      round(-p.rx,-p.ry,p.rx*2,p.ry*2,6,p.name.includes('foot')?C.ink:C.paper);ctx.shadowColor='transparent';if(!p.name.includes('foot')){round(-p.rx+3,-p.ry+5,p.rx*2-6,6,2,p.name.includes('hand')?C.cyan:'#bcc7ad',null);circle(0,p.ry-5,3,C.amber);}
    }ctx.restore();}
}
function draw(){
  ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.fillStyle='#e7ebdd';ctx.fillRect(0,0,WIDTH,HEIGHT);
  for(let x=20;x<WIDTH;x+=20)line(x,88,x,FLOOR,'#d9dfce',.6);for(let y=103;y<FLOOR;y+=20)line(20,y,WIDTH-20,y,'#d9dfce',.6);
  ctx.save();ctx.setLineDash([4,5]);line(20,FLOOR-110,400,FLOOR-110,'#c2cdb6',1);ctx.restore();text('R / 01',30,FLOOR-118,7,'#8a977c','left');
  ctx.fillStyle='#d0d9c0';ctx.fillRect(0,FLOOR,WIDTH,HEIGHT-FLOOR);line(0,FLOOR,WIDTH,FLOOR,C.ink,2);for(let x=0;x<WIDTH;x+=16)line(x,FLOOR+9,x+6,FLOOR+3,'#a5b291',1);
  ctx.save();ctx.fillStyle='#283e3c16';for(const p of lab.parts){ctx.beginPath();ctx.ellipse(p.x,FLOOR+1,p.rx*.7,3,0,0,Math.PI*2);ctx.fill();}ctx.restore();
  machine();robot();
  for(const f of lab.effects){ctx.globalAlpha=Math.min(1,f.life/.2);line(f.x,f.y,f.x-f.vx*.025,f.y-f.vy*.025,C.amber,2);}ctx.globalAlpha=1;
  text('CRASH TEST LAB  /  INDEPENDENT STUDY',20,HEIGHT-13,6,'#829071','left');
}
function frame(now){const rawElapsed=now-last,elapsed=Math.min(100,rawElapsed);last=now;if(!paused&&!document.querySelector('dialog[open]')){metrics.frames++;metrics.totalMs+=rawElapsed;metrics.maxFrameMs=Math.max(metrics.maxFrameMs,rawElapsed);let remaining=elapsed/1000;while(remaining>0){const dt=Math.min(1/120,remaining);lab.tick(dt);remaining-=dt;}update();finish();}draw();requestAnimationFrame(frame);}
update();draw();requestAnimationFrame(frame);

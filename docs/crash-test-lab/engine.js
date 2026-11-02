export const VERSION = '0.1.0';
export const WIDTH = 420, HEIGHT = 660, FLOOR = 603;
export const SAVE_KEY = 'idoku:crash-test-lab:progress:v1';
export const LEVELS = Object.freeze([
  { name: 'First contact', machine: 'Circular saw', goal: 'Detach any part', kind: 'saw', count: 1, hint: 'Grab the robot. Drag it into the spinning teeth.' },
  { name: 'Head inspection', machine: 'Guillotine', goal: 'Detach the head', kind: 'blade', count: 1, hint: 'Bring the head to the amber blade on the right.' },
  { name: 'Heavy lifting', machine: 'Drop anvil', goal: 'Crush off 2 parts', kind: 'anvil', count: 2, hint: 'Grab the anvil. Lift it above the robot and let go.' },
  { name: 'Swing shift', machine: 'Pendulum', goal: 'Hammer off 4 parts', kind: 'hammer', count: 4, hint: 'Swing the hammer, or bring the robot into its path.' }
]);
const SHAPES = [
  ['body',0,0,19,30], ['head',0,-48,21,20],
  ['left arm',-33,-4,9,23], ['left hand',-41,29,10,15],
  ['right arm',33,-4,9,23], ['right hand',41,29,10,15],
  ['left leg',-14,48,11,23], ['left foot',-16,81,13,13],
  ['right leg',14,48,11,23], ['right foot',16,81,13,13]
];
const JOINTS = [[0,1],[0,2],[2,3],[0,4],[4,5],[0,6],[6,7],[0,8],[8,9]];
export const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
export function freshProgress() { return { schema:1, current:0, unlocked:0, completed:false }; }
export function parseProgress(raw) {
  if (raw == null) return { value:freshProgress(), writable:true, reason:'' };
  try {
    const p=JSON.parse(raw);
    if (p?.schema!==1 || !Number.isInteger(p.current) || !Number.isInteger(p.unlocked) || p.current<0 || p.current>3 || p.unlocked<p.current || p.unlocked>3 || typeof p.completed!=='boolean') throw Error('invalid');
    return {value:{schema:1,current:p.current,unlocked:p.unlocked,completed:p.completed},writable:true,reason:''};
  } catch { return {value:freshProgress(),writable:false,reason:'Existing save could not be read. It has been left untouched.'}; }
}
export function advanceProgress(progress, index) {
  const next=Math.min(3,index+1);
  return {schema:1,current:next,unlocked:Math.max(progress.unlocked,next),completed:progress.completed||index===3};
}
export class Lab {
  constructor(index=0) { this.reset(index); }
  reset(index=this.index) {
    this.index=clamp(index,0,3); this.level=LEVELS[this.index]; this.time=0; this.complete=false; this.awake=false; this.grab=null; this.effects=[]; this.events=[]; this.hits=0; this.releaseCount=0;
    this.parts=SHAPES.map(([name,dx,dy,rx,ry],id)=>({id,name,x:112+dx,y:508+dy,px:112+dx,py:508+dy,rx,ry,broken:false,hitAt:-10,angle:0}));
    this.joints=JOINTS.map(([a,b])=>({a,b,len:Math.hypot(this.parts[a].x-this.parts[b].x,this.parts[a].y-this.parts[b].y)}));
    this.anvil={x:302,y:255,px:302,py:255,w:90,h:42,held:false};
    this.hammer={x:250,y:471,px:250,py:471,pivotX:250,pivotY:161,length:310,r:35,angle:0,free:false};
    this.note=this.level.hint;
  }
  connected(id) {
    const set=new Set([id]); let changed=true;
    while(changed){changed=false;for(const j of this.joints){if(this.parts[j.a].broken||this.parts[j.b].broken)continue;if(set.has(j.a)&&!set.has(j.b)){set.add(j.b);changed=true;}if(set.has(j.b)&&!set.has(j.a)){set.add(j.a);changed=true;}}}
    return [...set].map(i=>this.parts[i]);
  }
  down(x,y) {
    if(this.complete)return false;
    const a=this.anvil,h=this.hammer;
    if(this.level.kind==='anvil'&&Math.abs(x-a.x)<a.w/2+12&&Math.abs(y-a.y)<a.h/2+12){this.awake=true;this.grab={type:'anvil',offX:a.x-x,offY:a.y-y,lastX:x,lastY:y,dx:0,dy:0};a.held=true;this.note='Lift, aim, release. Heavy things do the work.';return true;}
    if(this.level.kind==='hammer'&&Math.hypot(x-h.x,y-h.y)<h.r+16){this.awake=true;this.grab={type:'hammer',lastX:x,lastY:y,dx:0,dy:0};h.free=true;this.note='Sweep the hammer through the robot.';return true;}
    const p=[...this.parts].reverse().find(p=>Math.hypot((x-p.x)/Math.max(p.rx,20),(y-p.y)/Math.max(p.ry,22))<1.5);
    if(!p)return false;
    this.awake=true;this.grab={type:'part',id:p.id,offX:p.x-x,offY:p.y-y,lastX:x,lastY:y,dx:0,dy:0};this.note='Drag into a machine. Release to throw.';return true;
  }
  move(x,y) {
    const g=this.grab;if(!g||this.complete)return;
    x=clamp(x,20,400);y=clamp(y,90,FLOOR-12);
    const steps=Math.max(1,Math.ceil(Math.hypot(x-g.lastX,y-g.lastY)/6));
    const fromX=g.lastX,fromY=g.lastY;
    g.dx=clamp((x-fromX)*0.8,-16,16);g.dy=clamp((y-fromY)*0.8,-16,16);
    for(let i=1;i<=steps;i++){
      const tx=fromX+(x-fromX)*i/steps,ty=fromY+(y-fromY)*i/steps;
      if(g.type==='part'){
        const p=this.parts[g.id],dx=tx+g.offX-p.x,dy=ty+g.offY-p.y;
        for(const q of this.connected(g.id)){q.x+=dx;q.y+=dy;q.px=q.x;q.py=q.y;}
      } else if(g.type==='anvil') {const a=this.anvil;a.x=tx+g.offX;a.y=ty+g.offY;a.px=a.x;a.py=a.y;}
      else {const h=this.hammer;h.angle=clamp(Math.atan2(tx-h.pivotX,Math.max(40,ty-h.pivotY)),-.73,.42);h.x=h.pivotX+Math.sin(h.angle)*h.length;h.y=h.pivotY+Math.cos(h.angle)*h.length;h.px=h.x;h.py=h.y;}
      this.collide();
      if(this.complete)break;
    }
    g.lastX=x;g.lastY=y;
  }
  up(cancel=false) {
    const g=this.grab;if(!g)return;this.grab=null;this.anvil.held=false;this.hammer.free=false;
    if(!cancel&&g.type==='part')for(const p of this.connected(g.id)){p.px=p.x-g.dx;p.py=p.y-g.dy;}
    if(!cancel)this.releaseCount++;
    if(!this.complete&&this.count===0&&!cancel)this.note='No parts off yet. Aim for the moving cutting surface.';
  }
  get count(){return this.parts.filter(p=>p.broken).length;}
  get bladeY(){return 500+Math.sin(this.time*2.1)*56;}
  tick(dt) {
    dt=clamp(dt,0,1/30);this.time+=dt;
    const step=dt*60;
    for(const p of this.parts){
      if(!this.awake)break;
      if(this.grab?.type==='part'&&this.connected(this.grab.id).some(q=>q.id===p.id))continue;
      const vx=clamp((p.x-p.px)*.989,-19,19),vy=clamp((p.y-p.py)*.989,-19,19);
      p.px=p.x;p.py=p.y;p.x+=vx*step;p.y+=vy*step+.35*step*step;
    }
    for(let i=0;this.awake&&i<6;i++){
      for(const j of this.joints){const a=this.parts[j.a],b=this.parts[j.b];if(a.broken||b.broken)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,shift=(d-j.len)/d*.5;a.x+=dx*shift;a.y+=dy*shift;b.x-=dx*shift;b.y-=dy*shift;}
      for(const p of this.parts){p.x=clamp(p.x,p.rx+7,WIDTH-p.rx-7);if(p.y>FLOOR-p.ry){p.y=FLOOR-p.ry;p.py=p.y+(p.y-p.py)*.12;p.px=p.x-(p.x-p.px)*.65;}p.y=Math.max(106,p.y);}
    }
    const a=this.anvil;
    if(this.level.kind==='anvil'&&!a.held){const vy=clamp((a.y-a.py)*.995,-15,18);a.py=a.y;a.y+=vy*step+.7*step*step;if(a.y>FLOOR-a.h/2){a.y=FLOOR-a.h/2;a.py=a.y;}}
    const h=this.hammer;
    if(!h.free){h.angle=Math.sin(this.time*1.55)*(this.awake?.42:.10);h.x=h.pivotX+Math.sin(h.angle)*h.length;h.y=h.pivotY+Math.cos(h.angle)*h.length;}
    this.collide();
    for(const f of this.effects){f.life-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=180*dt;}
    this.effects=this.effects.filter(f=>f.life>0).slice(-100);
  }
  collide() {
    if(this.complete)return;
    for(const p of this.parts){
      if(p.broken)continue;
      let hit=false;const r=Math.min(p.rx,p.ry)+4;
      if(this.level.kind==='saw')hit=Math.hypot(p.x-303,p.y-557)<40+r;
      if(this.level.kind==='blade')hit=Math.abs(p.x-313)<32+r&&Math.abs(p.y-this.bladeY)<13+r;
      if(this.level.kind==='anvil'){const a=this.anvil;hit=Math.abs(p.x-a.x)<a.w/2+r&&Math.abs(p.y-a.y)<a.h/2+r;}
      if(this.level.kind==='hammer'){const h=this.hammer;hit=Math.hypot(p.x-h.x,p.y-h.y)<h.r+r;}
      if(hit)this.breakPart(p);
    }
    const success=this.level.kind==='blade'?this.parts[1].broken:this.count>=this.level.count;
    if(success){this.complete=true;this.up(true);this.note='Test complete';this.events.push({type:'complete',index:this.index,time:this.time});}
  }
  breakPart(p) {
    if(p.broken)return;
    this.awake=true;p.broken=true;p.hitAt=this.time;this.hits++;p.px=p.x-4*(p.x>240?-1:1);p.py=p.y+4;
    this.events.push({type:'detach',part:p.name,kind:this.level.kind,time:this.time});this.note=`${p.name[0].toUpperCase()+p.name.slice(1)} detached. ${this.count} parts off.`;
    for(let i=0;i<9;i++){const t=i*2.399;this.effects.push({x:p.x,y:p.y,vx:Math.cos(t)*(50+i*11),vy:Math.sin(t)*(50+i*8)-50,life:.32+i*.025,max:.55});}
  }
}

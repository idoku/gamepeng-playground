import {createMachines,stepMachines,updateGeometry} from './machines.js';
export const VERSION='0.4.0-dev';
export const WIDTH=420,HEIGHT=660,FLOOR=603;
export const SAVE_KEY='idoku:crash-test-lab:progress:v1';
export const CORE_SAMPLE_SAVE_KEY='idoku:crash-test-lab:campaign:v2';
export const LEGACY_CAMPAIGN_SAVE_KEY='idoku:crash-test-lab:campaign:v3';
export const CAMPAIGN_SAVE_KEY='idoku:crash-test-lab:campaign:v4';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
import {LEVELS} from './levels.js';
export {LEVELS};
export function freshProgress(){return{schema:1,current:0,unlocked:0,completed:false};}
export function parseProgress(raw){
  if(raw==null)return{value:freshProgress(),writable:true,reason:''};
  try{const p=JSON.parse(raw);if(p?.schema!==1||!Number.isInteger(p.current)||!Number.isInteger(p.unlocked)||p.current<0||p.current>3||p.unlocked<p.current||p.unlocked>3||typeof p.completed!=='boolean')throw Error();return{value:{schema:1,current:p.current,unlocked:p.unlocked,completed:p.completed},writable:true,reason:''};}
  catch{return{value:freshProgress(),writable:false,reason:'Existing save could not be read. It has been left untouched.'};}
}
export function advanceProgress(p,i){const n=Math.min(3,i+1);return{schema:1,current:n,unlocked:Math.max(p.unlocked,n),completed:p.completed||i===3};}
const CORE_LEVEL_NUMBERS=Object.freeze([1,2,3,4,15,18,11]);
export function freshCoreSampleProgress(){return{schema:2,edition:'core-sample',current:0,unlocked:0,completedLevels:[]};}
// v3's meaning must never grow when the playable campaign grows.
const LEGACY_CAMPAIGN_NUMBERS=Object.freeze(Array.from({length:52},(_,i)=>i+1));
const campaignNumbers=()=>LEVELS.map(l=>l.sourceNumber);
export function freshCampaignProgress(numbers=campaignNumbers()){return{schema:4,edition:'observed-prefix',prefixLength:numbers.length,current:0,unlocked:0,completedLevels:[]};}
function parseVersionedProgress(raw,fallback,numbers){
  if(raw==null)return{value:fallback,writable:true,reason:''};
  try{const p=JSON.parse(raw);if(p?.schema!==fallback.schema||p.edition!==fallback.edition||!Number.isInteger(p.current)||!Number.isInteger(p.unlocked)||p.current<0||p.current>=numbers.length||p.unlocked<p.current||p.unlocked>=numbers.length||!Array.isArray(p.completedLevels)||p.completedLevels.some(n=>!Number.isInteger(n)||!numbers.includes(n))||new Set(p.completedLevels).size!==p.completedLevels.length)throw Error();return{value:{...fallback,current:p.current,unlocked:p.unlocked,completedLevels:[...p.completedLevels]},writable:true,reason:''};}
  catch{return{value:fallback,writable:false,reason:'Unrecognized campaign save left untouched. This session will not overwrite it.'};}
}
export function parseCoreSampleProgress(raw){return parseVersionedProgress(raw,freshCoreSampleProgress(),CORE_LEVEL_NUMBERS);}
function campaignFence(numbers,reason='Unrecognized campaign save left untouched. This session will not overwrite it.'){
  return{value:freshCampaignProgress(numbers),writable:false,reason};
}
function validateCampaign(p,schema,edition,numbers,length){
  if(!p||p.schema!==schema||p.edition!==edition||!Number.isSafeInteger(length)||length<1||length>numbers.length||
    !Number.isSafeInteger(p.current)||!Number.isSafeInteger(p.unlocked)||p.current<0||p.current>p.unlocked||p.unlocked>=length||
    !Array.isArray(p.completedLevels)||new Set(p.completedLevels).size!==p.completedLevels.length||
    p.completedLevels.some(n=>!Number.isSafeInteger(n)||!numbers.slice(0,p.unlocked+1).includes(n)))throw Error('Invalid campaign save');
}
function extendCampaign(p,length,numbers){
  // Preserve selection, including replays; completion unlocks only the immediate successor.
  const unlocked=length<numbers.length&&p.completedLevels.includes(numbers[length-1])?Math.max(p.unlocked,length):p.unlocked;
  return{value:{...freshCampaignProgress(numbers),current:p.current,unlocked,completedLevels:[...p.completedLevels]},writable:true,reason:''};
}
export function parseCampaignProgress(raw,numbers=campaignNumbers()){
  if(raw===null)return{value:freshCampaignProgress(numbers),writable:true,reason:''};
  try{
    const p=JSON.parse(raw);
    validateCampaign(p,4,'observed-prefix',numbers,p?.prefixLength);
    return extendCampaign(p,p.prefixLength,numbers);
  }catch{return campaignFence(numbers);}
}
export function migrateLegacyCampaignProgress(raw,numbers=campaignNumbers()){
  if(raw===null)return{value:freshCampaignProgress(numbers),writable:true,reason:''};
  try{
    const p=JSON.parse(raw);
    validateCampaign(p,3,'observed-52',LEGACY_CAMPAIGN_NUMBERS,52);
    if(numbers.length<52||LEGACY_CAMPAIGN_NUMBERS.some((n,i)=>numbers[i]!==n))throw Error('Incompatible campaign');
    return extendCampaign(p,52,numbers);
  }catch{return campaignFence(numbers);}
}
export function loadCampaignProgress(storage,numbers=campaignNumbers()){
  try{
    const raw=storage.getItem(CAMPAIGN_SAVE_KEY);
    // A present but invalid v4 is authoritative: never fall back to older bytes.
    return raw===null?migrateLegacyCampaignProgress(storage.getItem(LEGACY_CAMPAIGN_SAVE_KEY),numbers):parseCampaignProgress(raw,numbers);
  }catch{return campaignFence(numbers,'Browser storage is unavailable. Play can continue without saving.');}
}
export function saveCampaignProgress(storage,progress,numbers=campaignNumbers()){
  // Re-read before every write: another tab may have appended or advanced the campaign.
  // localStorage offers no atomic compare-and-swap; this guards already-visible changes.
  try{
    const latest=parseCampaignProgress(storage.getItem(CAMPAIGN_SAVE_KEY),numbers);
    const requested=parseCampaignProgress(JSON.stringify(progress),numbers);
    if(!latest.writable||!requested.writable)return{value:progress,writable:false,reason:latest.reason||requested.reason};
    const value={...requested.value,unlocked:Math.max(requested.value.unlocked,latest.value.unlocked),
      completedLevels:[...new Set([...requested.value.completedLevels,...latest.value.completedLevels])]};
    storage.setItem(CAMPAIGN_SAVE_KEY,JSON.stringify(value));
    return{value,writable:true,reason:''};
  }catch{return{value:progress,writable:false,reason:'Progress could not be saved. You can keep playing in this session.'};}
}
export function advanceCampaignProgress(p,index,numbers=campaignNumbers()){
  if(!Number.isInteger(index)||index<0||index>=numbers.length)throw Error('Invalid campaign level');
  const n=Math.min(index+1,numbers.length-1);return{...p,current:n,unlocked:Math.max(p.unlocked,n),completedLevels:[...new Set([...p.completedLevels,numbers[index]])]};
}
const SHAPES=[['body',0,0,20,29,3],['head',0,-51,21,20,1],['left arm',-35,3,11,31,.8],['right arm',35,3,11,31,.8],['left leg',-13,59,12,28,1],['right leg',13,59,12,28,1]];
const ANCHORS=[[0,1,[0,-29],[0,22]],[0,2,[-21,-15],[0,-18]],[0,3,[21,-15],[0,-18]],[0,4,[-13,28],[0,-31]],[0,5,[13,28],[0,-31]]];
const rotate=(x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});
function world(p,v){const r=rotate(v[0],v[1],p.angle);return{x:p.x+r.x,y:p.y+r.y,rx:r.x,ry:r.y};}
export function jointPoints(j,parts){return[world(parts[j.a],j.anchorA),world(parts[j.b],j.anchorB)];}
export function contact(x,y,r,s){
  if(s.shape==='rect'&&s.angle){const q=rotate(x-s.x,y-s.y,-s.angle),c=contact(q.x,q.y,r,{...s,x:0,y:0,angle:0});if(!c)return null;const n=rotate(c.nx,c.ny,s.angle);return{...c,nx:n.x,ny:n.y};}
  if(s.shape==='circle'){const dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy),depth=r+s.r-d;return depth>0?{nx:d===0?1:dx/d,ny:d===0?0:dy/d,depth}:null;}
  const dx=x-s.x,dy=y-s.y,qx=clamp(dx,-s.w/2,s.w/2),qy=clamp(dy,-s.h/2,s.h/2),vx=dx-qx,vy=dy-qy,d=Math.hypot(vx,vy);
  if(d>=r)return null;if(d>0)return{nx:vx/d,ny:vy/d,depth:r-d};
  const ex=s.w/2-Math.abs(dx),ey=s.h/2-Math.abs(dy);return ex<ey?{nx:Math.sign(dx)||1,ny:0,depth:r+ex}:{nx:0,ny:Math.sign(dy)||-1,depth:r+ey};
}
export class Lab{
  constructor(index=0){this.reset(index);}
  reset(index=this.index){
    this.index=clamp(Number.isInteger(index)?index:0,0,LEVELS.length-1);this.level=LEVELS[this.index];this.time=0;this.complete=false;this.awake=false;this.robotEngaged=false;this.grab=null;this.effects=[];this.events=[];this.hits=0;this.releaseCount=0;this.accumulator=0;this.note=this.level.hint;
    this.parts=SHAPES.map(([name,dx,dy,rx,ry,mass],id)=>({id,name,x:this.level.spawn.x+dx,y:this.level.spawn.y+dy,px:this.level.spawn.x+dx,py:this.level.spawn.y+dy,vx:0,vy:0,rx,ry,mass,invMass:1/mass,invInertia:3/(mass*(rx*rx+ry*ry)),angle:0,omega:0,broken:false,damage:0,hitAt:-10,contactAt:-10}));
    this.joints=ANCHORS.map(([a,b,anchorA,anchorB])=>({a,b,anchorA,anchorB}));this.machines=createMachines(this.level.machines);this.machines.forEach(updateGeometry);this.anvil=this.machines.find(m=>m.type==='anvil');this.hammer=this.machines.find(m=>m.type==='pendulum');
  }
  get count(){return this.parts.filter(p=>p.id!==0&&p.broken).length;}
  get goalProgress(){return this.goalCount;}
  get engaged(){return this.awake;}
  get goalCount(){const o=this.level.objective;return o?.type==='specific'?this.parts.filter(p=>p.broken&&o.parts.includes(p.name)).length:this.count;}
  get bladeY(){return this.machines.find(m=>m.type==='guillotine')?.y??425;}
  connected(id){if(this.parts[id].broken)return[this.parts[id]];return this.parts.filter(p=>!p.broken);}
  down(x,y){
    if(this.complete||!Number.isFinite(x)||!Number.isFinite(y))return false;
    this.up(true);
    const m=[...this.machines].reverse().find(m=>m.movable&&m.geometry.some(s=>!s.role.startsWith('spikes')&&contact(x,y,9,s)));
    if(m){this.grab={type:'machine',id:m.id,x,y,offX:m.x-x,offY:m.y-y};m.held=true;this.awake=true;return true;}
    const p=[...this.parts].reverse().find(p=>{const q=rotate(x-p.x,y-p.y,-p.angle);return Math.abs(q.x)<p.rx+9&&Math.abs(q.y)<p.ry+9;});
    if(!p)return false;const q=rotate(x-p.x,y-p.y,-p.angle);this.grab={type:'part',id:p.id,x,y,local:[clamp(q.x,-p.rx,p.rx),clamp(q.y,-p.ry,p.ry)]};this.awake=true;this.robotEngaged=true;return true;
  }
  move(x,y){if(this.grab&&!this.complete&&Number.isFinite(x)&&Number.isFinite(y)){this.grab.x=clamp(x,8,WIDTH-8);this.grab.y=clamp(y,95,FLOOR-4);}}
  up(cancel=false){if(!this.grab)return;for(const m of this.machines)if(m.held){m.held=false;m.released=true;if(cancel){m.vx=0;m.vy=0;m.motionVx=0;m.motionVy=0;}}this.grab=null;if(!cancel)this.releaseCount++;}
  tick(dt){
    if(!Number.isFinite(dt)||dt<=0)return;this.accumulator+=Math.min(dt,.1);const h=1/240;
    while(this.accumulator+1e-10>=h){this.step(h);this.accumulator-=h;}
  }
  step(dt){
    this.time+=dt;stepMachines(this.machines,dt,this.time,this.awake,this.grab,this.robotEngaged);
    if(this.awake){
      for(const p of this.parts){
        p.px=p.x;p.py=p.y;p.oldAngle=p.angle;p.vy+=780*dt;
        if(this.grab?.type==='part'&&this.grab.id===p.id){const a=world(p,this.grab.local),dx=this.grab.x-a.x,dy=this.grab.y-a.y;const fx=clamp(dx*100-(p.vx-p.omega*a.ry)*14,-22000,22000),fy=clamp(dy*100-(p.vy+p.omega*a.rx)*14,-22000,22000);p.vx+=fx*p.invMass*dt;p.vy+=fy*p.invMass*dt;p.omega+=(a.rx*fy-a.ry*fx)*p.invInertia*dt;}
        p.vx=clamp(p.vx*Math.exp(-.25*dt),-1000,1000);p.vy=clamp(p.vy*Math.exp(-.25*dt),-1000,1000);p.omega=clamp(p.omega*Math.exp(-.6*dt),-16,16);p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.omega*dt;
      }
      for(let iteration=0;iteration<7;iteration++){
        for(const j of this.joints){const a=this.parts[j.a],b=this.parts[j.b];if(b.broken)continue;const [u,v]=jointPoints(j,this.parts);const dx=v.x-u.x,dy=v.y-u.y;
          // Two point constraints: shoulders/hips rotate freely; no rigid assembly translation.
          for(const [nx,ny,error]of[[1,0,dx],[0,1,dy]]){const ca=u.rx*ny-u.ry*nx,cb=v.rx*ny-v.ry*nx,den=a.invMass+b.invMass+ca*ca*a.invInertia+cb*cb*b.invInertia,lambda=error*.7/den;a.x+=nx*lambda*a.invMass;a.y+=ny*lambda*a.invMass;a.angle+=ca*lambda*a.invInertia;b.x-=nx*lambda*b.invMass;b.y-=ny*lambda*b.invMass;b.angle-=cb*lambda*b.invInertia;}
        }
        for(const p of this.parts)this.bounds(p);
      }
      for(const p of this.parts){p.vx=(p.x-p.px)/dt;p.vy=(p.y-p.py)/dt;p.omega=(p.angle-p.oldAngle)/dt;}
      this.collide(dt);
    }
    for(const f of this.effects){f.life-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=180*dt;}this.effects=this.effects.filter(f=>f.life>0).slice(-120);if(this.events.length>150)this.events.splice(0,this.events.length-150);
  }
  bounds(p){const ex=Math.abs(Math.cos(p.angle))*p.rx+Math.abs(Math.sin(p.angle))*p.ry,ey=Math.abs(Math.sin(p.angle))*p.rx+Math.abs(Math.cos(p.angle))*p.ry;p.x=clamp(p.x,ex+5,WIDTH-ex-5);p.y=clamp(p.y,100+ey,FLOOR-ey);}
  collide(dt=1/240){
    for(const p of this.parts){for(const m of this.machines){let machineDamage=0;for(const shape of m.geometry){let best=null;
      // Capsule samples preserve semantic limbs while covering their oriented length.
      for(const offset of[-Math.max(0,p.ry-p.rx),0,Math.max(0,p.ry-p.rx)]){const q=rotate(0,offset,p.angle),c=contact(p.x+q.x,p.y+q.y,p.rx,shape);if(c&&(!best||c.depth>best.depth))best=c;}
      if(!best)continue;const c=best;
      const svx=(shape.vx??m.vx)-(shape.omega??0)*(p.y-shape.y),svy=(shape.vy??m.vy)+(shape.omega??0)*(p.x-shape.x);
      const relative=Math.max(0,-((p.vx-svx)*c.nx+(p.vy-svy)*c.ny));
      if(shape.role==='spring'){
        if(c.ny<-.3&&m.cooldown<=0){for(const q of this.connected(p.id)){q.vy=-770;q.vx+=m.vx*.2;}m.cooldown=.3;this.events.push({type:'launch',machine:m.id,time:this.time});}
      }else if(shape.hazard&&!p.broken&&!this.complete){
        const cutting=shape.role.startsWith('spikes')||['saw','railSaw','verticalSaw','guillotine','cleavers','pivotBlade','spikedWheel','railWheel'].includes(m.type);
        const pressing=this.grab?.type==='part'&&this.connected(this.grab.id).includes(p);
        const exposure=m.type==='electric'?1.9:cutting?(pressing?1.65:.9):(pressing?.65:.08);
        const impact=relative>100?(relative-100)*(cutting?.00075:.0015):0;machineDamage=Math.max(machineDamage,exposure*dt+impact);
        if(this.time-p.contactAt>.12){p.contactAt=this.time;this.events.push({type:'contact',part:p.name,machine:m.type,time:this.time});this.spark(p,3);}
      }
      if(m.type==='tiltPlatform'&&shape.role==='platform'&&c.ny<-.3)m.loadTorque+=clamp((p.x-m.x)*p.mass*.02,-4,4);
      if(m.type==='wheel'&&!m.held){m.motionVx-=c.nx*relative*p.mass/(m.mass+p.mass)*.6;m.motionVy-=c.ny*relative*p.mass/(m.mass+p.mass)*.6;}
      const correction=Math.min(c.depth,9);p.x+=c.nx*correction;p.y+=c.ny*correction;
      if(relative>0){p.vx+=c.nx*relative*(shape.hazard?1.15:1);p.vy+=c.ny*relative*(shape.hazard?1.15:1);}
      if(!shape.hazard&&c.ny<-.25){const tx=-c.ny,ty=c.nx,target=(svx+(shape.beltSpeed??0))*tx+svy*ty,current=p.vx*tx+p.vy*ty,friction=clamp((target-current)*.12,-18,18);p.vx+=tx*friction;p.vy+=ty*friction;}
    }if(machineDamage){p.damage+=machineDamage;if(p.id===0)p.damage=Math.min(p.damage,.95);else if(p.damage>=1)this.breakPart(p);}}this.bounds(p);}
    this.checkGoal();
  }
  checkGoal(){const o=this.level.objective;if(!o||this.complete)return;const success=o.type==='specific'?o.parts.every(name=>this.parts.some(p=>p.name===name&&p.broken)):this.count>=o.count;if(success){this.complete=true;this.up(true);this.note='Test complete';this.events.push({type:'complete',index:this.index,time:this.time});}}
  breakPart(p){if(!p||p.id===0||p.broken)return;p.broken=true;p.damage=Math.max(1,p.damage);p.hitAt=this.time;this.hits++;this.events.push({type:'detach',part:p.name,kind:this.level.kind,time:this.time});this.note=p.name==='head'?'HEAD OFF!':p.name.includes('arm')?'ARM RIPPED!':'LEG SNAPPED!';this.spark(p,10);}
  spark(p,n){for(let i=0;i<n;i++){const t=i*2.399;this.effects.push({x:p.x,y:p.y,vx:Math.cos(t)*(50+i*11),vy:Math.sin(t)*(50+i*8)-50,life:.25+i*.02,max:.5});}}
}

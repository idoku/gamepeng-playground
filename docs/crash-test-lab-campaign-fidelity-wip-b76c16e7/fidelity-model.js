// Isolated four-level fidelity study. The existing hundred-level campaign and
// its save keys remain untouched. Dimensions are screenshot measurements,
// not recovered source constants.
import {Lab, LEVELS, clamp} from './engine.js';
import {createMachines, updateGeometry} from './machines.js';
export const SAMPLE_VERSION='0.5.3-sample4-voice-dev';
export const SAMPLE_SAVE_KEY='idoku:crash-test-lab:fidelity-sample4:v1';
export const SAMPLE_COUNT=4;
export const SAMPLE_SCALE=.68;
export const SAMPLE_FLOOR=609;
export const SAMPLE_LAYOUTS=[
 {spawn:{x:81,y:544},machines:[{type:'saw',x:210,y:567,r:35.8}]},
 {spawn:{x:81,y:544},machines:[{type:'guillotine',x:339,y:200,w:74,h:45,minY:180,maxY:555}]},
 {spawn:{x:339,y:544},machines:[{type:'anvil',x:81,y:155,w:92,h:57,movable:true,returnAfter:1.2,returnSpeed:125,floor:SAMPLE_FLOOR}]},
 {spawn:{x:339,y:544},machines:[{type:'pendulum',pivotX:100,pivotY:100,length:224,r:34,w:85,h:40,phase:.45,amplitude:.5}]}
];
export class FidelityLab extends Lab{
 bounds(p){
  const ex=Math.abs(Math.cos(p.angle))*p.rx+Math.abs(Math.sin(p.angle))*p.ry;
  const ey=Math.abs(Math.sin(p.angle))*p.rx+Math.abs(Math.cos(p.angle))*p.ry;
  p.x=clamp(p.x,ex+5,420-ex-5);p.y=clamp(p.y,100+ey,SAMPLE_FLOOR-ey);
 }
 step(dt){
  // Source04 visibly swings before robot activation; preserve that observed
  // behaviour within the sample rather than changing the older campaign.
  for(const m of this.machines)if(m.type==='pendulum')m.amplitude=.5;
  // Source03 leaves the unhandled robot upright while the trap is moved away.
  // Keep its resting pose until a real machine contact or a robot grab wakes it.
  const resting=this.index===2&&!this.robotEngaged&&!this.sampleRobotAwake;
  const pose=resting?this.parts.map(p=>({...p})):null;
  super.step(dt);
  if(pose){
   const contact=this.parts.some((p,i)=>p.contactAt!==pose[i].contactAt||p.damage!==pose[i].damage);
   if(contact)this.sampleRobotAwake=true;
   else this.parts.forEach((p,i)=>Object.assign(p,pose[i]));
  }
 }
 reset(index=this.index){
  super.reset(clamp(Number.isInteger(index)?index:0,0,SAMPLE_COUNT-1));
  this.floor=SAMPLE_FLOOR;this.sampleRobotAwake=false;
  const source=this.level, layout=SAMPLE_LAYOUTS[this.index];
  this.level={...source,spawn:{...layout.spawn},machines:layout.machines.map(m=>({...m}))};
  for(const p of this.parts){
   p.x=layout.spawn.x+(p.x-source.spawn.x)*.5;
   p.y=layout.spawn.y+(p.y-source.spawn.y)*SAMPLE_SCALE;
   p.px=p.x;p.py=p.y;p.rx*=p.name==='head'?.68:.65;p.ry*=SAMPLE_SCALE;
   p.invInertia=3/(p.mass*(p.rx*p.rx+p.ry*p.ry));
  }
  for(const j of this.joints){j.anchorA=j.anchorA.map((v,i)=>v*(i?SAMPLE_SCALE:.5));j.anchorB=j.anchorB.map((v,i)=>v*(i?SAMPLE_SCALE:.5));}
  this.machines=createMachines(this.level.machines);this.machines.forEach(updateGeometry);
  this.anvil=this.machines.find(m=>m.type==='anvil');this.hammer=this.machines.find(m=>m.type==='pendulum');
 }
}
export const freshSampleProgress=()=>({schema:1,edition:'fidelity-sample4',current:0,unlocked:0,completed:[]});
export function parseSampleProgress(raw){
 if(raw==null)return{value:freshSampleProgress(),writable:true,reason:''};
 try{const p=JSON.parse(raw);if(p.schema!==1||p.edition!=='fidelity-sample4'||!Number.isInteger(p.current)||!Number.isInteger(p.unlocked)||p.current<0||p.current>3||p.unlocked<p.current||p.unlocked>3||!Array.isArray(p.completed)||p.completed.some(n=>!Number.isInteger(n)||n<0||n>3)||new Set(p.completed).size!==p.completed.length)throw Error();return{value:{schema:1,edition:'fidelity-sample4',current:p.current,unlocked:p.unlocked,completed:[...p.completed]},writable:true,reason:''};}
 catch{return{value:freshSampleProgress(),writable:false,reason:'Unrecognized sample save preserved. Session play is available.'};}
}
export function loadSampleProgress(storage){try{return parseSampleProgress(storage.getItem(SAMPLE_SAVE_KEY));}catch{return{value:freshSampleProgress(),writable:false,reason:'Storage unavailable. Session play is available.'};}}
export function saveSampleProgress(storage,value){
 const next=parseSampleProgress(JSON.stringify(value));if(!next.writable)return next;
 try{const current=loadSampleProgress(storage);if(!current.writable)return{value,writable:false,reason:current.reason};const merged={...value,unlocked:Math.max(value.unlocked,current.value.unlocked),completed:[...new Set([...value.completed,...current.value.completed])]};storage.setItem(SAMPLE_SAVE_KEY,JSON.stringify(merged));return{value:merged,writable:true,reason:''};}catch{return{value,writable:false,reason:'Sample save failed. Session play is available.'};}
}
export function advanceSampleProgress(p,index){if(!Number.isInteger(index)||index<0||index>=SAMPLE_COUNT)throw Error('Invalid sample index');return{...p,current:Math.min(index+1,3),unlocked:Math.max(p.unlocked,Math.min(index+1,3)),completed:[...new Set([...p.completed,index])]};}
export const SAMPLE_GOALS=LEVELS.slice(0,SAMPLE_COUNT).map(l=>l.goal);

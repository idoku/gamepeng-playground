// Full presentation revision. Historical campaign/sample keys and files are retained.
// Only levels 1–4 have exported source-image measurements; later geometry remains
// observation-led authored calibration, not recovered original constants.
import {Lab, LEVELS, clamp, CAMPAIGN_SAVE_KEY, LEGACY_CAMPAIGN_SAVE_KEY, parseCampaignProgress, migrateLegacyCampaignProgress} from './engine.js';
import {SAMPLE_LAYOUTS, SAMPLE_SAVE_KEY, parseSampleProgress, SAMPLE_SCALE, SAMPLE_FLOOR} from './fidelity-model.js';
import {createMachines, updateGeometry} from './machines.js';
import {getCampaignLayout} from './campaign-layouts.js';

export const CAMPAIGN_VERSION='0.6.0-campaign-fidelity-wip1';
export const FULL_SAVE_KEY='idoku:crash-test-lab:campaign-fidelity:v1';
export const FULL_COUNT=LEVELS.length;
export const FULL_LAYOUTS=LEVELS.map((level,index)=>{
 if(index<4)return{...SAMPLE_LAYOUTS[index],evidence:'measured-source-sample',floor:SAMPLE_FLOOR};
 const x=level.spawn.x===105?81:[302,310,335].includes(level.spawn.x)?339:level.spawn.x;
 const y=level.spawn.y>=480?603-87*SAMPLE_SCALE:level.spawn.y+87*(1-SAMPLE_SCALE);
 return getCampaignLayout(index,{spawn:{x,y},machines:level.machines.map(m=>({...m})),floor:603,evidence:'observed-composition-authored-geometry'});
});

export class CampaignLab extends Lab {
 reset(index=this.index){
  super.reset(clamp(Number.isInteger(index)?index:0,0,FULL_COUNT-1));
  const source=this.level,layout=FULL_LAYOUTS[this.index];
  this.floor=layout.floor;this.sampleRobotAwake=false;
  this.level={...source,spawn:{...layout.spawn},machines:layout.machines.map(m=>({...m})),layoutEvidence:layout.evidence};
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
 bounds(p){
  const ex=Math.abs(Math.cos(p.angle))*p.rx+Math.abs(Math.sin(p.angle))*p.ry;
  const ey=Math.abs(Math.sin(p.angle))*p.rx+Math.abs(Math.cos(p.angle))*p.ry;
  p.x=clamp(p.x,ex+5,420-ex-5);p.y=clamp(p.y,100+ey,this.floor-ey);
 }
 step(dt){
  if(this.index===3)for(const m of this.machines)if(m.type==='pendulum')m.amplitude=.5;
  const resting=this.index===2&&!this.robotEngaged&&!this.sampleRobotAwake;
  const pose=resting?this.parts.map(p=>({...p})):null;
  super.step(dt);
  if(pose){
   const contact=this.parts.some((p,i)=>p.contactAt!==pose[i].contactAt||p.damage!==pose[i].damage);
   if(contact)this.sampleRobotAwake=true;
   else this.parts.forEach((p,i)=>Object.assign(p,pose[i]));
  }
 }
}

export const freshFullProgress=()=>({schema:1,edition:'campaign-fidelity',prefixLength:FULL_COUNT,current:0,unlocked:0,completedLevels:[]});
const convert=value=>({...freshFullProgress(),current:value.current,unlocked:value.unlocked,completedLevels:[...value.completedLevels]});
const fence=(reason='Unrecognized full-campaign save preserved. This session will not overwrite it.')=>({value:freshFullProgress(),writable:false,reason});
export function parseFullProgress(raw){
 if(raw===null)return{value:freshFullProgress(),writable:true,reason:''};
 try{
  const p=JSON.parse(raw);if(p?.schema!==1||p.edition!=='campaign-fidelity')return fence();
  const checked=parseCampaignProgress(JSON.stringify({...p,schema:4,edition:'observed-prefix'}));
  return checked.writable?{value:convert(checked.value),writable:true,reason:''}:fence();
 }catch{return fence();}
}
export function loadFullProgress(storage){
 try{
  const current=storage.getItem(FULL_SAVE_KEY);if(current!==null)return parseFullProgress(current);
  const old=storage.getItem(CAMPAIGN_SAVE_KEY),legacy=old===null?storage.getItem(LEGACY_CAMPAIGN_SAVE_KEY):null;
  if(old!==null||legacy!==null){
   const checked=old!==null?parseCampaignProgress(old):migrateLegacyCampaignProgress(legacy);
   return checked.writable?{value:convert(checked.value),writable:true,reason:'Previous campaign progress imported. Historical save bytes are retained.'}:fence('Unrecognized historical campaign save preserved. Import and saving are disabled for this session.');
  }
  const sample=storage.getItem(SAMPLE_SAVE_KEY);
  if(sample!==null){
   const checked=parseSampleProgress(sample);
   if(!checked.writable||checked.value.completed.some(n=>n>checked.value.unlocked))return fence('Unrecognized sample save preserved. Import and saving are disabled for this session.');
   const p=checked.value,completedLevels=p.completed.map(n=>n+1),unlocked=Math.max(p.unlocked,completedLevels.includes(4)?4:0);
   return{value:{...freshFullProgress(),current:p.current,unlocked,completedLevels},writable:true,reason:'Four-level progress imported. Sample save bytes are retained.'};
  }
  return{value:freshFullProgress(),writable:true,reason:''};
 }catch{return fence('Storage unavailable. Session play remains available.');}
}
export function saveFullProgress(storage,value){
 try{
  const next=parseFullProgress(JSON.stringify(value)),latest=parseFullProgress(storage.getItem(FULL_SAVE_KEY));
  if(!next.writable||!latest.writable)return{value,writable:false,reason:!latest.writable?latest.reason:next.reason};
  const merged={...next.value,unlocked:Math.max(next.value.unlocked,latest.value.unlocked),completedLevels:[...new Set([...next.value.completedLevels,...latest.value.completedLevels])]};
  storage.setItem(FULL_SAVE_KEY,JSON.stringify(merged));return{value:merged,writable:true,reason:''};
 }catch{return{value,writable:false,reason:'Save unavailable. Session play remains available.'};}
}
export function advanceFullProgress(p,index){
 if(!Number.isInteger(index)||index<0||index>=FULL_COUNT)throw Error('Invalid full-campaign index');
 const current=Math.min(index+1,FULL_COUNT-1);
 return{...p,current,unlocked:Math.max(p.unlocked,current),completedLevels:[...new Set([...p.completedLevels,LEVELS[index].sourceNumber])]};
}

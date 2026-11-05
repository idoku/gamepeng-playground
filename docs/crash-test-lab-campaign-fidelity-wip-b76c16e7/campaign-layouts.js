// Bounded screenshot-coordinate overlay. Never recovered original constants.
// The explicitly recorded frame applies to 76–100, not the older viewport.
const replay='runtime/research/robo-crash-replay-20261104.md';
const sample='runtime/research/fidelity-sample4-source/observations.md';
export const CAMPAIGN_SOURCE_FRAME=Object.freeze({left:412,top:121,width:387,height:689,targetWidth:420,targetHeight:660});
const X=x=>(x-412)*420/387,Y=y=>(y-121)*660/689,W=w=>w*420/387,H=h=>h*660/689;
export const sourceCampaignPoint=(x,y)=>({x:X(x),y:Y(y)});
const point=(slot,type,x,y)=>({slot,type,raw:{x,y},fields:{x:X(x),y:Y(y)}});
const anchor=(slot,type,x,y)=>({slot,type,raw:{pivotX:x,pivotY:y},fields:{pivotX:X(x),pivotY:Y(y)}});
const strip=(slot,x1,x2,y1,y2)=>({slot,type:'spikeWall',raw:{x1,x2,y1,y2},fields:{x:X((x1+x2)/2),y:Y((y1+y2)/2),w:W(x2-x1),h:H(y2-y1)}});
const jaws=(slot,left1,left2,right1,right2)=>({slot,type:'inwardSpikes',raw:{left1,left2,right1,right2,top:690,bottom:755},fields:{x:X((left1+left2+right1+right2)/4),y:Y(722.5),gap:W((right1+right2-left1-left2)/2),w:W((left2-left1+right2-right1)/2),h:H(65)}});
const electrodes=(slot,x1,x2)=>({slot,type:'electric',raw:{electrodeX:[x1,x2]},fields:{x:X((x1+x2)/2),w:W(x2-x1)}});
const piston=(slot,y1,y2)=>({slot,type:'piston',raw:{top:y1,bottom:y2},fields:{y:Y((y1+y2)/2),h:H(y2-y1)}});
const rail=(slot,x,y,railY)=>({...point(slot,'railSaw',x,y),raw:{x,y,railY},fields:{...point(slot,'railSaw',x,y).fields,railY:Y(railY)}});
const rotor=()=>point(0,'cleavers',606,516),saw=(slot,x)=>point(slot,'saw',x,713),ball=(slot,x)=>anchor(slot,'chainBall',x,190),hammer=()=>anchor(0,'pendulum',503,225);
const leftJaws=slot=>jaws(slot,425,452,548,575),centerJaws=slot=>jaws(slot,530,556,655,682);
// Each entry cites its numbered source paragraph, preserving raw observations
// alongside ONLY the translated fields. Missing dimensions remain authored.
const rows={
 76:['right',[ball(0,487),ball(1,606)]],
 77:['left',[ball(0,606),ball(1,724)]],
 78:['left',[rotor(),saw(1,606),electrodes(2,668,781)]],
 79:['left',[saw(1,724),ball(2,724)]],
 80:['right',[ball(0,487),ball(1,606),leftJaws(2)]],
 81:['left',[rail(0,587,507,444),strip(1,769,792,612,755)]],
 82:['right',[rotor(),saw(1,487),saw(2,606)]],
 83:['right',[ball(0,487),strip(1,412,438,527,682),centerJaws(2)]],
 84:['left',[ball(0,606),piston(1,542,633)]],
 85:['right',[hammer(),strip(1,418,444,614,755),strip(2,769,798,535,687)]],
 86:['left',[ball(0,606),piston(1,525,616)]],
 87:[null,[ball(0,487),leftJaws(1),piston(2,529,621)]],
 88:['left',[ball(0,606),ball(1,724)]],
 89:['right',[{slot:0,type:'press',raw:{left:420,right:550},fields:{x:X(485),w:W(130)}},{slot:1,type:'conveyor',raw:{left:540,right:687},fields:{x:X(613.5),w:W(147)}},ball(2,606)]],
 90:[null,[saw(0,487),{slot:1,type:'springSpikes',raw:{x:724,y:742,spikeY:242},fields:{x:X(724),y:Y(742),spikeY:Y(242)}}]],
 91:['right',[hammer(),strip(1,412,438,475,626),point(2,'wheel',552,729)]],
 92:['right',[rotor(),saw(1,487),saw(2,606)]],
 93:['left',[rotor(),saw(1,606),saw(2,724)]],
 94:['right',[hammer(),saw(1,606)]],
 95:['right',[ball(0,487),ball(1,606),leftJaws(2)]],
 96:['left',[electrodes(0,549,662),saw(1,724)]],
 97:['left',[ball(0,606),ball(1,724),strip(2,769,792,620,755)]],
 98:['right',[rotor(),saw(1,606)]],
 99:['right',[rail(0,509,525,461),saw(1,606)]],
 100:['left',[rotor(),centerJaws(1),strip(2,769,798,410,565)]]
};
const freeze=value=>{for(const child of Object.values(value))if(child&&typeof child==='object')freeze(child);return Object.freeze(value);};
export const CAMPAIGN_LAYOUT_OVERRIDES=freeze(Object.fromEntries(Object.entries(rows).map(([number,[side,machines]])=>[number,{
 sourceNumber:Number(number),source:`${replay} (level ${number})`,frameSource:`${replay} (02:11 UTC frame); ${sample} (coordinate frame)`,
 precision:'Approximate screenshot coordinates; not original constants',spawn:side?{x:X(side==='left'?487:724)}:null,
 authoredPatches:Number(number)===79?[{slot:0,type:'conveyor',fields:{x:210,w:160},reason:'Authored spawn-clearance calibration: center the belt and clear the standing robot. Source79 conveyor width is unknown; source89 provides a similar-width family reference, not a measurement of79.'}]:[],
 machines:machines.map(patch=>({...patch,source:`${replay} (level ${number})`})),
 caveats:['Unlisted fields remain authored.','No motion, force, scoring or movable-permission changes.','Floor and spawn height remain the base calibration; mapped source floor is approximately 608.3.','Rail height is observed; travel limits and timing are not derived from decorative rail endpoints.','Rotary hammer silhouette and electrical pad height remain authored.']
}])));

// Pure, fail-closed application: a changed composition must be reconciled rather
// than applying coordinates to the wrong mechanism. No legacy config is mutated.
export function getCampaignLayout(index,baseLayout){
 if(!Number.isInteger(index)||index<0||index>=100)throw new RangeError('Invalid campaign layout index');
 const layout={...baseLayout,spawn:{...baseLayout.spawn},machines:baseLayout.machines.map(m=>({...m}))};
 const overlay=CAMPAIGN_LAYOUT_OVERRIDES[index+1];
 if(!overlay)return layout;
 for(const patch of [...overlay.machines,...overlay.authoredPatches]){
  if(layout.machines[patch.slot]?.type!==patch.type)throw new Error(`Level ${index+1}: observed layout composition conflict at machine ${patch.slot}`);
  for(const value of Object.values(patch.fields))if(!Number.isFinite(value))throw new Error('Non-finite observed geometry');
  Object.assign(layout.machines[patch.slot],patch.fields);
 }
 if(overlay.spawn)Object.assign(layout.spawn,overlay.spawn);
 for(const object of [layout.spawn,...layout.machines])for(const [key,value] of Object.entries(object))if(typeof value==='number'&&!Number.isFinite(value))throw new Error(`Non-finite layout field ${key}`);
 return{...layout,evidence:'observed-screenshot-partial-geometry',geometryEvidence:overlay};
}

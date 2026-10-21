(function(root){
  'use strict';
  var levels=['easy','medium','hard','impossible'],names=['新手友好','休闲对决','高手挑战','极限反应'],codes=['E','M','H','X'];
  var skinGoals=[{points:0,stage:0},{points:100,stage:1},{points:200,stage:2},{points:300,stage:3},{points:500,stage:4},{points:700,stage:5},{points:900,stage:6},{points:1200,stage:7},{points:1500,stage:8},{points:2000,stage:8}];
  function rules(r){return r.rules===9?9:r.rules===8?8:r.rules===7?7:r.rules===6?6:r.rules===5?5:r.rules===4?4:r.rules===3?3:r.rules===2?2:1;}
  function validRecord(r){
    if(!r||typeof r.id!=='string'||r.id.length===0||r.id.length>80||['pvp','cpu','cup'].indexOf(r.mode)<0||levels.indexOf(r.difficulty)<0||!Number.isFinite(r.seconds)||r.seconds<=0||r.seconds>3600||!Number.isFinite(r.at)||r.at<=0)return false;
    if(r.rules!==undefined&&[1,2,3,4,5,6,7,8,9].indexOf(r.rules)<0)return false;
    if(r.practice!==undefined&&typeof r.practice!=='boolean')return false;var win=5;if(r.mode!=='cup'&&(r.rules===4||r.rules===5||r.rules===7||r.rules===9))return false;
    if(r.mode==='cup'){var cup=root.NeonCup,s=cup&&cup.stage(r.stage);if(!s||(r.rules!==4&&r.rules!==5&&r.rules!==7&&r.rules!==9)||r.toWin!==s.win||r.difficulty!==s.difficulty||!cup.validPicks(r.picks,r.practice===true?undefined:r.stage-1)||r.picks.length>r.stage-1||(r.practice===true&&r.rules!==5&&r.rules!==7&&r.rules!==9))return false;win=s.win;}
    return Number.isInteger(r.top)&&Number.isInteger(r.bottom)&&r.top>=0&&r.bottom>=0&&r.top<=win&&r.bottom<=win&&((r.top===win&&r.bottom<win)||(r.bottom===win&&r.top<win));
  }
  function validProgress(p){return !!(p&&p.schema===1&&Number.isInteger(p.points)&&p.points>=0&&p.points<=1000000000&&Number.isInteger(p.bestStage)&&p.bestStage>=0&&p.bestStage<=8&&Array.isArray(p.rewardIds)&&p.rewardIds.length<=128&&p.rewardIds.every(function(id){return typeof id==='string'&&id.length>0&&id.length<=80;})&&p.rewardIds.every(function(id,i){return p.rewardIds.indexOf(id)===i;}));}
  function rewardPoints(r){return validRecord(r)&&(r.mode==='cpu'&&r.bottom===5||r.mode==='cup'&&r.bottom===r.toWin)?r.mode==='cup'?60:100:0;}
  function unlocked(v,id){var goal=skinGoals[id],p=v&&v.progress;return !!(goal&&(id===0||p&&(p.points>=goal.points||p.bestStage>=goal.stage)));}
  function selectSkin(v,id){v=clean(v);if(Number.isInteger(id)&&id>=0&&id<10&&unlocked(v,id))v.settings.skin=id;return v;}
  function validate(v){return v&&v.schema===1&&Array.isArray(v.records)&&v.records.length<=30&&v.records.every(validRecord)&&v.settings&&Number.isInteger(v.settings.skin)&&v.settings.skin>=0&&v.settings.skin<10&&levels.indexOf(v.settings.difficulty)>=0&&typeof v.settings.sound==='boolean'&&(v.progress===undefined||validProgress(v.progress))&&(v.cup===undefined||!root.NeonCup||root.NeonCup.valid(v.cup));}
  function clean(v){
    v=v||{};var records=[],seen={};
    (Array.isArray(v.records)?v.records:[]).forEach(function(r){if(validRecord(r)&&!seen[r.id]){seen[r.id]=true;var row={id:r.id,rules:rules(r),mode:r.mode,difficulty:r.difficulty,top:r.top,bottom:r.bottom,seconds:r.seconds,at:r.at};if(r.mode==='cup'){row.stage=r.stage;row.toWin=r.toWin;row.picks=r.picks.slice();if(r.practice===true)row.practice=true;}records.push(row);}});
    var s=v.settings||{};
    var difficulty=levels.indexOf(s.difficulty)>=0?s.difficulty:'easy';
    if(s.balanceVersion!==3&&difficulty!=='hard'&&difficulty!=='impossible')difficulty='easy';
    var out={schema:1,settings:{skin:Number.isInteger(s.skin)&&s.skin>=0&&s.skin<10?s.skin:0,difficulty:difficulty,balanceVersion:3,sound:s.sound!==false,effects:s.effects!==false},records:records.slice(-30)};if(root.NeonCup)out.cup=root.NeonCup.clean(v.cup);
    var progress={schema:1,points:0,bestStage:out.cup?out.cup.best:0,rewardIds:[]};
    if(validProgress(v.progress)){progress.points=v.progress.points;progress.bestStage=Math.max(progress.bestStage,v.progress.bestStage);progress.rewardIds=v.progress.rewardIds.slice();}
    else if(v.progress===undefined){records.forEach(function(r){progress.points+=rewardPoints(r);progress.rewardIds.push(r.id);if(r.mode==='cup'&&rewardPoints(r))progress.bestStage=Math.max(progress.bestStage,r.stage);});}
    progress.points=Math.min(1000000000,progress.points);progress.rewardIds=progress.rewardIds.slice(-128);out.progress=progress;
    if(!unlocked(out,out.settings.skin))out.settings.skin=0;return out;
  }
  function add(v,r){v=clean(v);if(validRecord(r)&&!v.records.some(function(old){return old.id===r.id;})&&v.progress.rewardIds.indexOf(r.id)<0){v.records.push(r);v.records=v.records.slice(-30);v.progress.points=Math.min(1000000000,v.progress.points+rewardPoints(r));if(r.mode==='cup'&&rewardPoints(r))v.progress.bestStage=Math.max(v.progress.bestStage,r.stage);v.progress.rewardIds.push(r.id);v.progress.rewardIds=v.progress.rewardIds.slice(-128);}return clean(v);}
  function table(v,filter){return clean(v).records.filter(function(r){return filter==='practice'?r.mode==='cup'&&r.practice===true:filter==='cup'?r.mode==='cup'&&!r.practice:filter==='legacy'?r.mode!=='cup'&&r.rules<8:r.rules===8&&(filter==='pvp'?r.mode==='pvp':r.mode==='cpu'&&r.difficulty===filter);}).sort(function(a,b){
    if(filter==='cup'||filter==='practice')return b.stage-a.stage||b.at-a.at;
    if(filter==='pvp')return a.seconds-b.seconds;
    var aw=a.bottom===5,bw=b.bottom===5;if(aw!==bw)return aw?-1:1;
    if(aw&&a.top!==b.top)return a.top-b.top;
    if(!aw&&a.bottom!==b.bottom)return b.bottom-a.bottom;
    return a.seconds-b.seconds;
  }).slice(0,10);}
  function encode(r){return validRecord(r)&&r.mode==='cpu'&&r.bottom===5?'H'+rules(r)+'-'+codes[levels.indexOf(r.difficulty)]+'-'+r.top+'-'+Math.ceil(r.seconds):'';}
  function decode(s){
    var m=/^H([12368])-([EMHX])-([0-4])-([1-9][0-9]{0,3})$/.exec(String(s).trim().toUpperCase());
    if(!m||Number(m[4])>3600)return null;
    return {schema:1,rules:Number(m[1]),game:'neon_hockey',difficulty:levels[codes.indexOf(m[2])],target:{goals:5,against:Number(m[3]),seconds:Number(m[4])}};
  }
  function beat(r,c){return !!(c&&validRecord(r)&&rules(r)===c.rules&&r.mode==='cpu'&&r.difficulty===c.difficulty&&r.bottom===5&&(r.top<c.target.against||(r.top===c.target.against&&r.seconds<=c.target.seconds)));}
  root.HockeyRecords={currentRules:8,skinGoals:skinGoals,unlocked:unlocked,selectSkin:selectSkin,rewardPoints:rewardPoints,levels:levels,names:names,validate:validate,clean:clean,add:add,table:table,encode:encode,decode:decode,beat:beat};
})(typeof window!=='undefined'?window:typeof global!=='undefined'?global:this);

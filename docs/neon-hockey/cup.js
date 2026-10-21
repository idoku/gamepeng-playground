(function(root){
  'use strict';
  var talents=[
    {id:'wide',name:'宽幅球拍',mark:'宽',desc:'球拍半径增加5，接球更稳',color:'#53e7ff'},
    {id:'bank',name:'折光回击',mark:'墙',desc:'你的击球第一次借墙后提速12%',color:'#cf8cff'},
    {id:'shield',name:'守门护盾',mark:'盾',desc:'每场自动挡住一次即将失守的球',color:'#82aaff'},
    {id:'control',name:'缓冲回球',mark:'缓',desc:'电脑回球速度上限降低10%',color:'#67efb0'},
    {id:'charge',name:'轻挥强击',mark:'力',desc:'更轻的挥拍也能触发强力回击',color:'#ffc06c'}
  ];
  var stages=[
    {id:1,name:'初见霓光',opponent:'暖场守门员',tactic:'keeper',tip:'球速已提起来，找两侧空当主动回击。',difficulty:'easy',win:3,overrides:{interval:.23,xSpeed:290,ySpeed:210,error:85,lead:.12,returnSpeed:580,serve:410,minimum:380,heat:180,boost:45,minCap:740,maxSpeed:1050,playerRadius:48,opponentGoal:240}},
    {id:2,name:'迎面交锋',opponent:'前压先锋',tactic:'rush',tip:'它会快速前压，借墙绕开正面拦截。',difficulty:'easy',win:3,overrides:{interval:.19,xSpeed:360,ySpeed:280,error:70,lead:.16,returnSpeed:650,serve:440,minimum:400,heat:190,boost:45,minCap:780,maxSpeed:1100,playerRadius:46,opponentGoal:220}},
    {id:3,name:'折光轨迹',opponent:'借墙射手',tactic:'bank',tip:'借墙回球更快，提前守住落点。',difficulty:'easy',win:3,overrides:{interval:.16,xSpeed:430,ySpeed:310,error:55,lead:.2,returnSpeed:720,serve:470,minimum:420,heat:200,boost:50,minCap:820,maxSpeed:1100,playerRadius:44,opponentGoal:200}},
    {id:4,name:'守线试炼',opponent:'稳守专家',tactic:'keeper',tip:'换角度打穿防线，别只往正中推球。',difficulty:'medium',win:3,overrides:{interval:.14,xSpeed:470,ySpeed:320,error:45,lead:.24,returnSpeed:780,serve:500,minimum:440,heat:210,boost:50,minCap:860,maxSpeed:1150,playerRadius:44,opponentGoal:200}},
    {id:5,name:'疾影突袭',opponent:'疾影突击手',tactic:'rush',tip:'它会抢中线强击，边路回球更有机会。',difficulty:'medium',win:3,power:true,overrides:{interval:.12,xSpeed:520,ySpeed:390,error:36,lead:.28,returnSpeed:840,serve:520,minimum:460,heat:220,boost:55,minCap:900,maxSpeed:1200,playerRadius:42,opponentGoal:200}},
    {id:6,name:'双岸折射',opponent:'双岸射手',tactic:'bank',tip:'两侧连续折射，别等球到门前才动。',difficulty:'medium',win:3,power:true,overrides:{interval:.105,xSpeed:560,ySpeed:390,error:30,lead:.3,returnSpeed:900,serve:550,minimum:480,heat:230,boost:55,minCap:940,maxSpeed:1200,playerRadius:42,opponentGoal:200}},
    {id:7,name:'强攻对决',opponent:'强攻队长',tactic:'striker',tip:'连续强攻压迫球门，守住后立刻反击。',difficulty:'medium',win:3,power:true,overrides:{interval:.09,xSpeed:610,ySpeed:440,error:23,lead:.34,returnSpeed:980,serve:570,minimum:500,heat:240,boost:60,minCap:980,maxSpeed:1200,playerRadius:40,opponentGoal:200}},
    {id:8,name:'霓虹决赛',opponent:'霓虹冠军',tactic:'champion',tip:'冠军轮换攻守打法。先得5分，拿下疾速决赛。',difficulty:'medium',win:5,power:true,overrides:{interval:.08,xSpeed:660,ySpeed:460,error:18,lead:.36,returnSpeed:1080,serve:600,minimum:520,heat:240,boost:60,minCap:1020,maxSpeed:1200,playerRadius:40,opponentGoal:200}}
  ];
  function talent(id){for(var i=0;i<talents.length;i++)if(talents[i].id===id)return talents[i];return null;}
  function counts(picks){var out={wide:0,bank:0,shield:0,control:0,charge:0};(picks||[]).forEach(function(id){if(talent(id))out[id]++;});return out;}
  function validPicks(picks,length){if(!Array.isArray(picks)||picks.length>7||(length!==undefined&&picks.length!==length)||!picks.every(function(id){return typeof id==='string'&&!!talent(id);}))return false;var c=counts(picks);return Object.keys(c).every(function(id){return c[id]<=3;});}
  function fresh(seed,best){return {schema:1,seed:Number.isInteger(seed)&&seed>=0&&seed<=2147483647?seed:1,stage:1,picks:[],phase:'ready',best:Number.isInteger(best)&&best>=0&&best<=8?best:0};}
  function valid(v){return !!(v&&v.schema===1&&Number.isInteger(v.stage)&&v.stage>=1&&v.stage<=8&&Number.isInteger(v.seed)&&v.seed>=0&&v.seed<=2147483647&&Number.isInteger(v.best)&&v.best>=v.stage-1&&v.best<=8&&['ready','upgrade','complete'].indexOf(v.phase)>=0&&validPicks(v.picks,v.stage-1)&&(v.phase!=='upgrade'||v.stage<8&&v.best>=v.stage)&&(v.phase!=='complete'||v.stage===8&&v.best===8));}
  function clean(v){if(!valid(v))return fresh(1,v&&v.best);return {schema:1,seed:v.seed,stage:v.stage,picks:v.picks.slice(),phase:v.phase,best:v.best};}
  function stage(n){return Number.isInteger(n)&&n>=1&&n<=8?stages[n-1]:null;}
  function offers(v){v=clean(v);if(v.phase!=='upgrade')return [];var c=counts(v.picks),ids=talents.filter(function(t){return c[t.id]<3;}).map(function(t){return t.id;});if(v.stage===1)return ['wide','bank','shield'];
    var seed=(v.seed+v.stage*7919)>>>0;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
    for(var i=ids.length-1;i>0;i--){var j=Math.floor(rand()*(i+1)),t=ids[i];ids[i]=ids[j];ids[j]=t;}return ids.slice(0,3);
  }
  function win(v,n,practice){v=clean(v);if(practice===true)return v;if(v.phase!=='ready'||v.stage!==n)return v;v.best=Math.max(v.best,n);v.phase=n===8?'complete':'upgrade';return v;}
  function choose(v,id){v=clean(v);if(offers(v).indexOf(id)<0)return null;v.picks.push(id);v.stage++;v.phase='ready';return valid(v)?v:null;}
  function selection(v,n){if(!valid(v)||!stage(n))return null;return {stage:n,picks:v.picks.slice(0,n-1),practice:n!==v.stage||v.phase!=='ready'};}
  function labels(picks){var c=counts(picks);return talents.filter(function(t){return c[t.id]>0;}).map(function(t){return t.name+' '+c[t.id]+'级';});}
  root.NeonCup={rules:9,stages:stages,talents:talents,talent:talent,counts:counts,validPicks:validPicks,stage:stage,selection:selection,fresh:fresh,valid:valid,clean:clean,offers:offers,win:win,choose:choose,labels:labels};
})(typeof window!=='undefined'?window:typeof global!=='undefined'?global:this);

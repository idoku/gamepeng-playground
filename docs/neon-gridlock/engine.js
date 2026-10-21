(function(root){
  'use strict';
  var TIERS=['easy','medium','hard'],BONUSES=['extra','steal','gift'];
  function integer(v,min,max){return Number.isInteger(v)&&v>=min&&v<=max;}
  function random(s){var t=s.rng=(s.rng+1831565813)>>>0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
  function pick(s,a){return a.length?a[Math.floor(random(s)*a.length)]:-1;}
  function create(seed,tier){
    if(!integer(seed,0,4294967295)||TIERS.indexOf(tier)<0)throw Error('invalid_start');
    var s={schema:1,seed:seed,tier:tier,rng:seed,n:5,lines:Array(40).fill(-1),boxes:Array(16).fill(-1),bonuses:[],turn:0,extra:[0,0],history:[],over:false,streak:[0,0],best:[0,0],events:[]};
    var pool=[];BONUSES.forEach(function(b){for(var k=0;k<4;k++)pool.push(b);});for(var k=0;k<4;k++)pool.push('');
    for(var i=pool.length-1;i>0;i--){var j=Math.floor(random(s)*(i+1)),v=pool[i];pool[i]=pool[j];pool[j]=v;}s.bonuses=pool;return s;
  }
  function edges(b){var r=Math.floor(b/4),c=b%4;return [r*4+c,(r+1)*4+c,20+r*5+c,20+r*5+c+1];}
  function endpoints(i){if(i<20){var r=Math.floor(i/4),c=i%4;return [c,r,c+1,r];}var v=i-20,r2=Math.floor(v/5),c2=v%5;return [c2,r2,c2,r2+1];}
  function sides(s,b){return edges(b).filter(function(i){return s.lines[i]!==-1;}).length;}
  function adjacent(i){var list=[];for(var b=0;b<16;b++)if(edges(b).indexOf(i)>=0)list.push(b);return list;}
  function scores(s){return [s.boxes.filter(function(v){return v===0;}).length,s.boxes.filter(function(v){return v===1;}).length];}
  function available(s){return s.lines.map(function(v,i){return v===-1?i:-1;}).filter(function(v){return v>=0;});}
  function claim(s,b,p,kind){s.boxes[b]=p;s.events.push({type:kind||'claim',box:b,player:p});}
  function bonus(s,b,p,type){
    s.bonuses[b]='';
    if(type==='extra'){s.extra[p]++;s.events.push({type:'extra',box:b,player:p});return;}
    var candidates=[];for(var i=0;i<16;i++)if(s.boxes[i]===(type==='steal'?1-p:-1))candidates.push(i);
    var target=pick(s,candidates);
    if(target<0){s.events.push({type:'empty',bonus:type,box:b,player:p});return;}
    if(type==='steal'){claim(s,target,p,'steal');return;}
    claim(s,target,p,'gift');s.bonuses[target]='';
    edges(target).forEach(function(i){if(s.lines[i]===-1)s.lines[i]=p;});
    // A gift fills its four edges, including any newly closed neighbouring boxes.
    for(var j=0;j<16;j++)if(s.boxes[j]===-1&&sides(s,j)===4){claim(s,j,p,'gift-chain');s.bonuses[j]='';}
  }
  function move(s,i){
    if(s.over||!integer(i,0,39)||s.lines[i]!==-1)return false;
    var p=s.turn;s.events=[];s.lines[i]=p;s.history.push(i);
    var closed=adjacent(i).filter(function(b){return s.boxes[b]===-1&&sides(s,b)===4;});
    var pending=[];closed.forEach(function(b){claim(s,b,p);if(s.bonuses[b])pending.push({box:b,type:s.bonuses[b]});});
    pending.forEach(function(v){bonus(s,v.box,p,v.type);});
    if(closed.length){s.streak[p]+=closed.length;s.best[p]=Math.max(s.best[p],s.streak[p]);}
    else{s.streak[p]=0;if(s.extra[p]>0){s.extra[p]--;s.events.push({type:'use-extra',player:p});}else s.turn=1-p;}
    s.over=s.boxes.every(function(v){return v>=0;});return true;
  }
  function completion(s,i){return adjacent(i).filter(function(b){return s.boxes[b]===-1&&sides(s,b)===3;}).length;}
  function safe(s,i){return adjacent(i).every(function(b){return s.boxes[b]!==-1||sides(s,b)!==2;});}
  function choose(s){
    var all=available(s);if(!all.length||s.over)return -1;
    // AI randomness is independent of hidden-bonus randomness and reproducible from the board.
    var randState={rng:(s.seed^Math.imul(s.history.length+1,2654435761))>>>0};
    var take=function(a){return pick(randState,a);},com=all.filter(function(i){return completion(s,i)>0;}),good=all.filter(function(i){return safe(s,i);});
    if(s.tier==='easy'){
      if(random(randState)<0.4)return take(all);
      if(com.length&&random(randState)>0.3)return take(com);
      if(good.length&&random(randState)>0.3)return take(good);
      return take(all);
    }
    if(com.length)return s.tier==='hard'?com[0]:take(com);
    if(good.length){
      if(s.tier==='medium')return take(good);
      var strategic=good.filter(function(i){return adjacent(i).every(function(b){return s.boxes[b]!==-1||sides(s,b)!==1;});});return (strategic.length?strategic:good)[0];
    }
    var best=all[0],damage=Infinity;all.forEach(function(i){var d=adjacent(i).filter(function(b){return s.boxes[b]===-1&&sides(s,b)===2;}).length;if(d<damage){damage=d;best=i;}});return best;
  }
  function pack(s){return {schema:1,seed:s.seed,tier:s.tier,history:s.history.slice()};}
  function restore(v){
    if(!v||v.schema!==1||!integer(v.seed,0,4294967295)||TIERS.indexOf(v.tier)<0||!Array.isArray(v.history)||v.history.length>40)return null;
    var s=create(v.seed,v.tier);for(var i=0;i<v.history.length;i++)if(!move(s,v.history[i]))return null;return s;
  }
  function nextTier(tier,result){var i=TIERS.indexOf(tier);if(result==='win')i=Math.min(2,i+1);else if(result==='loss')i=Math.max(0,i-1);return TIERS[i];}
  function outcome(s){var q=scores(s);return q[0]>q[1]?'win':q[0]<q[1]?'loss':'draw';}
  function code(s){return 'NG1-'+s.tier.charAt(0).toUpperCase()+'-'+s.seed.toString(36).toUpperCase();}
  function parseCode(input){var m=/^NG1-([EMH])-([0-9A-Z]{1,7})$/.exec(String(input||'').trim().toUpperCase());if(!m)return null;var seed=parseInt(m[2],36);if(!integer(seed,0,4294967295))return null;return {seed:seed,tier:{E:'easy',M:'medium',H:'hard'}[m[1]]};}
  root.GridEngine={create:create,move:move,scores:scores,choose:choose,available:available,edges:edges,endpoints:endpoints,adjacent:adjacent,sides:sides,pack:pack,restore:restore,outcome:outcome,nextTier:nextTier,code:code,parseCode:parseCode,tiers:TIERS};
})(typeof window!=='undefined'?window:this);

/* Offline rules. Seedable randomness keeps balance probes reproducible. */
(function(root){
 'use strict';
 var TOTAL=10,CAP=10;
 var WAVES=[];
 for(var wi=0;wi<TOTAL;wi++){var tier=Math.max(1,Math.min(8,wi)),base=[44,72,88,100,114,125,140,155,172,195][wi];WAVES.push({count:[9,12,15,18,22,26,30,34,38,42][wi],hp:base*Math.pow(2.2,tier-1),speed:.046+wi*.0015,burst:wi<3?3:4,gap:Math.max(1.8,2.8-wi*.1),reward:30+wi*6});}
 function position(index){return {x:.18+(index%3)*.32,y:.60+Math.floor(index/3)*.145};}
 function damage(level){return Math.round(8*Math.pow(2.2,level-1));}
 function Game(random){this.random=random||Math.random;this.reset();}
 Game.prototype.reset=function(){this.coins=80;this.hp=100;this.wave=0;this.kills=0;this.merges=0;this.purchases=0;this.phase='prepare';this.prepLeft=0;this.board=Array(9).fill(null);this.board[3]={level:1,cooldown:0};this.board[5]={level:1,cooldown:0};this.enemies=[];this.shots=[];this.events=[];this.pending=0;this.clock=0;this.elapsed=0;this.nextId=1;this.spawned=0;this.leaks=0;this.lastReward=0;};
 Game.prototype.recruitLevel=function(){return Math.max(1,Math.min(8,this.phase==='prepare'?this.wave:this.wave-1));};
 Game.prototype.cost=function(){return Math.min(34,24+Math.floor(this.purchases/5)*2);};
 Game.prototype.emit=function(type,data){this.events.push({type:type,data:data});};
 Game.prototype.hire=function(){if(this.phase!=='prepare'&&this.phase!=='battle')return false;var pos=this.board.indexOf(null),cost=this.cost();if(pos<0||this.coins<cost)return false;this.board[pos]={level:this.recruitLevel(),cooldown:0};this.coins-=cost;this.purchases++;this.emit('hire',pos);return true;};
 Game.prototype.move=function(from,to){if((this.phase!=='prepare'&&this.phase!=='battle')||from===to||from<0||to<0||from>=9||to>=9)return false;var a=this.board[from],b=this.board[to];if(!a)return false;if(!b){this.board[to]=a;this.board[from]=null;return true;}if(a.level!==b.level||a.level>=CAP)return false;this.board[to]={level:b.level+1,cooldown:.3};this.board[from]=null;this.merges++;this.emit('merge',to);return true;};
 Game.prototype.start=function(){if(this.phase!=='prepare'||this.wave>=TOTAL)return false;this.wave++;this.pending=WAVES[this.wave-1].count;this.enemies=[];this.shots=[];this.clock=.6;this.spawned=0;this.prepLeft=0;this.phase='battle';this.emit('wave',this.wave);return true;};
 Game.prototype.spawn=function(){var w=WAVES[this.wave-1],boss=(this.wave===5||this.wave===TOTAL)&&this.spawned===10;
  var kind=boss?'boss':this.wave>=2&&this.spawned%5===2?'runner':this.wave>=3&&this.spawned%4===1?'tank':this.wave>=6&&this.spawned%3===0?'elite':'normal';
  var hp=w.hp*(kind==='boss'?(this.wave===10?6:5):kind==='tank'?1.85:kind==='elite'?1.45:kind==='runner'?.64:1);
  var lane=(this.spawned+this.wave)%3;
  this.enemies.push({id:this.nextId++,x:.18+lane*.32+(this.random()-.5)*.04,y:.025-Math.floor((this.spawned%w.burst)/3)*.08,hp:hp,maxHp:hp,speed:w.speed*(kind==='runner'?1.75:kind==='tank'?.74:kind==='boss'?.63:kind==='elite'?1.18:1),boss:boss,kind:kind,tier:Math.max(1,this.wave-1),sprite:boss?(this.wave===10?'enemy-final':'enemy-boss'):'enemy-'+kind,hit:0,leak:boss?40:kind==='tank'?20:kind==='elite'?16:12});this.pending--;this.spawned++;
 };
 Game.prototype.step=function(dt){dt=Math.min(Math.max(dt,0),.05);if(this.phase==='prepare'&&this.wave>0){this.prepLeft=Math.max(0,this.prepLeft-dt);if(this.prepLeft<=0)this.start();return;}if(this.phase!=='battle')return;this.elapsed+=dt;this.clock-=dt;var w=WAVES[this.wave-1];if(this.pending>0&&this.clock<=0){var count=Math.min(w.burst,this.pending);for(var n=0;n<count;n++)this.spawn();this.clock=w.gap;}
  for(var i=this.enemies.length-1;i>=0;i--){var e=this.enemies[i];e.y+=e.speed*dt;e.hit=Math.max(0,e.hit-dt);if(e.y>=.94){this.hp=Math.max(0,this.hp-e.leak);this.enemies.splice(i,1);this.leaks++;this.emit('hit',e.leak);if(this.hp===0){this.phase='defeat';this.emit('defeat',null);return;}}}
  for(var c=0;c<this.board.length;c++){var chef=this.board[c];if(!chef)continue;chef.cooldown-=dt;if(chef.cooldown>0)continue;var origin=position(c),cx=origin.x,range=chef.level>=6?.7:.45;
   var targets=this.enemies.filter(function(e){return Math.abs(e.x-cx)<range;}).sort(function(a,b){return (.94-a.y)/a.speed-(.94-b.y)/b.speed;});
   if(targets.length){this.shots.push({x:cx,y:origin.y,target:targets[0],level:chef.level});chef.cooldown=Math.max(.62,1.2-chef.level*.075);}}
  for(var s=this.shots.length-1;s>=0;s--){var b=this.shots[s];if(this.enemies.indexOf(b.target)<0){this.shots.splice(s,1);continue;}var dx=b.target.x-b.x,dy=b.target.y-b.y,dist=Math.sqrt(dx*dx+dy*dy),travel=1.65*dt;if(dist<=travel+.025){b.target.hp-=damage(b.level);b.target.hit=.13;if(b.target.hp<=0){this.enemies.splice(this.enemies.indexOf(b.target),1);this.coins+=b.target.boss?35:b.target.kind==='tank'||b.target.kind==='elite'?10+this.wave:6+this.wave;this.kills++;this.emit('kill',{x:b.target.x,y:b.target.y});}this.shots.splice(s,1);}else{b.x+=dx/dist*travel;b.y+=dy/dist*travel;}}
  if(!this.pending&&!this.enemies.length){this.shots=[];this.lastReward=w.reward;this.coins+=w.reward;this.phase=this.wave===TOTAL?'victory':'prepare';this.prepLeft=this.wave===TOTAL?0:8;var floor=this.recruitLevel();this.board.forEach(function(c){if(c&&c.level<floor)c.level=floor;});this.emit(this.wave===TOTAL?'victory':'intermission',w.reward);}
 };
 Game.prototype.power=function(){return this.board.reduce(function(sum,c){return sum+(c?damage(c.level):0);},0);};
 var api={Game:Game,damage:damage,TOTAL:TOTAL,CAP:CAP,WAVES:WAVES,position:position};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SushiRules=api;
})(typeof window!=='undefined'?window:this);

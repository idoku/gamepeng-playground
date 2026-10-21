(function(root){
  'use strict';
  var M=root.Matter;
  function World(def,onEvent){
    this.def=def;this.event=onEvent||function(){};this.engine=M.Engine.create({enableSleeping:true,positionIterations:8,velocityIterations:8});this.engine.gravity.y=1;this.engine.gravity.scale=.0012;
    this.blocks=[];this.cores=[];this.projectile=null;this.shots=0;this.score=0;this.elapsed=0;this.shotAge=0;this.idleAge=0;this.hitCount=0;this.maxChain=0;this.state='ready';this.destruction=[];this.usedTool='normal';this.toolUsed=false;
    var self=this;
    var ground=M.Bodies.rectangle(240,636,1000,44,{isStatic:true,friction:.8,restitution:.06});ground.plugin={kind:'ground'};M.Composite.add(this.engine.world,ground);
    def.blocks.forEach(function(d){var fixed=d.material==='pillar'||d.material==='reflector';var b=M.Bodies.rectangle(d.x,d.y,d.w,d.h,{isStatic:fixed,angle:d.angle||0,density:d.material==='steel'?.0018:.00085,friction:fixed?.25:.65,frictionStatic:.9,restitution:d.material==='reflector'?1.05:.06,frictionAir:.007,sleepThreshold:80});b.plugin={kind:'block',material:d.material,w:d.w,h:d.h,hp:d.material==='glass'?2:99,dead:false,crack:0};self.blocks.push(b);M.Composite.add(self.engine.world,b);});
    def.cores.forEach(function(d){var b=M.Bodies.circle(d.x,d.y,17,{isStatic:!!d.fixed,density:.001,friction:.6,restitution:.06});b.plugin={kind:'core',dead:false,initialY:d.y,hp:d.hp||1,maxHp:d.hp||1,lastProjectile:null};self.cores.push(b);M.Composite.add(self.engine.world,b);});
    for(var s=0;s<90;s++)M.Engine.update(this.engine,1000/120);
    this.cores.forEach(function(b){b.plugin.initialY=b.position.y;});
    M.Events.on(this.engine,'collisionStart',function(e){self.collide(e.pairs);});
  }
  World.prototype.alive=function(){return this.cores.filter(function(b){return !b.plugin.dead;}).length;};
  World.prototype.remaining=function(){return Math.max(0,this.def.shots-this.shots);};
  World.prototype.canShoot=function(){return !this.projectile&&this.remaining()>0&&(this.state==='ready'||this.state==='playing');};
  World.prototype.launch=function(dx,dy,tool){
    if(!this.canShoot())return false;
    tool=tool||'normal';if(['normal','shock','pierce','arc'].indexOf(tool)<0||(tool!=='normal'&&this.toolUsed))return false;
    var len=Math.sqrt(dx*dx+dy*dy);if(len<12||dx<=0)return false;
    var scale=Math.min(90,len)/len;dx*=scale;dy*=scale;
    var b=M.Bodies.circle(92,548,13,{density:.017,restitution:.35,friction:.08,frictionAir:.0015,sleepThreshold:200});
    b.plugin={kind:'projectile',dead:false,tool:tool,triggered:false};if(tool!=='normal'){this.toolUsed=true;this.usedTool=tool;}M.Body.setVelocity(b,{x:dx*.29,y:dy*.29});M.Composite.add(this.engine.world,b);this.projectile=b;this.shots++;this.shotAge=0;this.idleAge=0;this.hitCount=0;this.state='playing';this.event('fire',{x:92,y:548,tool:tool});return true;
  };
  World.prototype.destroy=function(b,cause){
    if(!b||b.plugin.dead||b.plugin.material==='pillar'||b.plugin.material==='reflector')return;
    b.plugin.dead=true;var p={x:b.position.x,y:b.position.y,kind:b.plugin.kind,cause:cause,material:b.plugin.material};this.destruction.push(p);M.Composite.remove(this.engine.world,b);
    // Removing a support does not produce a new contact to wake sleeping bodies.
    // Wake the remaining structure so unsupported pieces fall under gravity.
    if(b.plugin.kind==='block')this.blocks.concat(this.cores).forEach(function(part){if(!part.plugin.dead)M.Sleeping.set(part,false);});
    if(b.plugin.kind==='core'){this.score+=500;this.event('core',p);}else{this.score+=80;this.event('break',p);}
    this.hitCount++;this.maxChain=Math.max(this.maxChain,this.hitCount);
  };
  World.prototype.damageCore=function(b,other,cause){
    if(b.plugin.dead)return;
    if(other&&other.plugin.kind==='projectile'){if(b.plugin.lastProjectile===other.id)return;b.plugin.lastProjectile=other.id;}
    if(b.plugin.hp>1&&other&&other.plugin.tool==='pierce'){b.plugin.hp=1;this.score+=150;this.event('shield',{x:b.position.x,y:b.position.y});this.destroy(b,'pierce');return;}
    if(b.plugin.hp>1){b.plugin.hp--;this.score+=150;this.event('shield',{x:b.position.x,y:b.position.y});}else this.destroy(b,cause);
  };
  World.prototype.power=function(projectile,x,y){
    var kind=projectile.plugin.tool;if(kind==='normal'||projectile.plugin.triggered)return;projectile.plugin.triggered=true;var self=this,targets=[];
    if(kind==='shock'){
      this.cores.forEach(function(b){if(!b.plugin.dead&&Math.hypot(b.position.x-x,b.position.y-y)<82)self.damageCore(b,projectile,'shock');});
      this.blocks.forEach(function(b){if(b.plugin.dead||b.isStatic)return;var dx=b.position.x-x,dy=b.position.y-y,d=Math.hypot(dx,dy);if(d>=82)return;if(b.plugin.material==='glass')self.destroy(b,'shock');else{M.Sleeping.set(b,false);M.Body.applyForce(b,b.position,{x:dx/(d||1)*.012,y:dy/(d||1)*.012});}});
    }
    if(kind==='arc'){
      this.cores.filter(function(b){return !b.plugin.dead&&b.plugin.lastProjectile!==projectile.id&&Math.hypot(b.position.x-x,b.position.y-y)<=180;}).sort(function(a,b){return Math.hypot(a.position.x-x,a.position.y-y)-Math.hypot(b.position.x-x,b.position.y-y);}).slice(0,2).forEach(function(b){targets.push({x:b.position.x,y:b.position.y});self.damageCore(b,projectile,'arc');});
    }
    this.event('power',{x:x,y:y,tool:kind,radius:kind==='shock'?82:30,targets:targets});
  };
  World.prototype.collide=function(pairs){
    var self=this;if(!this.shots||this.state==='won'||this.state==='lost')return;
    pairs.forEach(function(pair){var a=pair.bodyA,b=pair.bodyB;if(!a.plugin||!b.plugin||a.plugin.dead||b.plugin.dead)return;
      var av=a.velocity,bv=b.velocity,dx=av.x-bv.x,dy=av.y-bv.y,force=Math.sqrt(dx*dx+dy*dy);
      [a,b].forEach(function(body){var other=body===a?b:a,kind=body.plugin.kind,ok=other.plugin.kind;
        if(kind==='core'&&((ok==='projectile'&&force>2)||(!body.isStatic&&((body.position.y-body.plugin.initialY>60&&force>2.4)||(force>8&&ok==='block'))))){self.damageCore(body,other,ok==='projectile'?'direct':'collapse');}
        if(kind==='block'&&body.plugin.material==='glass'&&((ok==='projectile'&&force>3.2)||(force>7.5&&ok==='block'))){body.plugin.hp-=force>8?2:1;body.plugin.crack++;if(body.plugin.hp<=0)self.destroy(body,'impact');else self.event('hit',{x:body.position.x,y:body.position.y,kind:kind});}
      });
      if(force>2){if(a.plugin.kind==='projectile')self.power(a,a.position.x,a.position.y);else if(b.plugin.kind==='projectile')self.power(b,b.position.x,b.position.y);}
      if(force>2&&((a.plugin.kind==='projectile')||(b.plugin.kind==='projectile'))){var surface=a.plugin.kind==='projectile'?b:a;self.event('impact',{x:pair.collision.supports[0]?pair.collision.supports[0].x:a.position.x,y:pair.collision.supports[0]?pair.collision.supports[0].y:a.position.y,power:force,material:surface.plugin.material});}
    });
  };
  World.prototype.step=function(dt){
    if(this.state==='won'||this.state==='lost')return;
    this.elapsed+=dt;M.Engine.update(this.engine,dt*1000);
    var self=this;
    if(this.shots){this.cores.forEach(function(b){if(!b.plugin.dead&&!b.isStatic&&(b.position.y-b.plugin.initialY>95||b.position.y>640||b.position.x<-30||b.position.x>520))self.destroy(b,'collapse');});}
    if(this.projectile){this.shotAge+=dt;var b=this.projectile;var p=b.position;
      if(this.shotAge>4.3||p.x>600||p.x<-100||p.y>710||(this.shotAge>1.2&&b.speed<.8)){M.Composite.remove(this.engine.world,b);this.projectile=null;this.idleAge=0;this.event('reload',{});}
    }
    if(this.shots&&!this.projectile){this.idleAge+=dt;var moving=this.blocks.concat(this.cores).some(function(b){return !b.plugin.dead&&b.speed>.45;});
      if(this.alive()===0&&this.idleAge>.65){this.state='won';var stars=this.shots<=this.def.optimal?3:this.shots<=this.def.two?2:1;this.score+=stars*1000;this.event('win',{stars:stars,score:this.score,shots:this.shots,maxChain:this.maxChain});}
      else if(this.remaining()===0&&this.idleAge>1.3&&(!moving||this.idleAge>6)){this.state='lost';this.event('lose',{score:this.score,shots:this.shots});}
    }
  };
  World.prototype.dispose=function(){M.Events.off(this.engine);M.Composite.clear(this.engine.world,false);M.Engine.clear(this.engine);};
  function trajectory(dx,dy,steps){var len=Math.sqrt(dx*dx+dy*dy),factor=len>90?90/len:1,x=92,y=548,vx=dx*factor*.29,vy=dy*factor*.29,points=[];for(var i=1;i<=Math.min(steps||170,516);i++){vx*=.99925;vy=vy*.99925+1/6;x+=vx*.5;y+=vy*.5;if(i%5===0)points.push({x:x,y:y});if(x>490||x<0||y>615)break;}return points;}
  root.TowerPhysics={World:World,trajectory:trajectory};if(typeof module!=='undefined'&&module.exports)module.exports=root.TowerPhysics;
})(typeof window!=='undefined'?window:global);

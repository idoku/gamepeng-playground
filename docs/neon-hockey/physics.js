/* Standalone H5 physics. Source geometry/rules reference: Neon Blitz Hockey.
 * No Astrocade runtime, remote requests or injected game state. */
(function(root){
  'use strict';
  var C={w:720,h:1280,left:60,right:660,top:140,bottom:1140,mid:640,goalLeft:260,goalRight:460,striker:40,puck:20,maxSpeed:1200,burstSpeed:2400};
  var tiers={
    easy:{interval:.34,xSpeed:170,ySpeed:130,error:125,lead:0,serve:280,returnSpeed:380,maxSpeed:850,minimum:220,heat:100,boost:30,minCap:520,playerRadius:50},
    medium:{interval:.16,xSpeed:360,ySpeed:240,error:60,lead:.18,serve:360,returnSpeed:700,maxSpeed:1050,minimum:300,heat:140,boost:40,minCap:700,playerRadius:44},
    hard:{interval:.06,xSpeed:700,ySpeed:480,error:16,lead:.42,serve:420,returnSpeed:1100,maxSpeed:1200,minimum:360,heat:180,boost:55,minCap:820,playerRadius:40},
    impossible:{interval:.025,xSpeed:1050,ySpeed:720,error:4,lead:.42,serve:420,returnSpeed:1200,maxSpeed:1200,minimum:360,heat:180,boost:55,minCap:820,playerRadius:40}
  };
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function striker(y){return {x:360,y:y,tx:360,ty:y,vx:0,vy:0};}
  function Game(random){this.random=random||Math.random;this.top=striker(390);this.bottom=striker(890);this.puck={x:360,y:640,vx:0,vy:0};this.phase='menu';this.paused=false;this.mode='cpu';this.difficulty='medium';this.scores=[0,0];this.time=0;this.rally=0;this.boost=0;this.hits=0;this.maxRally=0;this.elapsed=0;this.events=[];this.winner=-1;this.keys={};}
  Game.prototype.profile=function(){return this.cupProfile||(this.mode==='cpu'?(tiers[this.difficulty]||tiers.medium):tiers.impossible);};
  Game.prototype.radius=function(side){return this.mode==='cpu'&&side===1?Math.min(65,this.profile().playerRadius+(this.perks?this.perks.wide*5:0)):C.striker;};
  Game.prototype.bounds=function(side){return this.fieldBounds?this.fieldBounds[side]:side===0?[145,575,225,600]:[145,575,680,1055];};
  Game.prototype.goalWidth=function(side){return this.cup&&side===1?this.profile().opponentGoal||200:this.mode==='cpu'&&this.difficulty==='easy'&&side===1?260:200;};
  Game.prototype.reset=function(){
    this.top=striker(390);this.bottom=striker(890);
    var angle=(this.random()-.5)*1.25,dir=this.random()<.5?-1:1;
    var serve=this.profile().serve;
    this.puck={x:360,y:640,vx:Math.sin(angle)*serve,vy:Math.cos(angle)*serve*dir};
    this.rally=0;this.boost=0;this.rallyHits=0;this.hot=false;this.lastHit=-1;this.chargedSide=-1;this.bank=false;this.bankCharge=false;this.goalBank=false;this.time=0;this.phase='countdown';this.keys={};this.aiClock=0;this.combo=0;this.lastPlayerHit=-99;this.playerContact=false;this.swingStrength=0;
    this.countdown=this.cup?(this.scores[0]+this.scores[1]===0?1.6:.65):(this.scores[0]+this.scores[1]===0?2.4:1.1);
  };
  Game.prototype.start=function(mode,difficulty,options){
    this.mode=mode||'cpu';this.difficulty=difficulty||'medium';this.cup=null;this.cupPractice=false;this.cupProfile=null;this.perks={wide:0,bank:0,shield:0,control:0,charge:0};this.picks=[];this.toWin=5;this.fieldBounds=[[145,575,225,600],[145,575,680,1055]];
    var cup=root.NeonCup;
    if(options&&cup&&cup.stage(options.stage)&&cup.validPicks(options.picks,options.practice===true?undefined:options.stage-1)&&options.picks.length<=options.stage-1&&this.mode==='cpu'){
      this.cup=cup.stage(options.stage);this.cupPractice=options.practice===true;this.difficulty=this.cup.difficulty;this.toWin=this.cup.win;this.picks=options.picks.slice();this.perks=cup.counts(this.picks);
      var base=tiers[this.difficulty],profile={};Object.keys(base).forEach(function(k){profile[k]=base[k];});Object.keys(this.cup.overrides).forEach(function(k){profile[k]=this.cup.overrides[k];},this);this.cupProfile=profile;
      var radius=this.radius(1),edge=Math.max(145,60+radius+48);this.fieldBounds[1]=[edge,720-edge,Math.max(680,640+radius+1),Math.min(1055,1140-radius-48)];
    }
    this.shieldCharges=this.perks.shield;this.energy=0;this.chargedShots=0;this.bestCombo=0;this.scores=[0,0];this.elapsed=0;this.hits=0;this.maxRally=0;this.winner=-1;this.paused=false;this.events=[];this.reset();
  };
  Game.prototype.startCup=function(n,picks,practice){var cup=root.NeonCup,s=cup&&cup.stage(n);if(!s||!cup.validPicks(picks,practice===true?undefined:n-1)||picks.length>n-1)return false;this.start('cpu',s.difficulty,{stage:n,picks:picks,practice:practice===true});return true;};
  Game.prototype.target=function(side,x,y){
    if(this.paused||this.phase==='menu'||this.phase==='result'||(this.mode==='cpu'&&side===0))return false;
    var s=side===0?this.top:this.bottom;
    var b=this.bounds(side);s.tx=clamp(x,b[0],b[1]);s.ty=clamp(y,b[2],b[3]);return true;
  };
  Game.prototype.emit=function(type,x,y,side){this.events.push({type:type,x:x,y:y,side:side});};
  Game.prototype.move=function(s,side,dt){
    var oldX=s.x,oldY=s.y,k=1-Math.pow(.7,dt*60);
    var b=this.bounds(side),dx=(clamp(s.tx,b[0],b[1])-s.x)*k,dy=(clamp(s.ty,b[2],b[3])-s.y)*k;
    if(this.mode==='cpu'&&side===0){var tier=this.profile();dx=clamp(dx,-tier.xSpeed*dt,tier.xSpeed*dt);dy=clamp(dy,-tier.ySpeed*dt,tier.ySpeed*dt);}
    else{var distance=Math.sqrt(dx*dx+dy*dy),maximum=1400*dt;if(distance>maximum){dx*=maximum/distance;dy*=maximum/distance;}}
    s.x=clamp(s.x+dx,b[0],b[1]);s.y=clamp(s.y+dy,b[2],b[3]);
    s.vx=(s.x-oldX)/dt;s.vy=(s.y-oldY)/dt;
  };
  Game.prototype.ai=function(dt){
    var p=this.puck,s=this.top,tier=this.profile();
    this.aiClock-=dt;if(this.aiClock>0)return;this.aiClock=tier.interval;
    if(p.y<640||(p.vy<0&&p.y<840)){
      // Predict a short, reflected segment; limited reach leaves bank shots playable.
      var lead=p.vy<0?clamp((p.y-330)/Math.max(100,-p.vy),0,tier.lead):0;
      var aim=p.x+p.vx*lead;
      while(aim<80||aim>640)aim=aim<80?160-aim:1280-aim;
      aim+=Math.sin(this.elapsed*2.2)*tier.error;
      s.tx=clamp(aim,145,575);
      if(p.y<s.y+100)s.ty=clamp(p.y-10,225,550);
      else s.ty=290;
      if((p.x<160||p.x>560)&&p.y<240)s.ty=Math.max(s.ty,240);
    }else{s.tx=360;s.ty=290;}
    var tactic=this.tactic();
    if(tactic==='keeper')s.ty=260;
    if(tactic==='rush'||tactic==='striker')s.ty=p.y>340&&p.y<850?clamp(p.y-100,300,550):300;
  };
  Game.prototype.tactic=function(){if(!this.cup)return '';return this.cup.tactic==='champion'?['keeper','rush','bank','striker'][Math.floor(this.elapsed/8)%4]:this.cup.tactic;};
  Game.prototype.forwardSwing=function(s,side){return Math.max(0,side===1?-s.vy:s.vy);};
  Game.prototype.gainEnergy=function(){
    this.combo=this.elapsed-this.lastPlayerHit<=6?this.combo+1:1;this.lastPlayerHit=this.elapsed;this.bestCombo=Math.max(this.bestCombo,this.combo);
    var before=this.energy;this.energy=Math.min(100,before+18+Math.min(4,this.combo-1)*4);this.emit('energy',this.puck.x,this.puck.y,1);
    if(before<100&&this.energy===100)this.emit('ready',this.bottom.x,this.bottom.y,1);
  };
  Game.prototype.collision=function(s,side){
    var p=this.puck,dx=p.x-s.x,dy=p.y-s.y,d=Math.sqrt(dx*dx+dy*dy);
    var contact=this.radius(side)+C.puck;if(d>=contact){if(side===1&&d>contact+3)this.playerContact=false;return;}
    var nx=d>1e-7?dx/d:0,ny=d>1e-7?dy/d:side===0?1:-1;
    p.x=s.x+nx*contact;p.y=s.y+ny*contact;
    var closing=(p.vx-s.vx)*nx+(p.vy-s.vy)*ny;
    if(closing<0){
      var cpu=this.mode==='cpu'&&side===0,soft=cpu&&(this.difficulty==='easy'||this.difficulty==='medium')&&!(this.cup&&this.cup.power),bounce=soft?1.08:1.5;
      p.vx=s.vx+nx*Math.abs(closing)*bounce;p.vy=s.vy+ny*Math.abs(closing)*bounce;
      this.hits++;this.rallyHits++;this.lastHit=side;this.bank=false;this.chargedSide=-1;
      this.bankCharge=side===1&&this.perks&&this.perks.bank>0;
      if(cpu&&this.tactic()==='bank'&&p.vy>0){var aim=(this.hits%2?960:-240)-p.x,ay=1120-p.y,m=Math.sqrt(aim*aim+ay*ay),v=Math.max(300,Math.sqrt(p.vx*p.vx+p.vy*p.vy));p.vx=aim/m*v;p.vy=ay/m*v;}
      var swing=Math.sqrt(s.vx*s.vx+s.vy*s.vy),forward=this.forwardSwing(s,side),power=!soft&&swing>(side===1&&this.perks?520-this.perks.charge*70:520),charged=false;
      if(side===1){
        var realReturn=!this.playerContact;this.playerContact=true;
        // Test readiness before this contact grants energy. Slow or backwards blocks retain it.
        charged=realReturn&&this.energy===100&&forward>=240;
        this.swingStrength=clamp(forward/1100,0,1);
        var speed=Math.sqrt(p.vx*p.vx+p.vy*p.vy),incoming=Math.sqrt(closing*closing),wanted=Math.min(this.profile().maxSpeed,Math.max(this.profile().minimum,incoming*.82)+forward*.48);
        if(charged){wanted=C.burstSpeed;this.energy=0;this.combo=0;this.lastPlayerHit=-99;this.chargedSide=1;this.chargedShots++;}
        else if(realReturn)this.gainEnergy();
        if(speed>0){p.vx*=wanted/speed;p.vy*=wanted/speed;}
        // Keep the shot aimed away from the player's goal even when contact is side-on.
        if(charged){p.vy=-Math.max(Math.abs(p.vy),wanted*.48);}
      }else if(power){var v=Math.sqrt(p.vx*p.vx+p.vy*p.vy);if(v>0&&v<850){p.vx*=850/v;p.vy*=850/v;}}
      this.limit();this.emit(charged?'charged':power?'power':'hit',p.x,p.y,side);
      if(!this.hot&&this.rallyHits>=3){this.hot=true;this.emit('hot',p.x,p.y,side);this.limit();}
    }
  };
  Game.prototype.limit=function(){
    var p=this.puck,v=Math.sqrt(p.vx*p.vx+p.vy*p.vy),tier=this.profile(),maximum=this.chargedSide===this.lastHit&&this.chargedSide>=0?C.burstSpeed:this.mode==='cpu'&&this.lastHit===0?Math.min(tier.maxSpeed,tier.returnSpeed*(1-(this.perks?this.perks.control*.1:0))):tier.maxSpeed;
    if(v>maximum){p.vx*=maximum/v;p.vy*=maximum/v;v=maximum;}
    var minimum=Math.min(maximum,tier.minCap,tier.minimum+this.boost*tier.boost+(this.hot?tier.heat:0));
    if(v>0&&v<minimum){p.vx*=minimum/v;p.vy*=minimum/v;}
    // Keep rallies travelling between halves instead of skimming one rail forever.
    v=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
    if(v>0&&Math.abs(p.vy)<v*.28){p.vy=(p.vy<0?-1:p.vy>0?1:p.y<640?1:-1)*v*.28;p.vx=(p.vx<0?-1:1)*Math.sqrt(v*v-p.vy*p.vy);}
  };
  Game.prototype.goal=function(side){
    if(this.phase!=='playing')return;
    this.scores[side]++;this.phase='goal';this.time=0;this.goalBank=this.bank&&this.lastHit===side;
    if(side===0)this.energy=Math.max(0,this.energy-15);this.combo=0;this.lastPlayerHit=-99;this.playerContact=false;
    this.maxRally=Math.max(this.maxRally,this.rally);
    this.emit('goal',this.puck.x,side===1?140:1140,side);
    if(this.scores[side]>=(this.toWin||5))this.winner=side;
    this.keys={};
  };
  Game.prototype.step=function(dt){
    // The burst travels at twice normal maximum speed. At most 10 logical pixels
    // per slice keeps paddle/rail contacts reliable without speeding up clocks.
    var slices=this.phase==='playing'&&this.chargedSide>=0?Math.max(1,Math.ceil(dt*240)):1;
    for(var i=0;i<slices;i++)this.advance(dt/slices);
  };
  Game.prototype.advance=function(dt){
    if(this.paused||this.phase==='menu'||this.phase==='result')return;
    this.time+=dt;
    if(this.phase==='countdown'){
      if(this.time>=this.countdown){this.phase='playing';this.time=0;this.emit('serve',360,640);}
      return;
    }
    if(this.phase==='goal'){
      if(this.time>=(this.cup?(this.winner>=0?1.3:.7):(this.winner>=0?1.6:1.05))){
        if(this.winner>=0){this.phase='result';this.emit('result',360,640,this.winner);}
        else this.reset();
      }return;
    }
    this.elapsed+=dt;this.rally+=dt;this.maxRally=Math.max(this.maxRally,this.rally);
    if(this.combo&&this.elapsed-this.lastPlayerHit>6)this.combo=0;
    var k=this.keys,speed=720*dt;
    if(this.mode==='cpu')this.ai(dt);
    else{
      this.top.tx+=(k.d?speed:0)-(k.a?speed:0);this.top.ty+=(k.s?speed:0)-(k.w?speed:0);
      this.top.tx=clamp(this.top.tx,145,575);this.top.ty=clamp(this.top.ty,225,600);
    }
    this.bottom.tx+=(k.arrowright?speed:0)-(k.arrowleft?speed:0);
    this.bottom.ty+=(k.arrowdown?speed:0)-(k.arrowup?speed:0);
    var bounds=this.bounds(1);this.bottom.tx=clamp(this.bottom.tx,bounds[0],bounds[1]);this.bottom.ty=clamp(this.bottom.ty,bounds[2],bounds[3]);
    this.move(this.top,0,dt);this.move(this.bottom,1,dt);
    var p=this.puck;
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    var drag=Math.pow(this.cup ? .999 : .998,dt*60);p.vx*=drag;p.vy*=drag;
    var boost=Math.floor(this.rally/(this.cup?3:5));
    if(boost>this.boost){p.vx*=1.05;p.vy*=1.05;this.boost=boost;this.emit('boost',p.x,p.y);}
    this.limit();
    var wall=false;
    if(p.x<80){p.x=80;p.vx=Math.abs(p.vx);wall=true;this.bank=true;this.emit('wall',p.x,p.y);}
    if(p.x>640){p.x=640;p.vx=-Math.abs(p.vx);wall=true;this.bank=true;this.emit('wall',p.x,p.y);}
    if(wall&&this.bankCharge&&this.lastHit===1){var boost=1+this.perks.bank*.12;p.vx*=boost;p.vy*=boost;this.bankCharge=false;this.limit();this.emit('bankpower',p.x,p.y,1);}
    this.collision(this.top,0);this.collision(this.bottom,1);
    // Puck must fit inside the goal mouth; outside edges are solid rails.
    var topHalf=this.goalWidth(1)/2-C.puck,bottomHalf=this.goalWidth(0)/2-C.puck;
    if(p.y<160){
      if(p.x>360-topHalf&&p.x<360+topHalf){this.goal(1);return;}
      p.y=160;p.vy=Math.abs(p.vy);this.emit('wall',p.x,p.y);
    }
    if(p.y>1120){
      if(p.x>360-bottomHalf&&p.x<360+bottomHalf){if(this.shieldCharges>0){this.shieldCharges--;p.y=1108;p.vy=-Math.abs(p.vy);this.lastHit=1;this.bank=false;this.bankCharge=false;this.limit();this.emit('shield',p.x,1120,1);return;}this.goal(0);return;}
      p.y=1120;p.vy=-Math.abs(p.vy);this.emit('wall',p.x,p.y);
    }
  };
  root.HockeyPhysics={Game:Game,C:C,clamp:clamp};
})(typeof window!=='undefined'?window:typeof global!=='undefined'?global:this);

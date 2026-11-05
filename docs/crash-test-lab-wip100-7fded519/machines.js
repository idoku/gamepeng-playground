// All dimensions, timing and force values are authored calibration, not source constants.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const MACHINE_TYPES=Object.freeze(['saw','guillotine','anvil','pendulum','railSaw','springSpikes','inwardSpikes','chainBall','piston','wheel','electric','spikeWall','press','cleavers','spikeBay','conveyor','verticalSaw','pivotBlade','upPiston','crusher','railWheel','drum','barrier','bridge','pivotPlatform','tiltPlatform','swingPlatform','spikeBed','spikedWheel']);
export function createMachines(input){
  const configs=typeof input==='string'?[{type:input}]:input;
  return configs.map((config,index)=>{
    const type=config.type;
    if(!MACHINE_TYPES.includes(type))throw Error(`Unknown machine type: ${type}`);
    const definitions={
      saw:{x:303,y:555,r:41},guillotine:{x:310,y:425,w:76,h:27,minY:310,maxY:560},
      anvil:{x:106,y:255,w:90,h:44,movable:true},pendulum:{pivotX:250,pivotY:157,length:298,r:34,phase:.35,amplitude:.1},
      railSaw:{x:290,y:552,r:38,minX:80,maxX:342,direction:-1,movable:true},
      springSpikes:{x:245,y:579,w:94,h:20,minX:76,maxX:344,movable:true,spikeY:205,cooldown:0},
      inwardSpikes:{x:145,y:556,w:30,h:94,gap:116},chainBall:{pivotX:285,pivotY:150,length:260,r:34,angle:.3,movable:false},
      piston:{x:65,y:440,w:28,h:105,side:'left',travel:210},wheel:{x:310,y:555,r:43,movable:true,mass:8},
      electric:{x:210,y:582,w:130,h:17},spikeWall:{x:40,y:450,w:22,h:210,direction:'right'},
      press:{x:210,y:300,w:145,h:28,minY:280,maxY:535,baseY:588,opposing:false,label:'PRESS',squeeze:0},
      cleavers:{x:210,y:355,w:215,h:24},spikeBay:{x:115,y:568,w:155,h:30,crossbarY:445},
      conveyor:{x:195,y:585,w:260,h:24,speed:95},verticalSaw:{x:300,y:370,r:38,minY:300,maxY:548},
      pivotBlade:{x:265,y:450,pivotX:265,pivotY:583,length:230,w:230,h:23,angle:-Math.PI/2},
      upPiston:{x:210,y:574,w:116,h:25,stopY:350,travel:190},crusher:{x:210,y:500,w:70,h:190,gap:330,warning:false},
      railWheel:{x:310,y:552,r:38,minX:75,maxX:345,direction:-1,movable:true,robotActivation:true},
      drum:{x:300,y:535,r:50},spikedWheel:{x:300,y:553,r:38},barrier:{x:150,y:410,w:25,h:185,minX:100,maxX:340,railY:230},
      bridge:{x:210,y:440,w:220,h:20,hingeLeft:100,hingeRight:320,leafAngle:0},
      pivotPlatform:{x:210,y:405,w:230,h:20,pivotX:210,pivotY:405},
      tiltPlatform:{x:210,y:445,w:205,h:20,pivotX:210,pivotY:445,loadTorque:0},
      swingPlatform:{x:210,y:430,w:170,h:22,pivotX:210,pivotY:160,length:270,phase:0,amplitude:0},
      spikeBed:{x:210,y:588,w:170,h:30}
    };
    const m={id:`machine-${index}`,type,x:0,y:0,angle:0,omega:0,phase:0,held:false,movable:false,vx:0,vy:0,motionVx:0,motionVy:0,geometry:[],...definitions[type],...config};
    m.homeX=m.x;m.homeY=m.y;m.homeGap=m.gap;
    if(type==='guillotine'||type==='press')m.phase=Math.acos(clamp(1-2*(m.y-m.minY)/(m.maxY-m.minY),-1,1));
    if(type==='press')m.squeeze=clamp((m.y-m.minY)/(m.maxY-m.minY),0,1);
    if(type==='pendulum'){m.angle=Math.sin(m.phase)*m.amplitude;positionPendulum(m);}
    if(type==='chainBall')positionPendulum(m);
    if(type==='piston'){m.x=m.side==='left'?65:355;m.homeX=m.x;}
    if(type==='pivotBlade')positionBlade(m);
    if(type==='verticalSaw')m.phase=Math.acos(clamp(1-2*(m.y-m.minY)/(m.maxY-m.minY),-1,1));
    updateGeometry(m);return m;
  });
}
function positionPendulum(m){m.x=m.pivotX+Math.sin(m.angle)*m.length;m.y=m.pivotY+Math.cos(m.angle)*m.length;}
function positionBlade(m){m.x=m.pivotX+Math.cos(m.angle)*m.length/2;m.y=m.pivotY+Math.sin(m.angle)*m.length/2;}
export function updateGeometry(m){
  const circle=(x,y,r,role='blade',hazard=true)=>({shape:'circle',x,y,r,hazard,role,angle:0});
  const rect=(x,y,w,h,hazard=true,role='blade',angle=0)=>({shape:'rect',x,y,w,h,hazard,role,angle});
  const g=[];
  if(['saw','railSaw','verticalSaw','railWheel','drum','spikedWheel','wheel','chainBall'].includes(m.type))g.push(circle(m.x,m.y,m.r,['wheel','chainBall'].includes(m.type)?'impact':'blade'));
  if(m.type==='saw'&&m.support)g.push(rect(m.x,(m.y+603)/2,14,603-m.y,false,'support'));
  if(['drum','spikedWheel'].includes(m.type))g.push(rect(m.x,594,m.r*1.3,18,false,'base'));
  if(m.type==='pendulum')g.push(rect(m.x,m.y,68,54,true,'hammer',-m.angle));
  if(['guillotine','anvil'].includes(m.type))g.push(rect(m.x,m.y,m.w,m.h,true,m.type==='anvil'?'anvil':'blade'));
  if(m.type==='springSpikes')g.push(rect(m.x,m.y,m.w,m.h,false,'spring'),rect(m.x,m.spikeY,m.w+20,27,true,'spikesDown'));
  if(m.type==='inwardSpikes')g.push(rect(m.x-m.gap/2,m.y,m.w,m.h,false,'column'),rect(m.x+m.gap/2,m.y,m.w,m.h,false,'column'),rect(m.x-m.gap/2+m.w/2+6,m.y,12,m.h-8,true,'spikesRight'),rect(m.x+m.gap/2-m.w/2-6,m.y,12,m.h-8,true,'spikesLeft'));
  if(m.type==='piston')g.push(rect(m.x,m.y,m.w,m.h,true,'pistonPlate'));
  if(m.type==='electric')g.push(rect(m.x,m.y,m.w,m.h,true,'electric'),rect(m.x-m.w/2,m.y-15,10,45,false,'post'),rect(m.x+m.w/2,m.y-15,10,45,false,'post'));
  if(m.type==='spikeWall')g.push(rect(m.x,m.y,m.w,m.h,true,m.direction==='left'?'spikesLeft':'spikesRight'));
  if(m.type==='spikeBed')g.push(rect(m.x,m.y,m.w,m.h,true,'spikesUp'));
  if(m.type==='press')g.push(rect(m.x,m.y,m.w,m.h,true,'topPlate'),rect(m.x,m.baseY-(m.opposing?m.squeeze*120:0),m.w,24,true,'bottomPlate'));
  if(m.type==='cleavers')g.push(rect(m.x,m.y,m.w,m.h,true,'cleaver',m.angle));
  // Bay uprights are background framing: solid sides would seal the observed entry.
  if(m.type==='spikeBay')g.push(rect(m.x,m.y,m.w,m.h,true,'spikesUp'),rect(m.x,m.crossbarY,m.w+14,18,false,'crossbar'));
  if(m.type==='conveyor')g.push({...rect(m.x,m.y,m.w,m.h,false,'conveyor'),beltSpeed:m.speed});
  if(m.type==='pivotBlade')g.push(rect(m.x,m.y,m.w,m.h,true,'pivotBlade',m.angle));
  if(m.type==='upPiston')g.push(rect(m.x,m.y,m.w,m.h,true,'liftPlate'),rect(m.x,m.stopY,m.w+35,25,true,'impactStop'));
  if(m.type==='crusher')g.push(rect(m.x-m.gap/2,m.y,m.w,m.h,true,'leftCrusher'),rect(m.x+m.gap/2,m.y,m.w,m.h,true,'rightCrusher'));
  if(m.type==='barrier')g.push(rect(m.x,m.y,m.w,m.h,true,'barrier'));
  if(m.type==='bridge'){
    const length=(m.hingeRight-m.hingeLeft)/2,a=m.leafAngle;
    g.push(rect(m.hingeLeft+Math.cos(a)*length/2,m.y+Math.sin(a)*length/2,length,m.h,false,'bridgeLeft',a),rect(m.hingeRight-Math.cos(a)*length/2,m.y+Math.sin(a)*length/2,length,m.h,false,'bridgeRight',-a),rect(55,m.y+55,90,110,false,'scaffold'),rect(365,m.y+55,90,110,false,'scaffold'));
  }
  if(['pivotPlatform','tiltPlatform'].includes(m.type))g.push(rect(m.x,m.y,m.w,m.h,false,'platform',m.angle),rect(m.pivotX,(m.pivotY+603)/2,16,603-m.pivotY,false,'support'));
  if(m.type==='swingPlatform')g.push(rect(m.x,m.y,m.w,m.h,false,'swingPlatform'));
  m.geometry=g.map(s=>({vx:0,vy:0,omega:0,...s}));
}
export function stepMachines(machines,dt,time,awake,grab,robotEngaged=awake){
  for(const m of machines){
    const x=m.x,y=m.y,angle=m.angle,previous=m.geometry;
    if(['saw','drum','spikedWheel'].includes(m.type))m.angle+=dt*7;
    if(['guillotine','press','verticalSaw'].includes(m.type)&&awake){m.phase+=dt*(m.type==='verticalSaw'?1.4:2.4);m.y=m.minY+(m.maxY-m.minY)*(.5-.5*Math.cos(m.phase));}
    if(m.type==='press')m.squeeze=clamp((m.y-m.minY)/(m.maxY-m.minY),0,1);
    if(m.type==='pendulum'){m.amplitude+=((awake?.65:.1)-m.amplitude)*(1-Math.exp(-1.6*dt));m.phase+=dt*1.65;m.angle=Math.sin(m.phase)*m.amplitude;positionPendulum(m);}
    if(m.type==='chainBall'&&awake){
      m.phase+=dt;m.omega+=(-Math.sin(m.angle)*3.4 + .35*Math.sin(m.phase*1.5)-m.omega*.15)*dt;
      if(m.held){const desired=clamp(Math.atan2(grab.x-m.pivotX,grab.y-m.pivotY),-1.35,1.35);m.omega+=(desired-m.angle)*30*dt-m.omega*7*dt;}
      m.omega=clamp(m.omega,-3,3);m.angle=clamp(m.angle+m.omega*dt,-1.4,1.4);positionPendulum(m);
    }
    if(['anvil','wheel'].includes(m.type)&&awake){
      if(m.type==='anvil'&&m.autoDrop&&robotEngaged)m.released=true;
      if(m.held){m.motionVx+=(grab.x+grab.offX-m.x)*55*dt-m.motionVx*9*dt;m.motionVy+=(grab.y+grab.offY-m.y)*55*dt-m.motionVy*9*dt;}
      else if(m.released||m.type==='wheel')m.motionVy+=1000*dt;
      if(m.held||m.released||m.type==='wheel'){
        m.motionVx=clamp(m.motionVx,-850,850);m.motionVy=clamp(m.motionVy,-850,850);m.x+=m.motionVx*dt;m.y+=m.motionVy*dt;
        const extent=m.r??m.w/2,limit=603-(m.r??m.h/2);
        if(m.x<=extent+5){m.x=extent+5;m.motionVx=Math.max(0,m.motionVx);}if(m.x>=415-extent){m.x=415-extent;m.motionVx=Math.min(0,m.motionVx);}
        if(m.y>=limit){m.y=limit;m.motionVy=Math.min(0,m.motionVy);m.motionVx*=Math.exp(-1.8*dt);}
        if(m.y<110+(m.r??m.h/2)){m.y=110+(m.r??m.h/2);m.motionVy=Math.max(0,m.motionVy);}
        if(m.type==='wheel')m.angle+=(m.x-x)/m.r;
      }
    }
    if(['railSaw','railWheel'].includes(m.type)){
      if(m.held)m.x+=clamp(grab.x+grab.offX-m.x,-850*dt,850*dt);
      else if(m.robotActivation?robotEngaged:awake)m.x+=m.direction*92*dt;
      if(m.x<=m.minX){m.x=m.minX;m.direction=1;}if(m.x>=m.maxX){m.x=m.maxX;m.direction=-1;}m.angle+=dt*7;
    }
    if(m.type==='springSpikes'){if(m.held)m.x=clamp(m.x+clamp(grab.x+grab.offX-m.x,-850*dt,850*dt),m.minX,m.maxX);m.cooldown=Math.max(0,m.cooldown-dt);}
    if(m.type==='piston'&&awake){m.phase+=dt*1.9;m.x=m.homeX+(m.side==='left'?1:-1)*m.travel*(.5-.5*Math.cos(m.phase));}
    // Signed optional travel: source62/81 move left, source85 moves right.
    // Zero/absent travel keeps earlier static walls unchanged.
    if(m.type==='spikeWall'&&m.travel&&robotEngaged){m.phase+=dt*1.2;m.x=m.homeX-m.travel*(.5-.5*Math.cos(m.phase));}
    // Source83 opts into verified reopening; source70 retains one-way closure.
    // Earlier pairs and source80 remain static without closeTravel.
    if(m.type==='inwardSpikes'&&m.closeTravel>0&&robotEngaged){
      m.phase=m.cyclic?(m.phase+dt*1.25)%(Math.PI*2):Math.min(Math.PI,m.phase+dt*1.25);
      m.gap=m.homeGap-Math.min(m.closeTravel,m.homeGap-m.w-24)*(.5-.5*Math.cos(m.phase));
    }
    if(m.type==='electric')m.active=awake;
    if(m.type==='cleavers'&&awake)m.angle+=dt*1.9;
    if(m.type==='pivotBlade'&&awake){m.phase+=dt*1.5;m.angle=-Math.PI/2+.85*Math.sin(m.phase);positionBlade(m);}
    if(m.type==='upPiston'&&awake){m.phase+=dt*1.8;m.y=m.homeY-m.travel*(.5-.5*Math.cos(m.phase));}
    if(m.type==='crusher'&&robotEngaged){m.phase+=dt*.85;m.gap=330-230*(.5-.5*Math.cos(m.phase));m.warning=Math.sin(m.phase*14)>0;}
    if(m.type==='barrier'&&awake){m.phase+=dt*1.2;m.x=m.homeX+(m.maxX-m.homeX)*(.5-.5*Math.cos(m.phase));}
    if(m.type==='bridge'&&awake){m.phase+=dt*1.2;m.leafAngle=1.45*(.5-.5*Math.cos(m.phase));}
    if(m.type==='pivotPlatform'&&awake)m.angle+=dt*.65;
    if(m.type==='tiltPlatform'&&awake){m.omega+=(clamp(m.loadTorque,-8,8)-m.angle*12-m.omega*4)*dt;m.angle=clamp(m.angle+m.omega*dt,-.4,.4);m.loadTorque=0;}
    if(m.type==='swingPlatform'&&awake){m.amplitude+=(.65-m.amplitude)*(1-Math.exp(-dt));m.phase+=dt*1.2;m.swingAngle=Math.sin(m.phase)*m.amplitude;m.x=m.pivotX+Math.sin(m.swingAngle)*m.length;m.y=m.pivotY+Math.cos(m.swingAngle)*m.length;}
    m.vx=(m.x-x)/dt;m.vy=(m.y-y)/dt;const physicalOmega=(m.angle-angle)/dt;
    updateGeometry(m);
    m.geometry.forEach((s,i)=>{const old=previous[i];s.vx=old?(s.x-old.x)/dt:0;s.vy=old?(s.y-old.y)/dt:0;s.omega=old?((s.angle||0)-(old.angle||0))/dt:0;if(s.shape==='circle')s.omega=physicalOmega;});
  }
}

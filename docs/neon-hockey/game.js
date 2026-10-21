(function(){
  'use strict';
  var $=function(id){return document.getElementById(id);},canvas=$('arena'),ctx=canvas.getContext('2d'),P=window.NeonPlatform,R=window.HockeyRecords,Cup=window.NeonCup;
  var game=new window.HockeyPhysics.Game(),store=new P.Store({key:'neon-hockey-v1',clean:R.clean,validate:R.validate}),settings={skin:0,difficulty:'easy',balanceVersion:3,sound:true,effects:true};
  var skinNames=['霓光','烈焰','冰晶','星河','鎏金','赛博','翡翠','红晶','荧绿','虚空'];
  var skinColors=['#4ceaff','#ff8b37','#a4e8ff','#b37cff','#ffd368','#ff65cc','#4bffb0','#ff4971','#d2ff39','#e9faff'];
  var particles=[],rings=[],flares=[],trail=[],pointers={},accumulator=0,last=0,frame=0,flash=0,shake=0,impact=[0,0],banner='',bannerLife=0,railPulse=0,goalBeam=0,goalSide=1,arenaCache=null,glowStamps={};
  var loaded=false,matchId='',settled=false,latestRecord=null,latestFrame=null,activeChallenge=null,socialWasPaused=false,socialFocus=null,upgradeBusy=false,shieldFlash=0,selectedStage=null,grips={};
  var audio=null,voices=0,lastSfx=0,lastSfxKind='',card=null,sharing=false,toastTimer=null,reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(){
    var bodyStyle=window.getComputedStyle(document.body),padX=(parseFloat(bodyStyle.paddingLeft)||0)+(parseFloat(bodyStyle.paddingRight)||0),padY=(parseFloat(bodyStyle.paddingTop)||0)+(parseFloat(bodyStyle.paddingBottom)||0);
    var w=Math.min(window.innerWidth-padX,(window.innerHeight-padY)*.5625,470),h=w*16/9;
    $('game').style.width=w+'px';$('game').style.height=h+'px';
    $('game').classList.toggle('compact',h<720);$('game').classList.toggle('tiny',h<580);
    var dpr=Math.min(window.devicePixelRatio||1,1.75);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    arenaCache=document.createElement('canvas');arenaCache.width=canvas.width;arenaCache.height=canvas.height;
    var cached=arenaCache.getContext('2d');cached.setTransform(canvas.width/720,0,0,canvas.height/1280,0,0);paintArena(cached);
    ['#49f5ff','#ff66db','#ffad3e'].forEach(function(color){
      if(glowStamps[color])return;
      var stamp=document.createElement('canvas');stamp.width=128;stamp.height=128;
      var c=stamp.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64),rgb=color==='#49f5ff'?'73,245,255':color==='#ff66db'?'255,102,219':'255,173,62';
      g.addColorStop(0,'#ffffff');g.addColorStop(.12,color);g.addColorStop(.4,'rgba('+rgb+',.4)');g.addColorStop(1,'rgba('+rgb+',0)');
      c.fillStyle=g;c.fillRect(0,0,128,128);glowStamps[color]=stamp;
    });
  }
  function hide(id){$(id).hidden=true;}
  function show(id){$(id).hidden=false;}
  function toast(t){$('toast').textContent=t;show('toast');clearTimeout(toastTimer);toastTimer=setTimeout(function(){hide('toast');},2400);}
  function audioWake(){try{if(!audio){var A=window.AudioContext||window.webkitAudioContext;if(A)audio=new A();}if(audio&&audio.state==='suspended')audio.resume().catch(function(){});}catch(e){audio=null;}}
  function sound(kind){
    if(!audio||!settings.sound||voices>=8)return;
    var now=audio.currentTime;if(kind===lastSfxKind&&now-lastSfx<.055)return;lastSfx=now;lastSfxKind=kind;
    var tones=kind==='charged'?[55,110,220,880]:kind==='ready'?[440,660,880]:kind==='goal'?[130,523,659,784]:kind==='result'?[523,659,784,1047]:kind==='power'?[80,160,480]:kind==='hot'?[330,660,990]:kind==='hit'?[150+Math.random()*45]:kind==='wall'?[620+Math.random()*120]:kind==='serve'?[440,880]:[580];
    tones.forEach(function(f,i){
      try{var osc=audio.createOscillator(),gain=audio.createGain(),start=now+i*.085,duration=kind==='wall'?.07:kind==='hit'?.09:.17;
        osc.type=kind==='hit'||kind==='power'||kind==='charged'?'triangle':'sine';osc.frequency.setValueAtTime(f,start);osc.frequency.exponentialRampToValueAtTime(kind==='ready'?f*1.3:f*.6,start+duration);
        gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(kind==='wall'?.025:.07,start+.005);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
        osc.connect(gain);gain.connect(audio.destination);voices++;osc.onended=function(){voices--;osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+duration+.01);
      }catch(e){}
    });
  }
  function saveSettings(){store.update(function(v){v.settings={skin:settings.skin,difficulty:settings.difficulty,balanceVersion:3,sound:settings.sound,effects:settings.effects};return v;});}
  function clearInput(){pointers={};grips={};game.keys={};game.top.tx=game.top.x;game.top.ty=game.top.y;game.bottom.tx=game.bottom.x;game.bottom.ty=game.bottom.y;game.top.vx=game.top.vy=game.bottom.vx=game.bottom.vy=0;}
  function goMenu(){clearInput();game.phase='menu';game.paused=false;['hud','heat','talent-status','pause-panel','result','social','skins','help','hint','cup-panel','upgrade-panel','cup-reset-panel'].forEach(hide);show('menu');activeChallenge=null;updateCupEntry();}
  function updateCupEntry(){if(!loaded)return;var c=store.get().cup;$('cup-entry-detail').textContent=c.phase==='complete'?'已完成8关 · 再闯一次':c.phase==='upgrade'?'第'+c.stage+'关已过 · 选择强化':'8关疾速闯关 · 继续第'+c.stage+'关';}
  function openCup(selectOnly){
    if(!loaded)return;game.paused=true;clearInput();hide('menu');hide('result');hide('pause-panel');
    var run=store.get().cup;if(run.phase==='upgrade'&&selectOnly!==true){renderUpgrade();return;}
    if(selectOnly!==true||!Cup.stage(selectedStage))selectedStage=run.stage;
    show('cup-panel');hide('upgrade-panel');renderCup();
  }
  function renderCup(){
    var run=store.get().cup,plan=Cup.selection(run,selectedStage),s=Cup.stage(selectedStage);if(!plan)return;
    $('cup-heading').textContent=(plan.practice?'自由挑战 · ':'')+'第'+selectedStage+'关 · '+s.name;
    $('cup-tip').textContent=s.opponent+' · 疾速对攻 · 先得'+s.win+'分\n'+s.tip;
    $('cup-stage').textContent='';Cup.stages.forEach(function(stage){var option=document.createElement('option');option.value=String(stage.id);option.textContent=stage.id+' · '+stage.name;$('cup-stage').appendChild(option);});$('cup-stage').value=String(selectedStage);
    $('cup-route').textContent='';var selectedRow=null;Cup.stages.forEach(function(stage){var row=document.createElement('div');row.className='cup-stop'+(stage.id===run.stage?' current':'')+(stage.id===selectedStage?' selected':'');row.textContent=(stage.id===selectedStage?'已选 ':run.phase==='complete'||stage.id<run.stage?'已过 ':stage.id===run.stage?'闯关进度 ':'可挑战 ')+stage.id+' · '+stage.name+' / '+stage.opponent;$('cup-route').appendChild(row);if(stage.id===selectedStage)selectedRow=row;});if(selectedRow)$('cup-route').scrollTop=selectedRow.offsetTop-$('cup-route').offsetTop-8;
    $('cup-loadout').textContent=(Cup.labels(plan.picks).join(' · ')||'轻装上阵')+(plan.practice?'\n自由挑战不改变闯关进度，带入'+plan.picks.length+'项已获得强化。':'\n赢下本关继续选强化，保存闯关进度。');
    $('cup-start').hidden=false;$('cup-start').textContent=(plan.practice?'自由挑战第':'继续第')+selectedStage+'关';
    $('cup-continue').hidden=!plan.practice||run.phase==='complete';$('cup-continue').textContent=run.phase==='upgrade'?'领取过关强化':'回到第'+run.stage+'关';
    $('cup-new').hidden=run.stage===1&&run.phase==='ready'&&run.picks.length===0;$('cup-new').textContent=run.phase==='complete'?'再闯一次':'重新闯关';$('cup-save-status').textContent=P.status();
  }
  function renderUpgrade(){
    var run=store.get().cup;if(run.phase!=='upgrade'){openCup();return;}hide('cup-panel');hide('menu');hide('result');show('upgrade-panel');
    $('upgrade-heading').textContent='第'+run.stage+'关通过！';$('upgrade-tip').textContent='选一项强化，带去第'+(run.stage+1)+'关。重复选择会升级，最高3级。';$('upgrade-list').textContent='';
    var ranks=Cup.counts(run.picks);Cup.offers(run).forEach(function(id){var t=Cup.talent(id),b=document.createElement('button'),mark=document.createElement('span'),text=document.createElement('span'),name=document.createElement('b'),desc=document.createElement('small');b.className='talent-choice';b.style.borderColor=t.color;b.disabled=upgradeBusy;mark.className='talent-mark';mark.style.color=t.color;mark.textContent=t.mark;name.textContent=t.name+' · '+(ranks[id]+1)+'级';desc.textContent=t.desc+'（每级叠加）';text.appendChild(name);text.appendChild(desc);b.appendChild(mark);b.appendChild(text);b.addEventListener('click',function(){pickUpgrade(id);});$('upgrade-list').appendChild(b);});
    $('upgrade-owned').textContent=Cup.labels(run.picks).join(' · ')||'还没有强化，选出你的第一项。';$('upgrade-save-status').textContent=P.status();
  }
  function pickUpgrade(id){
    if(upgradeBusy)return;var before=store.get().cup;if(!Cup.choose(before,id))return;upgradeBusy=true;renderUpgrade();
    store.update(function(v){var next=Cup.choose(v.cup,id);if(next)v.cup=next;return v;}).then(function(ok){upgradeBusy=false;if(!ok)toast('强化已在本次生效，进度尚未保存');var after=store.get().cup;if(after.phase==='ready'&&after.stage===before.stage+1)start('cup');else renderUpgrade();});
  }
  function resetCup(){if(upgradeBusy)return;upgradeBusy=true;$('cup-reset-confirm').disabled=true;var seed=Math.floor(Math.random()*2147483647);store.update(function(v){v.cup=Cup.fresh(seed,v.cup.best);return v;}).then(function(ok){upgradeBusy=false;$('cup-reset-confirm').disabled=false;hide('cup-reset-panel');if(!ok)toast('本轮重新开始，进度尚未保存');openCup();});}
  function start(mode,plan){
    if(!loaded)return;
    var run=store.get().cup;if(mode==='cup'&&!plan&&run.phase!=='ready'){openCup();return;}
    audioWake();sound('ui');clearInput();
    if(mode!=='cup'){settings.difficulty=$('difficulty').value;saveSettings();}
    ['menu','pause-panel','result','social','skins','help','cup-panel','upgrade-panel','cup-reset-panel'].forEach(hide);show('hud');show('heat');hide('hint');
    if(mode==='cup'){game.startCup(plan?plan.stage:run.stage,plan?plan.picks:run.picks,plan&&plan.practice===true);show('talent-status');}else{game.start(mode,settings.difficulty);hide('talent-status');}resize();matchId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);settled=false;
    particles=[];rings=[];flares=[];trail=[];accumulator=0;last=0;flash=0;shake=0;shieldFlash=0;impact=[0,0];banner='';bannerLife=0;railPulse=0;goalBeam=0;
    $('top-name').textContent=game.cup?'对手':mode==='cpu'?'电脑':'上方';$('bottom-name').textContent=game.mode==='cpu'?'你':'下方';
    $('hint').textContent=game.cup?game.cup.opponent+' · '+game.cup.tip:mode==='cpu'?(settings.difficulty==='easy'?'拖动回击蓄能 · 满能向前挥拍爆发':'拖动下半场球拍 · 把冰球打进上方球门'):'同屏双人 · 各拖动自己的半场';
    updateHud();canvas.focus();
  }
  function pause(){if(game.phase==='menu'||game.phase==='result')return;game.paused=true;clearInput();$('pause-loadout').textContent=game.cup?(game.cupPractice?'自由挑战 · ':'闯关 · ')+'第'+game.cup.id+'关 · '+(Cup.labels(game.picks).join(' · ')||'暂无强化'):'';show('pause-panel');sound('ui');}
  function resume(){hide('pause-panel');game.paused=false;clearInput();last=0;accumulator=0;canvas.focus();}
  function updateHud(){
    $('top-score').textContent=game.scores[0];$('bottom-score').textContent=game.scores[1];
    var point=(game.toWin||5)-1;$('match-target').textContent=(game.cup?(game.cupPractice?'自由 ':'')+'第'+game.cup.id+'/8关 · ':'')+'先得'+(game.toWin||5)+'分';
    $('rally-label').textContent=game.scores[0]===point&&game.scores[1]===point?'决胜球 · 下一球定胜负':Math.max(game.scores[0],game.scores[1])===point?'赛点 · 守住这一球':activeChallenge?'挑战进行中':game.hot?'炽热对攻 · '+Math.floor(game.rally)+'秒':'连续回击蓄能 · 快挥拍更猛';
    var energy=game.energy||0,ready=energy===100;
    $('heat-fill').style.width=energy+'%';
    $('heat-label').textContent=ready?'蓄力就绪 · 向前挥拍爆发':'蓄能 '+energy+'%'+(game.combo>1?' · '+game.combo+'连击':' · 回击充能');
    $('heat').classList.toggle('hot',ready);
    $('swing-fill').style.width=Math.round((game.swingStrength||0)*100)+'%';
    $('swing-value').textContent=game.phase==='playing'?Math.round(Math.sqrt(game.puck.vx*game.puck.vx+game.puck.vy*game.puck.vy))+' 球速':'拖得越快，击球越猛';
    if(game.cup){var parts=[];Cup.talents.forEach(function(t){var rank=game.perks[t.id];if(rank)parts.push(t.id==='shield'?'盾 '+game.shieldCharges+'/'+rank:t.mark+' '+rank);});$('talent-status').textContent=parts.join(' · ')||'轻装上阵 · 过关后选择强化';}
  }
  function circle(c,x,y,r,color,width){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}
  function disc(c,x,y,r,skin,team){
    var color=skinColors[skin],g=c.createRadialGradient(x-r*.35,y-r*.4,r*.05,x,y,r);
    g.addColorStop(0,skin===9?'#516079':'#668fa9');g.addColorStop(.4,skin===9?'#0c1021':'#172e4a');g.addColorStop(1,'#040d1d');
    c.save();c.shadowColor=team||color;c.shadowBlur=22;c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();circle(c,x,y,r-2,color,4);c.shadowBlur=0;circle(c,x,y,r*.78,color,1.5);circle(c,x,y,r*.48,color,2);
    c.strokeStyle=color;c.lineWidth=2;c.beginPath();
    if(skin===2||skin===6||skin===7){for(var i=0;i<6;i++){var a=i*Math.PI/3;c.moveTo(x,y);c.lineTo(x+Math.cos(a)*r*.43,y+Math.sin(a)*r*.43);}}
    else if(skin===1){c.moveTo(x-r*.12,y-r*.3);c.lineTo(x+r*.2,y);c.lineTo(x,y+r*.3);c.lineTo(x-r*.25,y+r*.03);c.closePath();}
    else if(skin===3||skin===9){for(var j=0;j<14;j++){var aa=j*.6,rr=r*.36*j/14;if(j===0)c.moveTo(x,y);else c.lineTo(x+Math.cos(aa)*rr,y+Math.sin(aa)*rr);}}
    else{c.moveTo(x-r*.24,y-r*.23);c.lineTo(x+r*.23,y-r*.23);c.lineTo(x-r*.23,y+r*.23);c.lineTo(x+r*.24,y+r*.23);}
    c.stroke();c.globalAlpha=.65;circle(c,x,y,r+4,team||color,1);c.restore();
  }
  function renderSkins(){
    var saved=store.get();settings.skin=saved.settings.skin;
    $('skin-progress').textContent='胜利积分 '+saved.progress.points+' · 已打赢第'+saved.progress.bestStage+'关';
    $('skin-grid').textContent='';
    skinNames.forEach(function(name,i){
      var b=document.createElement('button'),c=document.createElement('canvas'),label=document.createElement('span'),requirement=document.createElement('small'),open=R.unlocked(saved,i),goal=R.skinGoals[i];
      c.width=100;c.height=100;disc(c.getContext('2d'),50,50,32,i);label.textContent=name+(open?'':' · 未解锁');requirement.className='skin-requirement';requirement.textContent=i===0?'默认已解锁':open?'已解锁':goal.points+'积分 / 过第'+goal.stage+'关';
      b.appendChild(c);b.appendChild(label);b.appendChild(requirement);b.disabled=!open;b.setAttribute('aria-pressed',String(settings.skin===i));
      b.addEventListener('click',function(){if(!R.unlocked(store.get(),i))return;settings.skin=i;store.update(function(v){return R.selectSkin(v,i);}).then(function(ok){settings.skin=store.get().settings.skin;if(!ok)toast('本次已换样式，尚未保存');renderSkins();});sound('ui');});$('skin-grid').appendChild(b);
    });
  }
  function burst(e){
    var subtle=reduced||!settings.effects,isCharge=e.type==='charged',big=e.type==='power'||isCharge,color=isCharge?'#ffad3e':e.side===0?'#ff66db':'#49f5ff',n=e.type==='goal'?(subtle?20:85):big?(subtle?5:isCharge?48:28):e.type==='hit'?(subtle?3:14):4;
    if(e.type==='wall')color='#9a7cff';
    if(e.type==='goal')particles=[];
    for(var i=0;i<n&&particles.length<100;i++){var a=Math.random()*Math.PI*2,s=e.type==='goal'?160+Math.random()*670:100+Math.random()*(e.type==='power'?440:240),life=e.type==='goal'?.85:e.type==='power'?.42:.3;particles.push({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:life,max:life,color:i%5===0?'#ffffff':color,width:e.type==='goal'?2+i%3:2,tail:e.type==='goal'?.055:.035});}
    if(e.type==='hit'||big){
      impact[e.side]=1;rings.push({x:e.x,y:e.y,r:14,life:e.type==='power'?.4:.25,max:e.type==='power'?.4:.25,color:color});
      if(!subtle){flares.push({x:e.x,y:e.y,life:e.type==='power'?.3:.18,max:e.type==='power'?.3:.18,size:e.type==='power'?145:88,color:color,angle:Math.atan2(game.puck.vy,game.puck.vx)});}
      if(e.type==='power'){banner='强力回击！';bannerLife=.55;shake=Math.max(shake,subtle?0:.2);if(!subtle)rings.push({x:e.x,y:e.y,r:28,life:.3,max:.3,color:'#ffffff'});}
      if(isCharge){banner='蓄力爆发！';bannerLife=.8;shake=Math.max(shake,subtle?0:.36);if(!subtle){rings.push({x:e.x,y:e.y,r:28,life:.42,max:.42,color:'#ffffff'});rings.push({x:e.x,y:e.y,r:60,life:.35,max:.35,color:'#ffad3e'});flares.push({x:e.x,y:e.y,life:.38,max:.38,size:210,color:'#ffad3e',angle:Math.atan2(game.puck.vy,game.puck.vx)});}}
    }
    if(e.type==='wall')railPulse=.16;
    if(e.type==='goal'){
      rings.push({x:e.x,y:e.y,r:10,life:.85,max:.85,color:color});if(!subtle){rings.push({x:e.x,y:e.y,r:45,life:.65,max:.65,color:'#ffffff'});rings.push({x:e.x,y:e.y,r:85,life:.5,max:.5,color:color});flares=[{x:e.x,y:e.y,life:.65,max:.65,size:320,color:color,angle:0}];}
      flash=subtle?.05:.18;shake=subtle?0:.4;goalBeam=1;goalSide=e.side;trail=[];
      banner=game.goalBank?'借墙绝杀！':e.side===1?'漂亮进球！':'对手得分';bannerLife=1.05;
    }
    while(rings.length>10)rings.shift();
    if(flares.length>6)flares.shift();
  }
  function drawFeedback(){
    var strong=settings.effects&&!reduced;
    ctx.save();ctx.beginPath();ctx.rect(60,140,600,1000);ctx.clip();ctx.globalCompositeOperation='lighter';
    if(goalBeam>0&&strong){
      var gy=goalSide===1?140:1140,dir=goalSide===1?1:-1,color=goalSide===1?'#49f5ff':'#ff66db',age=1-goalBeam;
      var rgb=goalSide===1?'73,245,255':'255,102,219',beam=ctx.createLinearGradient(0,gy,0,gy+dir*600);beam.addColorStop(0,'rgba('+rgb+',.7)');beam.addColorStop(.3,'rgba('+rgb+',.2)');beam.addColorStop(1,'rgba('+rgb+',0)');
      ctx.globalAlpha=goalBeam;ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(260,gy);ctx.lineTo(460,gy);ctx.lineTo(650,gy+dir*600);ctx.lineTo(70,gy+dir*600);ctx.closePath();ctx.fill();
      for(var b=0;b<12;b++){var a=.22+b*Math.PI/13,dist=40+age*520,len=35+goalBeam*65;ctx.globalAlpha=goalBeam*.65;ctx.strokeStyle=b%3?'#a9faff':'#ffffff';if(goalSide===0)ctx.strokeStyle=b%3?'#ff9de7':'#ffffff';ctx.lineWidth=b%3?2:4;ctx.beginPath();ctx.moveTo(360+Math.cos(a)*dist,gy+dir*Math.sin(a)*dist);ctx.lineTo(360+Math.cos(a)*(dist+len),gy+dir*Math.sin(a)*(dist+len));ctx.stroke();}
    }
    flares.forEach(function(f){
      if(!strong)return;var q=Math.max(0,f.life/f.max),size=f.size*(1.1-q*.3);ctx.globalAlpha=q*.75;ctx.drawImage(glowStamps[f.color],f.x-size,f.y-size,size*2,size*2);
      for(var i=0;i<4;i++){var a=f.angle+i*Math.PI/4,len=size*(i%2?.5:1);ctx.globalAlpha=q*q;ctx.strokeStyle=i%2?f.color:'#ffffff';ctx.lineWidth=i%2?2:3;ctx.beginPath();ctx.moveTo(f.x-Math.cos(a)*len,f.y-Math.sin(a)*len);ctx.lineTo(f.x+Math.cos(a)*len,f.y+Math.sin(a)*len);ctx.stroke();}
    });
    particles.forEach(function(pt){ctx.globalAlpha=Math.max(0,pt.life/pt.max);ctx.strokeStyle=pt.color;ctx.lineWidth=pt.width;ctx.beginPath();ctx.moveTo(pt.x,pt.y);ctx.lineTo(pt.x-pt.vx*pt.tail,pt.y-pt.vy*pt.tail);ctx.stroke();});
    rings.forEach(function(r){var q=Math.max(0,r.life/r.max);ctx.globalAlpha=q*(strong?.55:.3);circle(ctx,r.x,r.y,r.r,r.color,strong?10:4);ctx.globalAlpha=q;circle(ctx,r.x,r.y,r.r,'#eaffff',strong?2:1);});
    ctx.restore();
  }
  function paintArena(ctx){
    var bg=ctx.createLinearGradient(0,0,720,1280);bg.addColorStop(0,'#080d21');bg.addColorStop(1,'#0f1228');ctx.fillStyle=bg;ctx.fillRect(0,0,720,1280);
    var field=ctx.createLinearGradient(60,140,660,1140);field.addColorStop(0,'#151b31');field.addColorStop(.5,'#101929');field.addColorStop(1,'#142338');ctx.fillStyle=field;ctx.fillRect(60,140,600,1000);
    ctx.strokeStyle='#2a3c57';ctx.lineWidth=1;ctx.globalAlpha=.3;
    for(var x=80;x<650;x+=40){ctx.beginPath();ctx.moveTo(x,140);ctx.lineTo(x,1140);ctx.stroke();}
    for(var y=160;y<1130;y+=40){ctx.beginPath();ctx.moveTo(60,y);ctx.lineTo(660,y);ctx.stroke();}
    ctx.globalAlpha=1;ctx.shadowColor='#9d55ff';ctx.shadowBlur=24;ctx.strokeStyle='#a267ff';ctx.lineWidth=3;ctx.strokeRect(60,140,600,1000);ctx.shadowBlur=0;
    ctx.strokeStyle='#bb92ff';ctx.lineWidth=1;ctx.strokeRect(66,146,588,988);
    ctx.shadowColor='#8b49d4';ctx.shadowBlur=14;ctx.strokeStyle='#70459f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(60,640);ctx.lineTo(660,640);ctx.stroke();circle(ctx,360,640,60,'#7753ae',2);circle(ctx,360,640,8,'#7753ae',2);ctx.shadowBlur=0;
    [['#ff59d9',122,140,game.goalWidth(1)],['#37e5ff',1140,1158,game.goalWidth(0)]].forEach(function(g){var left=360-g[3]/2;ctx.shadowColor=g[0];ctx.shadowBlur=32;ctx.fillStyle=g[0];ctx.fillRect(left,g[1],g[3],g[2]-g[1]);ctx.fillStyle='#f4feff';ctx.fillRect(left+5,g[1]+4,g[3]-10,3);ctx.shadowBlur=0;});
    // Goal arcs retain uncluttered source geometry.
    circle(ctx,360,140,118,'#49304f',1.5);circle(ctx,360,1140,118,'#284b5a',1.5);
  }
  function draw(){
    ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(arenaCache,0,0);
    var sx=canvas.width/720,sy=canvas.height/1280,trauma=shake*shake;
    ctx.setTransform(sx,0,0,sy,Math.sin(frame*1.7)*trauma*34*sx,Math.sin(frame*2.1)*trauma*24*sy);
    var hot=game.hot,charged=game.chargedSide===1,puckColor=charged?'#ffe5a1':hot?'#ffad3e':'#71f7ff';
    if(hot||railPulse>0){ctx.globalAlpha=hot?.3+Math.sin(frame*.07)*.1:railPulse*2;ctx.strokeStyle=hot?'#ff9438':'#e3aaff';ctx.lineWidth=6;ctx.strokeRect(60,140,600,1000);ctx.globalAlpha=1;}
    var strong=settings.effects&&!reduced;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    for(var i=1;i<trail.length;i++){var t=trail[i],prev=trail[i-1];ctx.globalAlpha=Math.max(0,t.life)*(strong?.5:.2);ctx.strokeStyle=puckColor;ctx.lineWidth=Math.max(1,(strong?30:12)*t.life);ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(t.x,t.y);ctx.stroke();if(strong){ctx.globalAlpha=t.life*.8;ctx.strokeStyle='#e9ffff';ctx.lineWidth=Math.max(1,6*t.life);ctx.stroke();}}
    if(strong&&game.phase==='playing'){var pglow=game.puck;ctx.globalAlpha=hot?.8:.6;ctx.drawImage(glowStamps[hot?'#ffad3e':'#49f5ff'],pglow.x-62,pglow.y-62,124,124);}
    ctx.restore();
    drawFeedback();
    if(game.cup&&game.perks.shield>0&&(game.shieldCharges>0||shieldFlash>0)){ctx.save();ctx.globalAlpha=shieldFlash>0?.9:game.shieldCharges>0?.32:0;ctx.strokeStyle='#88bbff';ctx.lineWidth=shieldFlash>0?9:3;ctx.shadowColor='#79aaff';ctx.shadowBlur=settings.effects?18:0;ctx.beginPath();ctx.moveTo(260,1108);ctx.lineTo(460,1108);ctx.stroke();ctx.restore();}
    disc(ctx,game.top.x,game.top.y,game.radius(0)+impact[0]*4,0,'#ff57d5');disc(ctx,game.bottom.x,game.bottom.y,game.radius(1)+impact[1]*4,settings.skin,'#43e5ff');
    if(game.energy>0&&game.phase==='playing'){
      ctx.save();ctx.strokeStyle=game.energy===100?'#ffd174':'#65eaff';ctx.lineWidth=game.energy===100?5:3;ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(game.bottom.x,game.bottom.y,game.radius(1)+11,-Math.PI/2,-Math.PI/2+Math.PI*2*game.energy/100);ctx.stroke();
      if(game.energy===100&&strong){ctx.globalAlpha=.2+Math.sin(frame*.08)*.1;var size=game.radius(1)+42;ctx.drawImage(glowStamps['#ffad3e'],game.bottom.x-size,game.bottom.y-size,size*2,size*2);}ctx.restore();
    }
    var p=game.puck;ctx.shadowColor=puckColor;ctx.shadowBlur=settings.effects?32:12;ctx.fillStyle='#f5ffff';ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.fill();circle(ctx,p.x,p.y,21,puckColor,3);ctx.shadowBlur=0;
    if(flash>0){ctx.globalAlpha=flash*.35;ctx.fillStyle='#b6efff';ctx.fillRect(60,140,600,1000);ctx.globalAlpha=1;}
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(game.phase==='countdown'){
      var count=Math.ceil(game.countdown-game.time);ctx.font='bold 110px sans-serif';ctx.fillStyle='#d3c3ff';ctx.shadowColor='#794cff';ctx.shadowBlur=25;ctx.fillText(game.countdown<2?'准备！':String(Math.max(1,count)),360,640);ctx.shadowBlur=0;
      ctx.font='22px sans-serif';ctx.fillStyle='#a8bfdb';ctx.fillText(game.mode==='cpu'?'下半场，准备接球':'各守半场，准备开打',360,726);
    }else if(game.phase==='goal'){
      ctx.font='bold 56px sans-serif';ctx.fillStyle=goalSide===1?'#7effff':'#ff94e8';ctx.shadowBlur=18;ctx.shadowColor=ctx.fillStyle;ctx.fillText(banner||'进球！',360,640);ctx.shadowBlur=0;
      ctx.font='bold 76px sans-serif';ctx.fillText(game.scores[0]+' : '+game.scores[1],360,742);
    }
    if(bannerLife>0&&game.phase==='playing'){ctx.globalAlpha=Math.min(1,bannerLife*4);ctx.font='bold 34px sans-serif';ctx.fillStyle=hot?'#ffc778':'#9cffff';ctx.fillText(banner,360,570);ctx.globalAlpha=1;}
  }
  function settleMatch(){
    if(settled)return;settled=true;clearInput();
    latestRecord={id:matchId,rules:R.currentRules,mode:game.mode,difficulty:game.difficulty,top:game.scores[0],bottom:game.scores[1],seconds:Math.max(1,Math.round(game.elapsed*10)/10),at:Date.now()};
    if(game.cup){latestRecord.rules=Cup.rules;if(game.cupPractice)latestRecord.practice=true;latestRecord.mode='cup';latestRecord.stage=game.cup.id;latestRecord.toWin=game.toWin;latestRecord.picks=game.picks.slice();}
    latestFrame=document.createElement('canvas');latestFrame.width=360;latestFrame.height=640;latestFrame.getContext('2d').drawImage(canvas,0,0,360,640);card=null;
    var record=latestRecord;$('cup-next').disabled=true;store.update(function(v){v=R.add(v,record);if(record.mode==='cup'&&record.bottom===record.toWin)v.cup=Cup.win(v.cup,record.stage,record.practice);return v;}).then(function(ok){$('cup-next').disabled=false;updateCupEntry();if(record.mode==='cup'&&!ok)toast('战绩与进度暂未保存，请留意存档状态');});
    $('result-title').textContent=game.mode==='pvp'?(game.winner===0?'上方获胜！':'下方获胜！'):(game.winner===1?'漂亮！拿下这一场':'下一击，扳回来');
    $('result-score').textContent=game.scores[0]+' : '+game.scores[1];
    $('result-detail').textContent='有效对决 '+latestRecord.seconds+' 秒 · '+game.chargedShots+'次蓄力爆发 · 最佳'+game.bestCombo+'连击'+(R.rewardPoints(latestRecord)?' · 胜利积分 +'+R.rewardPoints(latestRecord):'')+(activeChallenge?(R.beat(latestRecord,activeChallenge)?' · 挑战成功！':' · 下次再挑战'):'');
    $('result-kicker').textContent=game.cup?(game.cupPractice?'自由挑战':'霓虹杯')+' · 第'+game.cup.id+'关':'MATCH COMPLETE';
    $('result-share').textContent=game.cup?(game.cupPractice?'晒挑战战绩':'晒闯关战绩'):'晒战绩 · 发起挑战';
    $('cup-next').hidden=!game.cup||(!game.cupPractice&&game.winner!==1);$('cup-next').textContent=game.cupPractice?'选择其他关卡':game.cup&&game.cup.id===8?'查看霓虹杯':'选择强化 · 下一关';$('rematch').hidden=!!game.cup&&!game.cupPractice&&game.winner===1;$('rematch').textContent=game.cup?'重试第'+game.cup.id+'关':'再来一场';
    if(game.cupPractice)$('result-title').textContent=game.winner===1?'拿下这关！再挑一关？':'再来一次，试试不同角度';else if(game.cup)$('result-title').textContent=game.winner===1?(game.cup.id===8?'霓虹杯，拿下了！':'第'+game.cup.id+'关通过！'):'再试一次，强化会保留';
    show('result');hide('hint');hide('heat');hide('talent-status');sound('result');
  }
  function makeCard(){
    if(!latestRecord||!latestFrame)return null;if(card)return card;
    var c=document.createElement('canvas');c.width=600;c.height=900;var cc=c.getContext('2d'),r=latestRecord;
    cc.fillStyle='#0b172b';cc.fillRect(0,0,600,900);cc.strokeStyle='#55d7e8';cc.lineWidth=3;cc.strokeRect(20,20,560,860);
    cc.textAlign='center';cc.fillStyle='#73f2ff';cc.font='bold 44px sans-serif';cc.fillText('霓虹冰球',300,82);
    cc.fillStyle='#c1d5e9';cc.font='18px sans-serif';cc.fillText(r.mode==='cup'?(r.practice?'自由挑战':r.rules===9?'极速蓄力霓虹杯':r.rules===7?'蓄力霓虹杯':r.rules===5?'疾速霓虹杯':'原版霓虹杯')+' · 第'+r.stage+'关 · '+Cup.stage(r.stage).opponent:r.mode==='cpu'?R.names[R.levels.indexOf(r.difficulty)]:'同屏双人',300,117);
    cc.drawImage(latestFrame,160,140,280,498);
    cc.fillStyle='#ebfaff';cc.font='bold 48px sans-serif';cc.fillText(r.top+' : '+r.bottom,300,704);
    cc.font='20px sans-serif';cc.fillText(r.mode==='cup'?(r.bottom===r.toWin?'通过本关 · ':'继续挑战 · ')+r.seconds+' 秒':r.mode==='cpu'?(r.bottom===5?'拿下对决 · ':'再来挑战 · ')+r.seconds+' 秒':'真实对决 · '+r.seconds+' 秒',300,743);
    cc.fillStyle='#9db7cd';cc.font='17px sans-serif';cc.fillText(R.encode(r)||'下一场，打出你的高光。',300,805);
    cc.font='14px sans-serif';var ranks=r.mode==='cup'?Cup.counts(r.picks):null;cc.fillText(r.mode==='cup'?(Cup.talents.filter(function(t){return ranks[t.id]>0;}).map(function(t){return t.mark+' '+ranks[t.id]+'级';}).join(' · ')||'轻装上阵'):'炽热对攻 · 先得 5 分 · 同难度挑战',300,840);card=c.toDataURL('image/png');return card;
  }
  function renderRecords(){
    var rows=R.table(store.get(),$('record-filter').value);$('record-list').textContent='';
    if(!rows.length){var empty=document.createElement('div');empty.className='record-empty';empty.textContent='完成一场对决，你的战绩就会出现在这里。';$('record-list').appendChild(empty);}
    rows.forEach(function(r,i){var row=document.createElement('div'),left=document.createElement('span'),right=document.createElement('span');row.className='record-row';left.textContent=r.mode==='cup'?(r.practice?'自由 ':r.rules===9?'极速蓄力 ':r.rules===7?'蓄力 ':r.rules===5?'疾速 ':'原版 ')+'第'+r.stage+'关 '+(r.bottom===r.toWin?'通过':'惜败')+' '+r.top+':'+r.bottom:(i+1)+'. '+($('record-filter').value==='legacy'?(r.mode==='pvp'?'双人 ':R.names[R.levels.indexOf(r.difficulty)]+' '):'')+(r.mode==='pvp'?(r.top===5?'上方胜':'下方胜'):(r.bottom===5?'获胜':'惜败'))+' '+r.top+':'+r.bottom;right.textContent=r.seconds+' 秒';row.appendChild(left);row.appendChild(right);$('record-list').appendChild(row);});
    var caps=P.capabilities();$('share-comment').disabled=!caps.comment||sharing;$('share-note').disabled=!caps.note||sharing;$('share-album').disabled=!caps.album||sharing;
    $('share-availability').textContent=caps.comment?'分享将打开小红书编辑页，由你确认发送。':'评论分享需小红书 9.49+；浏览器试玩可预览成绩卡和挑战码。';
    $('social-status').textContent=P.status();
  }
  function openSocial(){
    socialFocus=document.activeElement;socialWasPaused=game.paused;game.paused=true;clearInput();show('social');$('record-filter').value=game.cup?(game.cupPractice?'practice':'cup'):game.mode==='pvp'?'pvp':settings.difficulty;
    var image=makeCard();$('card-area').hidden=!image;if(image){$('score-card').src=image;$('challenge-out').value=latestRecord.mode==='cup'?'杯赛可晒战绩；挑战码用于单人对决':R.encode(latestRecord)||'赢得单人对决后即可生成挑战码';}
    renderRecords();$('social-close').focus();
  }
  function closeSocial(){hide('social');game.paused=socialWasPaused;last=0;accumulator=0;clearInput();if(socialFocus&&socialFocus.focus)socialFocus.focus();}
  function share(action){
    if(sharing||!latestRecord||!makeCard())return;sharing=true;renderRecords();
    var code=R.encode(latestRecord),snapshot=code?R.decode(code):{schema:1,game:'neon_hockey',page:'result'},text='我在「霓虹冰球」'+(latestRecord.mode==='cup'?(latestRecord.practice?'自由挑战第':'霓虹杯第')+latestRecord.stage+'关，':'')+'打出 '+latestRecord.top+':'+latestRecord.bottom+'，用时 '+latestRecord.seconds+' 秒。'+(code?'来挑战我：'+code:latestRecord.mode==='cup'?'你能闯到第几关？':'你能先拿到 5 分吗？');
    if(latestRecord.mode==='cup'){snapshot.mode='cup';snapshot.stage=latestRecord.stage;snapshot.picks=latestRecord.picks.slice();snapshot.rules=latestRecord.rules;if(latestRecord.practice)snapshot.practice=true;}
    P.share(action,card,text,JSON.stringify(snapshot),'这一击，把光打进球门').then(function(){toast(action==='album'?'成绩卡已保存':action==='comment'?'已打开评论编辑页，请确认发送':'已返回笔记编辑流程，审核结果以平台为准');},function(e){toast(/cancel/i.test(String(e&&e.errMsg||e&&e.message))?'已取消分享，战绩已保留':'分享未完成，战绩已保留；请稍后重试');}).then(function(){sharing=false;renderRecords();});
  }
  function join(){
    var c=R.decode($('challenge-in').value);if(!c||c.rules!==R.currentRules){$('social-status').textContent=c?'这是旧版挑战码；蓄力对决请使用 H8 挑战码。':'挑战码无效，请输入本游戏的 H8 开头挑战码。';return;}
    activeChallenge=c;$('difficulty').value=c.difficulty;start('cpu');toast('同难度挑战：少失球，再比用时');
  }
  function at(e){var r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*720/r.width,y:(e.clientY-r.top)*1280/r.height};}
  function down(id,point){if(game.paused||game.phase==='menu'||game.phase==='result')return;var side=point.y<640?0:1;if(game.mode==='cpu'&&side===0)return;
    var occupied=Object.keys(pointers).some(function(k){return pointers[k]===side;});if(occupied)return;pointers[id]=side;var s=side===0?game.top:game.bottom;grips[id]={x:point.x-s.x,y:point.y-s.y};audioWake();}
  function move(id,point){if(Object.prototype.hasOwnProperty.call(pointers,id)&&grips[id])game.target(pointers[id],point.x-grips[id].x,point.y-grips[id].y);}
  function release(id){delete pointers[id];delete grips[id];}
  if(window.PointerEvent){
    canvas.addEventListener('pointerdown',function(e){e.preventDefault();down(String(e.pointerId),at(e));try{canvas.setPointerCapture(e.pointerId);}catch(err){}});
    canvas.addEventListener('pointermove',function(e){move(String(e.pointerId),at(e));});
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(type){canvas.addEventListener(type,function(e){release(String(e.pointerId));});});
  }else{
    canvas.addEventListener('touchstart',function(e){e.preventDefault();Array.prototype.forEach.call(e.changedTouches,function(t){down(String(t.identifier),at(t));});},{passive:false});
    canvas.addEventListener('touchmove',function(e){e.preventDefault();Array.prototype.forEach.call(e.changedTouches,function(t){move(String(t.identifier),at(t));});},{passive:false});
    ['touchend','touchcancel'].forEach(function(type){canvas.addEventListener(type,function(e){Array.prototype.forEach.call(e.changedTouches,function(t){release(String(t.identifier));});});});
    canvas.addEventListener('mousedown',function(e){down('mouse',at(e));});window.addEventListener('mousemove',function(e){move('mouse',at(e));});window.addEventListener('mouseup',function(){release('mouse');});
  }
  window.addEventListener('keydown',function(e){
    if(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    var key=e.key.toLowerCase();if(key==='escape'){if(!$('skins').hidden)hide('skins');else if(!$('cup-panel').hidden||!$('upgrade-panel').hidden)goMenu();else if(!$('social').hidden)closeSocial();else if(!$('pause-panel').hidden)resume();else pause();return;}
    if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].indexOf(key)>=0){if(game.phase!=='menu')e.preventDefault();if(!game.paused&&game.phase==='playing')game.keys[key]=true;}
    if(key==='tab'&&!$('social').hidden){var items=$('social').querySelectorAll('button:not(:disabled),input,select'),first=items[0],end=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus();}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}}
  });
  window.addEventListener('keyup',function(e){game.keys[e.key.toLowerCase()]=false;});
  document.addEventListener('visibilitychange',function(){if(document.hidden){if(game.phase!=='menu'&&game.phase!=='result'){game.paused=true;if($('social').hidden)show('pause-panel');}clearInput();if(audio&&audio.state==='running')audio.suspend().catch(function(){});}last=0;accumulator=0;});
  window.addEventListener('blur',function(){clearInput();});
  function on(id,fn){$(id).addEventListener('click',fn);}
  on('cpu',function(){activeChallenge=null;start('cpu');});on('pvp',function(){if(this.hidden)return;activeChallenge=null;start('pvp');});
  on('cup-open',function(){openCup();});on('cup-close',goMenu);on('upgrade-close',goMenu);on('cup-start',function(){activeChallenge=null;start('cup',Cup.selection(store.get().cup,selectedStage));});on('cup-next',function(){selectedStage=game.cup.id;openCup(game.cupPractice);});on('cup-continue',function(){selectedStage=null;openCup();});on('pause-stage',function(){selectedStage=game.cup?game.cup.id:store.get().cup.stage;openCup(true);});on('upgrade-select',function(){selectedStage=store.get().cup.stage;openCup(true);});$('cup-stage').addEventListener('change',function(){selectedStage=Number(this.value);renderCup();});
  on('cup-new',function(){show('cup-reset-panel');});on('cup-reset-confirm',resetCup);on('cup-reset-cancel',function(){hide('cup-reset-panel');});
  on('pause',pause);on('resume',function(){audioWake();resume();});on('restart',function(){start(game.cup?'cup':game.mode,game.cupPractice?{stage:game.cup.id,picks:game.picks.slice(),practice:true}:null);});on('quit',goMenu);on('rematch',function(){start(game.cup?'cup':game.mode,game.cupPractice?{stage:game.cup.id,picks:game.picks.slice(),practice:true}:null);});on('result-menu',goMenu);
  ['skin-open','cup-skin','pause-skin','upgrade-skin'].forEach(function(id){on(id,function(){if(!game.paused&&game.phase!=='menu'&&game.phase!=='result')pause();renderSkins();show('skins');});});on('skin-close',function(){hide('skins');sound('ui');});
  on('help-open',function(){show('help');});on('help-close',function(){hide('help');});
  ['records-open','pause-records','result-share'].forEach(function(id){on(id,openSocial);});on('social-close',closeSocial);on('challenge-join',join);
  $('record-filter').addEventListener('change',renderRecords);$('difficulty').addEventListener('change',function(){settings.difficulty=this.value;saveSettings();});
  $('sound').addEventListener('change',function(){settings.sound=this.checked;saveSettings();audioWake();});
  $('effects').addEventListener('change',function(){settings.effects=this.checked;saveSettings();if(!settings.effects){shake=0;flash=0;flares=[];}});
  ['comment','note','album'].forEach(function(a){on('share-'+a,function(){share(a);});});
  P.subscribe(function(){$('save-status').textContent=P.status();$('cup-save-status').textContent=P.status();$('upgrade-save-status').textContent=P.status();if(!$('social').hidden)renderRecords();});
  $('cpu').disabled=true;$('pvp').disabled=true;$('cup-open').disabled=true;
  store.ready.then(function(){settings=store.get().settings;$('difficulty').value=settings.difficulty;$('sound').checked=settings.sound;$('effects').checked=settings.effects;loaded=true;$('cpu').disabled=false;$('pvp').disabled=false;$('cup-open').disabled=false;$('save-status').textContent=P.status();updateCupEntry();});
  function loop(now){
    var dt=last?Math.min((now-last)/1000,.05):0;last=now;
    if(!game.paused){accumulator+=dt;while(accumulator>=1/120){game.step(1/120);accumulator-=1/120;}
      if(game.phase==='playing'&&frame%2===0){trail.push({x:game.puck.x,y:game.puck.y,life:1});if(trail.length>22)trail.shift();}
      trail.forEach(function(t){t.life-=dt*3;});trail=trail.filter(function(t){return t.life>0;});
      particles.forEach(function(p){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;});particles=particles.filter(function(p){return p.life>0;});
      rings.forEach(function(r){r.r+=dt*620;r.life-=dt;});rings=rings.filter(function(r){return r.life>0;});flash=Math.max(0,flash-dt);
      flares.forEach(function(f){f.life-=dt;});flares=flares.filter(function(f){return f.life>0;});
      shieldFlash=Math.max(0,shieldFlash-dt);
      shake=Math.max(0,shake-dt);impact[0]=Math.max(0,impact[0]-dt*6);impact[1]=Math.max(0,impact[1]-dt*6);bannerLife=Math.max(0,bannerLife-dt);railPulse=Math.max(0,railPulse-dt);goalBeam=Math.max(0,goalBeam-dt*1.6);
    }
    while(game.events.length){var e=game.events.shift();if(['hit','power','charged','wall','goal'].indexOf(e.type)>=0)burst(e);if(e.type==='ready'){banner='蓄力就绪 · 向前挥拍！';bannerLife=1.2;}if(e.type==='shield'||e.type==='bankpower'){burst({type:'power',x:e.x,y:e.y,side:1});banner=e.type==='shield'?'护盾救回这一球！':'折光回击！';bannerLife=.7;if(e.type==='shield')shieldFlash=.55;sound('power');}if(e.type==='hot'&&game.energy!==100){banner='炽热对攻！';bannerLife=.9;if(settings.effects&&!reduced){flares.push({x:game.puck.x,y:game.puck.y,life:.35,max:.35,size:150,color:'#ffad3e',angle:0});if(flares.length>6)flares.shift();}}if(['hit','power','charged','ready','wall','goal','serve','hot'].indexOf(e.type)>=0)sound(e.type);}
    draw();if(game.phase==='result')settleMatch();if(frame%10===0)updateHud();frame++;requestAnimationFrame(loop);
  }
  window.addEventListener('resize',resize);resize();requestAnimationFrame(loop);
})();

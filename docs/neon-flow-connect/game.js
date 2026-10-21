(function () {
  'use strict';
  var $=function(id){return document.getElementById(id);},levels=window.NeonLevels,Audio=window.NeonAudio;
  var engine=new window.NeonEngine(levels[0]),index=0,playing=false,finishing=false,pointer=null,lastPoint=null,keyboard=[0,0];
  var board=$('board'),ctx=board.getContext('2d'),staticCanvas=document.createElement('canvas'),staticCtx=staticCanvas.getContext('2d');
  var width=440,cell=88,dpr=1,particles=[],rings=[],flights=[],charges=[],frame=0,lastFrame=0,completionTimer=null,toastTimer=null,blockedAt=0;
  var reduceMotion=window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  var store=window.FlowStore,saved=store.get(),guideDone=saved.guideDone;
  var chapters=window.NeonChapters||[{name:'初始光境',start:1,end:levels.length,hint:'点亮每一道光'}],mapChapter=chapterFor(saved.unlocked),chapterChosen=false;
  function chapterFor(id){for(var i=0;i<chapters.length;i++){if(id>=chapters[i].start&&id<=chapters[i].end)return i;}return 0;}
  function save(){store.update({unlocked:saved.unlocked,best:saved.best,sound:saved.sound,guideDone:guideDone});}
  var social=new window.FlowSocial({board:board,prepare:function(){cancelInput();keyboard.used=false;if(playing)render(performance.now(),0);},snapshot:function(){return playing?{level:index+1,name:engine.level.name,moves:engine.moves,connected:Object.keys(engine.paths).length,total:engine.level.pairs.length,finished:engine.complete()}:null;}});
  store.subscribe(function(){var value=store.get();saved=value;guideDone=value.guideDone;if(!playing){if(!chapterChosen)mapChapter=chapterFor(saved.unlocked);makeHome();}});
  function updateSound(){var on=Audio.isEnabled();$('sound').setAttribute('aria-pressed',String(on));$('sound').setAttribute('aria-label',on?'关闭声音':'开启声音');$('sound').textContent=on?'♫':'♪';}
  function unlockAudio(){if(saved.sound && !Audio.isEnabled()){Audio.set(true);updateSound();}}
  function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(function(){$('toast').classList.remove('visible');},1800);}
  function pair(id){return engine.level.pairs.filter(function(p){return p.id===id;})[0];}
  function point(c){return [(c[0]+.5)*cell,(c[1]+.5)*cell];}
  function tint(color,alpha){return 'rgba('+parseInt(color.slice(1,3),16)+','+parseInt(color.slice(3,5),16)+','+parseInt(color.slice(5,7),16)+','+alpha+')';}
  function makeHome(){
    $('levels').textContent='';
    var total=levels.filter(function(l){return !!saved.best[l.id];}).length;
    $('progress-text').textContent=total+' / '+levels.length+' 已点亮';
    $('play').firstChild.nodeValue=total===levels.length?'再走一遍光路 ':saved.unlocked>1?'继续探索光境 ':'点亮第一道光 ';
    $('chapters').textContent='';
    chapters.forEach(function(chapter,i){var b=document.createElement('button');b.className='chapter-button';b.textContent=chapter.name;b.setAttribute('aria-pressed',String(i===mapChapter));b.addEventListener('click',function(){mapChapter=i;chapterChosen=true;makeHome();});$('chapters').appendChild(b);});
    var chapter=chapters[mapChapter],chapterDone=levels.filter(function(l){return l.id>=chapter.start&&l.id<=chapter.end&&saved.best[l.id];}).length;
    $('chapter-hint').textContent=chapter.hint+' · '+chapterDone+'/'+(chapter.end-chapter.start+1)+' 已点亮'+(saved.unlocked<chapter.start?' · 完成第 '+(chapter.start-1)+' 关后解锁':'');
    levels.forEach(function(level,i){
      if(level.id<chapter.start||level.id>chapter.end)return;
      var b=document.createElement('button'),complete=!!saved.best[level.id],locked=i>=saved.unlocked;
      b.className='level-card'+(complete?' completed':'')+(locked?' locked':'');b.disabled=locked;
      b.setAttribute('aria-label',level.name+'，'+level.size+'乘'+level.size+'，'+level.pairs.length+'组光点'+(locked?'，未解锁':complete?'，已完成':''));
      var num=document.createElement('span');num.className='num';num.textContent='LIGHT '+('0'+level.id).slice(-2);b.appendChild(num);
      var name=document.createElement('span');name.className='name';name.textContent=level.name;b.appendChild(name);
      var meta=document.createElement('span');meta.className='meta';meta.textContent=level.size+' × '+level.size+' · '+level.pairs.length+' 组光点';b.appendChild(meta);
      var badge=document.createElement('span');badge.className='badge';badge.textContent=locked?'◇':complete?'✦':'↗';b.appendChild(badge);
      b.addEventListener('click',function(){load(i);});$('levels').appendChild(b);
    });
  }
  function removeModals(){['complete','help-modal','reset-modal','social-modal'].forEach(function(id){$(id).hidden=true;});}
  function clearFinish(){clearTimeout(completionTimer);finishing=false;$('complete').hidden=true;$('board-flash').classList.remove('burst');}
  function cancelInput(){engine.cancel();pointer=null;lastPoint=null;update();}
  function home(){cancelInput();clearFinish();removeModals();mapChapter=chapterFor(index+1);chapterChosen=true;playing=false;document.body.classList.remove('in-game');$('game').hidden=true;$('home').hidden=false;$('menu').disabled=true;makeHome();window.scrollTo(0,0);}
  function load(i){
    unlockAudio();Audio.play('ui');index=i;engine.load(levels[i]);keyboard=[0,0];pointer=null;lastPoint=null;clearFinish();removeModals();particles=[];rings=[];flights=[];charges=[];
    playing=true;document.body.classList.add('in-game');$('home').hidden=true;$('game').hidden=false;$('menu').disabled=false;window.scrollTo(0,0);
    $('level-kicker').textContent='LIGHT '+('0'+(i+1)).slice(-2);$('level-name').textContent=engine.level.name;$('grid-size').textContent=engine.level.size+' × '+engine.level.size;
    $('pair-count').textContent=' / '+engine.level.pairs.length+' 接通';$('pair-lights').textContent='';
    engine.level.pairs.forEach(function(p){var s=document.createElement('span');s.className='pair-light';s.style.background=p.color;s.style.color=p.color;s.setAttribute('aria-label','光路'+(Number(p.id)+1)+'未接通');$('pair-lights').appendChild(s);});
    resize();update();board.focus({preventScroll:true});
  }
  function update(){
    var count=Object.keys(engine.paths).length;$('connected').textContent=count;$('moves').textContent=engine.moves;$('undo').disabled=engine.history.length===0;
    var lights=$('pair-lights').children;
    engine.level.pairs.forEach(function(p,i){if(!lights[i])return;lights[i].classList.toggle('on',!!engine.paths[p.id]);lights[i].setAttribute('aria-label','光路'+(Number(p.id)+1)+(engine.paths[p.id]?'已接通':'未接通'));});
    if(count===0 && index===0 && !guideDone){$('guide').textContent='从青色光点出发，拖到另一个同色光点。';$('guide-dot').style.background='#35f2ff';}
    else if(count===engine.level.pairs.length){$('guide').textContent='全部接通，整座光境正在亮起来。';}
    else {$('guide').textContent=count?'已接通 '+count+' 条，再点亮剩下的颜色。':'连接同色光点，光路不能交叉。';}
  }
  function resize(){
    if(!playing)return;
    var wrap=$('board-wrap');wrap.style.width='100%';
    var gameRect=$('game').getBoundingClientRect(),wrapRect=wrap.getBoundingClientRect(),tail=gameRect.bottom-wrapRect.bottom,available=window.innerHeight-wrapRect.top-tail-20;
    wrap.style.width=Math.min(wrapRect.width,Math.max(250,available))+'px';
    var rect=board.getBoundingClientRect();width=rect.width||440;cell=width/engine.level.size;dpr=Math.min(1.5,window.devicePixelRatio||1);
    board.width=Math.round(width*dpr);board.height=Math.round(width*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    staticCanvas.width=board.width;staticCanvas.height=board.height;staticCtx.setTransform(dpr,0,0,dpr,0,0);drawStatic();
  }
  function drawStatic(){
    var c=staticCtx;c.clearRect(0,0,width,width);var bg=c.createLinearGradient(0,0,width,width);bg.addColorStop(0,'#0d1b2e');bg.addColorStop(1,'#080f21');c.fillStyle=bg;c.fillRect(0,0,width,width);
    for(var y=0;y<engine.level.size;y++)for(var x=0;x<engine.level.size;x++){
      c.fillStyle=(x+y)%2?'rgba(16,31,50,.12)':'rgba(25,53,82,.14)';c.fillRect(x*cell+1,y*cell+1,cell-2,cell-2);
    }
    c.lineWidth=.7;c.strokeStyle='#29445b';c.beginPath();for(var i=0;i<=engine.level.size;i++){c.moveTo(i*cell,0);c.lineTo(i*cell,width);c.moveTo(0,i*cell);c.lineTo(width,i*cell);}c.stroke();
    c.fillStyle='#46657f';for(y=0;y<=engine.level.size;y++)for(x=0;x<=engine.level.size;x++){c.fillRect(x*cell-1,y*cell-1,2,2);}
  }
  function cable(c,path,color,time,active){
    if(path.length<2)return;
    var coords=path.map(point),line=Math.max(4,cell*.14);c.lineCap='round';c.lineJoin='round';
    function stroke(size,shade,alpha,blur){c.beginPath();c.moveTo(coords[0][0],coords[0][1]);coords.slice(1).forEach(function(p){c.lineTo(p[0],p[1]);});c.lineWidth=size;c.strokeStyle=shade;c.globalAlpha=alpha;c.shadowColor=color;c.shadowBlur=blur;c.stroke();}
    stroke(line*(active?2.7:4.4),color,active ? .075 : .13,0);if(!active)stroke(line*1.8,color,.34,23);stroke(line,color,active ? .85 : .92,active?12:20);stroke(line*.60,color,1,0);stroke(Math.max(1,line*.20),'#f1ffff',active ? .9 : .86,0);
    c.globalAlpha=1;c.shadowBlur=0;
    if(!reduceMotion){
      var distance=(time*.0006+(parseInt(color.slice(1,3),16)||0))%(coords.length-1),j=Math.floor(distance),f=distance-j;
      var a=coords[j],b=coords[j+1],px=a[0]+(b[0]-a[0])*f,py=a[1]+(b[1]-a[1])*f;
      c.fillStyle='#ffffff';c.shadowColor=color;c.shadowBlur=20;c.beginPath();c.arc(px,py,Math.max(1.4,line*.30),0,Math.PI*2);c.fill();c.shadowBlur=0;
    }
  }
  function dot(c,p,xy,time,on){
    var q=point(xy),r=cell*.20,x=q[0],y=q[1];c.save();c.translate(x,y);
    var extent=on?2.7:2.1,glow=c.createRadialGradient(0,0,r*.3,0,0,r*extent);glow.addColorStop(0,tint(p.color,on ? .52 : .32));glow.addColorStop(1,tint(p.color,0));c.fillStyle=glow;c.fillRect(-r*extent,-r*extent,r*extent*2,r*extent*2);
    c.strokeStyle=p.color;c.lineWidth=1;c.globalAlpha=.38+(on ? .24 : 0);c.beginPath();c.arc(0,0,r*1.34,0,Math.PI*2);c.stroke();c.globalAlpha=1;
    c.rotate(reduceMotion?0:time*.00012*(Number(p.id)%2?-1:1));c.strokeStyle=p.color;c.lineWidth=1.8;
    for(var k=0;k<4;k++){var angle=k*Math.PI/2;c.beginPath();c.arc(0,0,r*1.5,angle,angle+.23);c.stroke();}c.rotate(reduceMotion?0:-time*.00012*(Number(p.id)%2?-1:1));
    var g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#ffffff');g.addColorStop(.23,p.color);g.addColorStop(1,'#142e40');
    c.shadowColor=p.color;c.shadowBlur=on?26:9;c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.shadowBlur=0;
    c.strokeStyle=p.color;c.lineWidth=1.2;c.stroke();c.fillStyle='#061325';c.font='700 '+Math.max(9,r*.84)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(Number(p.id)+1),0,.5);
    c.fillStyle='#ffffff';c.globalAlpha=.48;c.beginPath();c.ellipse(-r*.26,-r*.47,r*.34,r*.10,-.4,0,Math.PI*2);c.fill();c.restore();
  }
  function burst(cellPosition,color,big){
    var q=point(cellPosition);rings.push({x:q[0],y:q[1],color:color,start:performance.now(),life:big?1000:750,big:big});rings=rings.slice(-36);
    if(reduceMotion)return;
    var n=big?20:16;for(var i=0;i<n && particles.length<150;i++){var angle=Math.random()*Math.PI*2,speed=(big?150:95)+Math.random()*100;particles.push({x:q[0],y:q[1],vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,color:color,start:performance.now(),life:450+Math.random()*450,length:2+Math.random()*6});}
  }
  function effects(time,dt){
    rings=rings.filter(function(r){return time-r.start<r.life;});
    rings.forEach(function(r){var progress=Math.max(0,Math.min(1,(time-r.start)/r.life)),radius=(r.big?width*.55:cell*1.15)*progress+4;ctx.globalAlpha=(1-progress)*.8;ctx.strokeStyle=r.color;ctx.lineWidth=(r.big?3:2.5)*(1-progress)+.3;ctx.shadowColor=r.color;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(r.x,r.y,radius,0,Math.PI*2);ctx.stroke();});ctx.shadowBlur=0;ctx.globalAlpha=1;
    particles=particles.filter(function(p){return time-p.start<p.life;});
    particles.forEach(function(p){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.88,dt*60);p.vy*=Math.pow(.88,dt*60);var a=1-(time-p.start)/p.life;ctx.globalAlpha=a;ctx.strokeStyle=p.color;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.025,p.y-p.vy*.025);ctx.stroke();ctx.fillStyle='#ffffff';ctx.fillRect(p.x-1,p.y-1,2,2);});ctx.globalAlpha=1;
    flights=flights.filter(function(f){return time-f.start<900;});
    flights.forEach(function(f){var progress=Math.max(0,Math.min(1,(time-f.start)/900)),p=f.path,q=progress*(p.length-1),j=Math.min(p.length-2,Math.floor(q)),frac=q-j,a=point(p[j]),b=point(p[j+1]),x=a[0]+(b[0]-a[0])*frac,y=a[1]+(b[1]-a[1])*frac;var halo=ctx.createRadialGradient(x,y,0,x,y,cell*.46);halo.addColorStop(0,tint(f.color,.63));halo.addColorStop(1,tint(f.color,0));ctx.fillStyle=halo;ctx.fillRect(x-cell*.46,y-cell*.46,cell*.92,cell*.92);ctx.fillStyle='#ffffff';ctx.shadowColor=f.color;ctx.shadowBlur=30;ctx.beginPath();ctx.arc(x,y,cell*.105,0,Math.PI*2);ctx.fill();});ctx.shadowBlur=0;
  }
  function charge(time){charges=charges.filter(function(f){return time-f.start<1100&&engine.paths[f.id]===f.path;});charges.forEach(function(f){var progress=Math.max(0,Math.min(1,(time-f.start)/1100));ctx.save();ctx.globalAlpha=(1-progress)*.28;ctx.shadowColor=f.color;ctx.shadowBlur=28;ctx.strokeStyle=f.color;ctx.lineWidth=cell*(.36+.20*progress);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();f.path.forEach(function(p,i){var q=point(p);if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1]);});ctx.stroke();ctx.restore();});}
  function render(time,dt){
    ctx.clearRect(0,0,width,width);ctx.drawImage(staticCanvas,0,0,width,width);
    if(index===0 && !guideDone && Object.keys(engine.paths).length===0 && !engine.active){
      var cycle=reduceMotion ? .8 : (time%2200)/2200,from=point([0,0]),to=point([4,0]);
      ctx.strokeStyle='#35f2ff';ctx.globalAlpha=.20;ctx.setLineDash([3,8]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(from[0],from[1]);ctx.lineTo(to[0],to[1]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
      var hx=from[0]+(to[0]-from[0])*cycle;ctx.strokeStyle='#baffff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(hx,from[1],cell*.11,0,Math.PI*2);ctx.stroke();
    }
    Object.keys(engine.paths).forEach(function(id){cable(ctx,engine.paths[id],pair(id).color,time,false);});
    if(engine.active)cable(ctx,engine.active.path,pair(engine.active.id).color,time,true);
    charge(time);
    engine.level.pairs.forEach(function(p){dot(ctx,p,p.start,time,!!engine.paths[p.id]);dot(ctx,p,p.end,time,!!engine.paths[p.id]);});
    if(document.activeElement===board && pointer===null && keyboard.used){var q=point(keyboard);ctx.strokeStyle='rgba(255,255,255,.63)';ctx.lineWidth=1.5;ctx.strokeRect(q[0]-cell*.34,q[1]-cell*.34,cell*.68,cell*.68);}
    effects(time,dt);
  }
  function connected(result){
    update();var p=pair(result.id),path=engine.paths[result.id];guideDone=true;save();Audio.play(result.type==='complete'?'complete':'connect',Number(result.id));
    if(path){burst(path[0],p.color,false);burst(path[path.length-1],p.color,false);if(!reduceMotion){flights.push({path:path,color:p.color,start:performance.now()});flights=flights.slice(-8);charges.push({id:result.id,path:path,color:p.color,start:performance.now()});charges=charges.slice(-8);}}
    if(result.type==='complete'){
      finishing=true;var old=Number(saved.best[engine.level.id])||Infinity;saved.best[engine.level.id]=Math.min(old,engine.moves);saved.unlocked=Math.max(saved.unlocked,Math.min(levels.length,index+2));save();
      store.record(index+1,engine.moves);
      engine.level.pairs.forEach(function(p){burst(p.start,p.color,true);burst(p.end,p.color,true);});$('board-flash').classList.remove('burst');void $('board-flash').offsetWidth;$('board-flash').classList.add('burst');
      completionTimer=setTimeout(function(){
        var stars=engine.moves<=engine.level.pairs.length?3:engine.moves<=engine.level.pairs.length+2?2:1;
        $('complete-title').textContent=index===levels.length-1?levels.length+' 重光境，全部点亮。':'整个光境，被你点亮了。';
        $('complete-stats').textContent=engine.level.pairs.length+' 条光路 · '+engine.moves+' 次连线'+(engine.moves<=engine.level.pairs.length?' · 一次都没走弯路！':' · 接通就很棒。');
        $('complete-stars').textContent=Array(stars+1).join('✦ ') + Array(4-stars).join('· ');$('complete-stars').setAttribute('aria-label',stars+'星');
        $('next').textContent=index===levels.length-1?'回到光境地图 →':'前往下一重光境 →';$('complete').hidden=false;$('next').focus();
      },reduceMotion?180:950);
    }
  }
  function feedback(result){
    if(result.type==='start'){Audio.play('start',Number(result.id)*2);burst(engine.active.path[0],pair(result.id).color,false);$('guide').textContent='沿格子拖动，抵达同色光点后松手。';}
    if(result.type==='step' || result.type==='arrive'){Audio.play('step',engine.active.path.length);if(result.type==='arrive')burst(result.cell,pair(result.id).color,false);}
    if(result.type==='backtrack')Audio.play('backtrack');
    if(result.type==='erase'){Audio.play('erase');update();toast('这条光路已擦除，可重新连接。');}
    if(result.type==='blocked' && performance.now()-blockedAt>400){blockedAt=performance.now();Audio.play('blocked');$('board-wrap').classList.remove('shake');void $('board-wrap').offsetWidth;$('board-wrap').classList.add('shake');$('guide').textContent='这条路被挡住了，试试绕过去。';}
  }
  function localPoint(clientX,clientY){var rect=board.getBoundingClientRect();return {x:(clientX-rect.left)*width/rect.width,y:(clientY-rect.top)*width/rect.height};}
  function cellAt(p){return [Math.floor(p.x/cell),Math.floor(p.y/cell)];}
  function down(x,y,id){
    if(!playing || finishing || pointer!==null || social.isOpen() || !$('help-modal').hidden || !$('reset-modal').hidden)return;
    unlockAudio();lastPoint=localPoint(x,y);var result=engine.begin(cellAt(lastPoint));feedback(result);
    if(result.type==='start'){pointer=id;keyboard.used=false;}else lastPoint=null;
  }
  function move(x,y,id){
    if(id!==pointer || !engine.active || !lastPoint)return;
    var now=localPoint(x,y),distance=Math.max(Math.abs(now.x-lastPoint.x),Math.abs(now.y-lastPoint.y)),steps=Math.min(120,Math.max(1,Math.ceil(distance/(cell*.15))));
    for(var i=1;i<=steps;i++){var p={x:lastPoint.x+(now.x-lastPoint.x)*i/steps,y:lastPoint.y+(now.y-lastPoint.y)*i/steps};feedback(engine.step(cellAt(p)));}
    lastPoint=now;
  }
  function up(id,cancel){
    if(id!==pointer)return;pointer=null;lastPoint=null;
    if(cancel){engine.cancel();update();return;}
    var result=engine.release();if(result.type==='connect'||result.type==='complete')connected(result);else{update();if(result.type==='cancel')toast('还没有到终点，原来的光路已保留。');}
  }
  if(window.PointerEvent){
    board.addEventListener('pointerdown',function(e){if(e.isPrimary===false || (e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();down(e.clientX,e.clientY,e.pointerId);if(pointer!==null)try{board.setPointerCapture(e.pointerId);}catch(err){};});
    board.addEventListener('pointermove',function(e){if(e.pointerId===pointer){e.preventDefault();move(e.clientX,e.clientY,e.pointerId);}});
    board.addEventListener('pointerup',function(e){up(e.pointerId,false);});
    board.addEventListener('pointercancel',function(e){up(e.pointerId,true);});
    board.addEventListener('lostpointercapture',function(e){if(e.pointerId===pointer)up(e.pointerId,true);});
  }else{
    board.addEventListener('touchstart',function(e){if(e.changedTouches.length){var t=e.changedTouches[0];e.preventDefault();down(t.clientX,t.clientY,'t'+t.identifier);}},{passive:false});
    board.addEventListener('touchmove',function(e){for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];if(pointer==='t'+t.identifier){e.preventDefault();move(t.clientX,t.clientY,pointer);}}},{passive:false});
    board.addEventListener('touchend',function(e){for(var i=0;i<e.changedTouches.length;i++)up('t'+e.changedTouches[i].identifier,false);});
    board.addEventListener('touchcancel',function(e){for(var i=0;i<e.changedTouches.length;i++)up('t'+e.changedTouches[i].identifier,true);});
    board.addEventListener('mousedown',function(e){if(e.button===0){e.preventDefault();down(e.clientX,e.clientY,'mouse');}});
    window.addEventListener('mousemove',function(e){move(e.clientX,e.clientY,'mouse');});window.addEventListener('mouseup',function(){up('mouse',false);});
  }
  board.addEventListener('keydown',function(e){
    if(finishing||social.isOpen()||!$('help-modal').hidden||!$('reset-modal').hidden)return;
    var directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(directions[e.key]){e.preventDefault();keyboard.used=true;var d=directions[e.key],next=[keyboard[0]+d[0],keyboard[1]+d[1]];if(engine.inside(next)){if(engine.active){feedback(engine.step(next));var last=engine.active.path[engine.active.path.length-1];keyboard[0]=last[0];keyboard[1]=last[1];}else{keyboard[0]=next[0];keyboard[1]=next[1];}}}
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();unlockAudio();keyboard.used=true;if(engine.active){var result=engine.release();if(result.type==='connect'||result.type==='complete')connected(result);else update();}else feedback(engine.begin(keyboard));}
    else if(e.key==='Escape'){e.preventDefault();cancelInput();}
  });
  $('play').addEventListener('click',function(){load(Math.min(saved.unlocked-1,levels.length-1));});
  $('home-ranks').addEventListener('click',function(){social.open('rank');});$('social').addEventListener('click',function(){if(!finishing)social.open('rank');});$('complete-share').addEventListener('click',function(){social.open('share');});
  $('menu').addEventListener('click',home);
  $('sound').addEventListener('click',function(){saved.sound=!Audio.isEnabled();var on=Audio.set(saved.sound);if(saved.sound&&!on)toast('当前容器暂不支持声音，仍可继续玩。');saved.sound=on;updateSound();save();Audio.play('ui');});
  $('undo').addEventListener('click',function(){if(finishing)return;cancelInput();if(engine.undo()){Audio.play('erase');update();toast('已撤销上一步。');}});
  $('reset').addEventListener('click',function(){if(finishing)return;cancelInput();if(engine.moves===0){load(index);return;}$('reset-modal').hidden=false;$('reset-confirm').focus();});
  $('reset-confirm').addEventListener('click',function(){load(index);});$('reset-cancel').addEventListener('click',function(){$('reset-modal').hidden=true;board.focus({preventScroll:true});});
  $('help').addEventListener('click',function(){cancelInput();$('help-modal').hidden=false;$('help-close').focus();});$('help-close').addEventListener('click',function(){$('help-modal').hidden=true;board.focus({preventScroll:true});});
  $('next').addEventListener('click',function(){if(index===levels.length-1)home();else load(index+1);});$('replay').addEventListener('click',function(){load(index);});
  document.addEventListener('keydown',function(e){if(e.key!=='Escape')return;if(!$('help-modal').hidden){$('help-modal').hidden=true;board.focus();}if(!$('reset-modal').hidden){$('reset-modal').hidden=true;board.focus();}});
  window.addEventListener('resize',function(){cancelInput();resize();});window.addEventListener('blur',function(){if(pointer!==null)cancelInput();});
  document.addEventListener('visibilitychange',function(){if(document.hidden){cancelInput();cancelAnimationFrame(frame);frame=0;}else{lastFrame=0;if(!frame)frame=requestAnimationFrame(loop);}});
  function hero(time){
    var hc=$('hero-canvas'),h=hc.getContext('2d'),w=440;h.clearRect(0,0,w,240);
    var lines=[{color:'#35f2ff',pts:[[20,55],[90,55],[90,105],[220,105],[220,55],[415,55]]},{color:'#fb51cf',pts:[[25,170],[150,170],[150,140],[275,140],[275,90],[405,90]]},{color:'#b8fa50',pts:[[40,210],[40,190],[180,190],[180,215],[265,215]]}];
    h.strokeStyle='rgba(23,46,70,.16)';h.lineWidth=1;for(var gx=20;gx<w;gx+=35){h.beginPath();h.moveTo(gx,0);h.lineTo(gx,240);h.stroke();}for(var gy=15;gy<240;gy+=35){h.beginPath();h.moveTo(0,gy);h.lineTo(w,gy);h.stroke();}
    lines.forEach(function(l,idx){var p=l.pts;h.lineCap='round';h.lineJoin='round';function stroke(line,color,blur,alpha){h.beginPath();h.moveTo(p[0][0],p[0][1]);p.slice(1).forEach(function(q){h.lineTo(q[0],q[1]);});h.lineWidth=line;h.strokeStyle=color;h.globalAlpha=alpha;h.shadowColor=l.color;h.shadowBlur=blur;h.stroke();}
      stroke(14,l.color,26,.10);stroke(5,l.color,12,.9);stroke(1.2,'#ffffff',0,.7);h.globalAlpha=1;h.shadowBlur=0;
      [p[0],p[p.length-1]].forEach(function(q){h.fillStyle='#102338';h.strokeStyle=l.color;h.lineWidth=1.5;h.beginPath();h.arc(q[0],q[1],10,0,Math.PI*2);h.fill();h.stroke();h.fillStyle=l.color;h.shadowColor=l.color;h.shadowBlur=18;h.beginPath();h.arc(q[0],q[1],4.5,0,Math.PI*2);h.fill();h.shadowBlur=0;});
      if(!reduceMotion){var walk=(time*.0008+idx*2)%(p.length-1),j=Math.floor(walk),f=walk-j,a=p[j],b=p[j+1];h.fillStyle='#ffffff';h.shadowColor=l.color;h.shadowBlur=20;h.beginPath();h.arc(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,3,0,Math.PI*2);h.fill();h.shadowBlur=0;}
    });
  }
  function loop(time){
    if(document.hidden){frame=0;return;}
    var interval=(engine.active || particles.length || flights.length || charges.length)?16:33;
    if(time-lastFrame>=interval){var dt=Math.min(.05,(time-lastFrame)/1000)||.016;if(playing)render(time,dt);else hero(time);lastFrame=time;}
    frame=requestAnimationFrame(loop);
  }
  makeHome();$('menu').disabled=true;frame=requestAnimationFrame(loop);
}());

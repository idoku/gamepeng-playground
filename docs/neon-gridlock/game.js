(function(){
  'use strict';
  var E=window.GridEngine,R=window.GridRecords,P=window.NeonPlatform,$=function(id){return document.getElementById(id);};
  var store=new P.Store({key:'neon-gridlock-h5-save-v1',clean:R.clean,validate:R.valid});
  var s=E.create(1,'easy'),roundId='',phase='loading',panelKind='menu',ready=false,aiTimer=null,animation=null,lockUntil=0,lastLine=-1,hover=-1,fx=[],effects=true,sound=true,ctx=$('canvas').getContext('2d'),cw=500,audio=null,toastTimer=null;
  var names={easy:'新手场',medium:'进阶场',hard:'高手场'},bonusNames={extra:'额外回合',steal:'偷取方格',gift:'赠送方格'},colors=['#51efff','#ff70dc'];
  function escapeText(t){return String(t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function seed(){return (Date.now()^Math.floor(Math.random()*4294967296))>>>0;}
  function cancelAI(){clearTimeout(aiTimer);aiTimer=null;}
  function visible(){return !document.hidden;}
  function notify(t){$('message').textContent=t;}
  function prefs(){var d=store.get();sound=d.sound;effects=d.effects;return d;}
  function persist(){if(!roundId||!ready)return Promise.resolve(false);var board=E.pack(s),id=roundId;return store.update(function(d){d.active={id:id,board:board};return d;});}
  function tone(kind){
    if(!sound)return;try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();
      var pitches=kind==='line'?[280,420]:kind==='capture'?[440,660,880]:kind==='win'?[440,554,660,880]:kind==='loss'?[300,250,180]:kind==='extra'?[550,740,980]:kind==='steal'?[850,560,760]:[360,540,720];
      pitches.forEach(function(f,i){var now=audio.currentTime+i*.055,o=audio.createOscillator(),g=audio.createGain();o.type=kind==='line'?'sine':'triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.065,now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+.12);o.connect(g);g.connect(audio.destination);o.start(now);o.stop(now+.14);});
    }catch(e){}
  }
  function panel(html,kind){panelKind=kind||'menu';cancelAI();$('panel').innerHTML=html;$('overlay').classList.remove('hidden');sync();var first=$('panel').querySelector('button,select,input');if(first)first.focus();}
  function bind(id,fn){var el=$(id);if(el)el.addEventListener('click',fn);}
  function closePanel(){if(phase==='loading')return;$('overlay').classList.add('hidden');sync();scheduleAI();}
  function options(tier){return E.tiers.map(function(t){return '<option value="'+t+'"'+(t===tier?' selected':'')+'>'+names[t]+'</option>';}).join('');}
  function menu(){
    var d=prefs();panel('<h1>霓虹圈地</h1><p class="sub">轮流落笔，最后一边归你。<br>封一格，再走一步。</p><label for="difficulty">选择对手</label><select id="difficulty">'+options(d.tier)+'</select><button id="start" class="primary"'+(!ready?' disabled':'')+'>'+(ready?'开始抢格':'正在读取存档…')+'</button>'+(roundId&&phase==='play'?'<button id="continue">继续这一局</button>':'')+'<div class="row"><button id="learn">怎么玩</button><button id="challenge">挑战码</button></div><button id="menu-records" class="quiet">我的战绩 · 分享</button><p class="notice">封满16格，占得更多的一方获胜</p>','menu');
    bind('start',function(){var tier=$('difficulty').value;if(roundId&&phase==='play'&&s.history.length&&!window.confirm('开始新一局会替换未完成的棋盘，继续吗？'))return;
      if(!d.tutorial){guide(function(){start(seed(),tier);});return;}start(seed(),tier);
    });bind('continue',closePanel);bind('learn',function(){guide(menu);});bind('challenge',challengePanel);bind('menu-records',recordsPanel);
  }
  function guide(done){
    panel('<h2>最后一笔，抢到这一格</h2><p class="sub">你和电脑轮流点一条空边。<br><b>封完第四条边，格子就是你的，还能再画一笔。</b></p><div class="guide-demo" id="guide-box">⊔</div><button id="guide-close-edge" class="primary">点一下，封上最后一边</button><ul class="rules"><li><b>别轻易送出第三条边</b>：对手可能一口气抢走一串方格。</li><li><b>藏在格子里的惊喜</b>：额外回合、偷一格、送一格，封格后揭晓。</li></ul><p class="notice">这里是引导演示，不计入对局或战绩。</p><button id="guide-done" disabled>先试试封格</button>','guide');
    bind('guide-close-edge',function(){$('guide-box').textContent='▣';$('guide-box').style.textShadow='0 0 22px #00eaff';$('guide-close-edge').textContent='这格归你 · 还能再走！';$('guide-close-edge').disabled=true;$('guide-done').disabled=false;$('guide-done').textContent='明白了，开始抢格';tone('capture');});
    bind('guide-done',function(){store.update(function(d){d.tutorial=true;return d;});done();});
  }
  function start(value,tier){cancelAI();clearTimeout(toastTimer);$('toast').classList.remove('show');$('toast').textContent='';s=E.create(value,tier);roundId='ng-'+Date.now().toString(36)+'-'+value.toString(36);phase='play';lastLine=-1;hover=-1;fx=[];store.update(function(d){d.tier=tier;return d;});persist();$('overlay').classList.add('hidden');notify('你的回合 · 点两颗光点之间的空边');sync();paint();}
  function sync(){
    var q=E.scores(s);$('mine').textContent=q[0];$('theirs').textContent=q[1];$('extra-mine').textContent=s.extra[0]?'⚡ '+s.extra[0]+'次':'';$('extra-theirs').textContent=s.extra[1]?'⚡ '+s.extra[1]+'次':'';
    $('remaining').textContent=(16-q[0]-q[1])+'格未归属';$('turn').textContent=phase==='loading'?'正在准备':s.over?'本局结束':s.turn===0?'你的回合':'电脑思考中';$('turn').parentNode.className='turn'+(s.turn?' ai':'');$('tier-label').textContent=names[s.tier];$('combo').textContent=s.streak[s.turn]>1?'连续抢下 '+s.streak[s.turn]+' 格':'封一格，再走一步';$('storage').textContent=P.status();
    var blocked=phase!=='play'||s.turn!==0||s.over||!$('overlay').classList.contains('hidden')||!visible();
    Array.prototype.forEach.call($('edges').children,function(b){var i=Number(b.getAttribute('data-edge'));b.disabled=blocked||s.lines[i]!==-1;b.setAttribute('aria-label','空边 '+i+' · '+(i<20?'横线':'竖线')+(s.lines[i]!==-1?' · 已落笔':''));});
  }
  function showToast(t,p){clearTimeout(toastTimer);$('toast').textContent=t;$('toast').style.color=colors[p];$('toast').classList.add('show');toastTimer=setTimeout(function(){$('toast').classList.remove('show');},1100);}
  function animate(events){
    if(!effects||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)){paint();return;}
    var now=performance.now();events.forEach(function(ev){if(typeof ev.box!=='number')return;fx.push({box:ev.box,type:ev.type,player:ev.player,start:now});});fx=fx.slice(-16);if(!animation)animation=window.requestAnimationFrame(frame);
  }
  function frame(now){animation=null;if(!visible()){fx=[];return;}fx=fx.filter(function(f){return now-f.start<900;});paint(now);if(fx.length)animation=window.requestAnimationFrame(frame);}
  function action(i){
    if(phase!=='play'||!$('overlay').classList.contains('hidden')||!visible()||s.over)return false;
    var p=s.turn;if(!E.move(s,i))return false;lastLine=i;hover=-1;tone('line');
    var claims=s.events.filter(function(e){return ['claim','steal','gift','gift-chain'].indexOf(e.type)>=0;});
    if(claims.length){tone('capture');showToast(claims.length>1?'连抢 '+claims.length+' 格！':'这格归'+(p?'电脑':'你')+'！',p);}
    var extra=s.events.some(function(e){return e.type==='extra';}),steal=s.events.some(function(e){return e.type==='steal';}),gift=s.events.some(function(e){return e.type==='gift';});
    var msg=(p?'电脑':'你')+'画下了一笔';if(claims.length)msg=(p?'电脑':'你')+'抢下'+claims.length+'格';if(extra){msg+=' · ⚡额外回合';tone('extra');}if(steal){msg+=' · 偷取方格';tone('steal');}if(gift){msg+=' · 🎁赠送方格';tone('gift');}
    if(s.events.some(function(e){return e.type==='use-extra';}))msg+=' · 使用额外回合';notify(msg);lockUntil=performance.now()+(claims.length?220:75);sync();animate(s.events);paint();
    if(s.over){finish();}else{persist();scheduleAI();}return true;
  }
  function scheduleAI(){
    cancelAI();if(!ready||phase!=='play'||s.over||s.turn!==1||!visible()||!$('overlay').classList.contains('hidden'))return;
    aiTimer=setTimeout(function(){aiTimer=null;if(phase==='play'&&s.turn===1&&visible()&&$('overlay').classList.contains('hidden'))action(E.choose(s));},Math.max(520,lockUntil-performance.now()+60));
  }
  function finish(){
    phase='result';cancelAI();var board=E.pack(s),id=roundId;store.update(function(d){return R.settle(d,E.restore(board),id);});sync();tone(E.outcome(s)==='loss'?'loss':'win');
    setTimeout(function(){if(phase==='result'&&roundId===id&&visible())resultPanel();},600);
  }
  function resultPanel(){
    var q=E.scores(s),out=E.outcome(s),title={win:'这一局，你赢了！',loss:'再找一个好角度',draw:'势均力敌！'}[out];
    panel('<h2>'+title+'</h2><div class="result-score">'+q[0]+' : '+q[1]+'</div><p class="sub">'+names[s.tier]+' · 最长连抢 '+s.best[0]+' 格<br>棋盘归属已全部结算</p><button id="retry" class="primary">再来一局</button><button id="next-tier">'+(out==='win'&&s.tier!=='hard'?'挑战'+names[E.nextTier(s.tier,out)]:'换个难度')+'</button><button id="share-result">晒这一局</button><button id="result-home" class="quiet">回到首页</button>','result');
    bind('retry',function(){start(seed(),s.tier);});bind('next-tier',function(){if(out==='win'&&s.tier!=='hard')start(seed(),E.nextTier(s.tier,out));else menu();});bind('share-result',function(){sharePanel(s);});bind('result-home',menu);
  }
  function recordsPanel(){
    var d=prefs(),tier=s.tier||d.tier;panel('<h2>我的抢格战绩</h2><p class="sub">按难度分榜 · 格数优先，同分看最长连抢<br>只记录你真正完成的对局</p><select id="record-tier">'+options(tier)+'</select><ol class="record-list" id="record-list"></ol><button id="records-back" class="quiet">返回</button>','records');
    function list(){var rows=R.ranked(store.get(),$('record-tier').value);$('record-list').innerHTML=rows.length?rows.slice(0,10).map(function(r,i){return '<li><span>'+ (i+1)+'. '+r.score+' : '+r.opponent+' <small>连抢'+r.combo+'格</small></span><button class="history-share" data-id="'+escapeText(r.id)+'" style="width:auto;margin:0;padding:3px 7px;font-size:11px">分享</button></li>';}).join(''):'<li>还没有这一难度的完整战绩</li>';Array.prototype.forEach.call($('record-list').querySelectorAll('button'),function(b){b.addEventListener('click',function(){var id=b.getAttribute('data-id'),r=store.get().records.filter(function(v){return v.id===id;})[0];if(r)sharePanel(E.restore(r.board));});});}
    $('record-tier').addEventListener('change',list);list();bind('records-back',function(){if(phase==='result')resultPanel();else if(phase==='play')closePanel();else menu();});
  }
  function challengePanel(){panel('<h2>同一盘，换你来抢</h2><p class="sub">输入好友的挑战码，重开相同布局和难度。<br>各自和电脑对局，比一比谁抢得多。</p><input id="challenge-input" aria-label="挑战码" placeholder="NG1-E-……" maxlength="24"><p id="challenge-error" class="notice"></p><button id="challenge-go" class="primary">开始挑战</button><button id="challenge-back" class="quiet">返回首页</button>','challenge');bind('challenge-go',function(){var c=E.parseCode($('challenge-input').value);if(!c){$('challenge-error').textContent='挑战码格式不正确，请检查后重试。';return;}if(roundId&&phase==='play'&&s.history.length&&!window.confirm('挑战会替换未完成的一局，继续吗？'))return;start(c.seed,c.tier);});bind('challenge-back',menu);}
  function sharePanel(board){
    var q=E.scores(board),c=E.code(board),card=makeCard(board);panel('<h2>晒出这一盘</h2><p class="sub">'+names[board.tier]+' · '+q[0]+' : '+q[1]+' · 最长连抢'+board.best[0]+'格</p><img class="card" id="score-card" alt="本局真实棋盘成绩卡"><div class="challenge-code">'+c+'</div><p class="notice">长按或选中挑战码，手动复制给好友</p><button id="comment-share">评论晒战绩</button><div class="row"><button id="note-share">发笔记</button><button id="album-save">存相册</button></div><p id="share-state" class="notice">在小红书中打开，可使用平台分享功能</p><button id="share-back" class="quiet">返回</button>','share');$('score-card').src=card;
    function go(type){var btns=['comment-share','note-share','album-save'];btns.forEach(function(id){$(id).disabled=true;});$('share-state').textContent='正在准备成绩卡…';
      P.share(type,card,'霓虹圈地：'+names[board.tier]+'抢下'+q[0]+'格，对手'+q[1]+'格。挑战码 '+c,JSON.stringify({game:'neon-gridlock-h5',schema:1,code:c}),'这一盘，换你来抢').then(function(){if($('share-state'))$('share-state').textContent=type==='album'?'成绩卡已保存到相册':'已交给小红书，请在平台完成后续操作';},function(err){if($('share-state'))$('share-state').textContent=err&&err.message==='unsaved'?'存档尚未成功保存，请先检查存档提示':err&&err.message==='requires_949'?'评论分享需要小红书9.49及以上版本':'当前环境未完成分享，可使用挑战码；对局已保留';}).then(function(){btns.forEach(function(id){var b=$(id);if(b)b.disabled=false;});});}
    bind('comment-share',function(){go('comment');});bind('note-share',function(){go('note');});bind('album-save',function(){go('album');});bind('share-back',function(){if(phase==='result')resultPanel();else recordsPanel();});
  }
  function settingsPanel(){var d=prefs();panel('<h2>这一局，慢慢想</h2><p class="sub">菜单打开时，电脑不会继续落笔。</p><button id="resume" class="primary">'+(phase==='result'?'查看结算':'继续对局')+'</button><div class="row"><button id="toggle-sound">声音 '+(d.sound?'开':'关')+'</button><button id="toggle-fx">特效 '+(d.effects?'开':'关')+'</button></div><button id="settings-home">返回首页 / 换难度</button>','settings');bind('resume',function(){if(phase==='result')resultPanel();else closePanel();});bind('toggle-sound',function(){store.update(function(v){v.sound=!v.sound;return v;}).then(function(){prefs();settingsPanel();});});bind('toggle-fx',function(){store.update(function(v){v.effects=!v.effects;return v;}).then(function(){prefs();fx=[];paint();settingsPanel();});});bind('settings-home',menu);}
  function drawBoard(c,size,board,now,decorations){
    var pad=size*.1,step=size*.2;c.clearRect(0,0,size,size);c.fillStyle='#0b1124';c.fillRect(0,0,size,size);
    for(var b=0;b<16;b++){var p=board.boxes[b],x=pad+(b%4)*step,y=pad+Math.floor(b/4)*step;if(p>=0){var color=colors[p];c.fillStyle=p?'rgba(242,62,189,.16)':'rgba(30,224,240,.16)';c.fillRect(x+5,y+5,step-10,step-10);c.strokeStyle=p?'#f64cc34a':'#4ff4ff4a';c.lineWidth=1;c.strokeRect(x+8,y+8,step-16,step-16);c.font='bold '+Math.round(step*.24)+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.globalAlpha=.72;c.fillText(p?'◇':'◆',x+step/2,y+step/2);c.globalAlpha=1;}}
    for(var i=0;i<40;i++){var v=board.lines[i],e=E.endpoints(i);c.beginPath();c.moveTo(pad+e[0]*step,pad+e[1]*step);c.lineTo(pad+e[2]*step,pad+e[3]*step);c.lineCap='round';c.strokeStyle=v<0?'#273348':colors[v];c.lineWidth=v<0?1.3:4;c.shadowColor=v<0?'transparent':colors[v];c.shadowBlur=v<0?0:12;c.stroke();if(v>=0){c.lineWidth=1.3;c.strokeStyle='#f5ffff';c.shadowBlur=0;c.stroke();}}
    if(decorations&&hover>=0&&board.lines[hover]<0){var he=E.endpoints(hover);c.beginPath();c.moveTo(pad+he[0]*step,pad+he[1]*step);c.lineTo(pad+he[2]*step,pad+he[3]*step);c.strokeStyle='#6cf5ff';c.globalAlpha=.5;c.lineWidth=5;c.stroke();c.globalAlpha=1;}
    if(decorations&&lastLine>=0){var le=E.endpoints(lastLine);c.beginPath();c.arc(pad+(le[0]+le[2])/2*step,pad+(le[1]+le[3])/2*step,3.5,0,Math.PI*2);c.fillStyle='#fff';c.fill();}
    c.shadowBlur=0;for(var r=0;r<5;r++)for(var col=0;col<5;col++){var px=pad+col*step,py=pad+r*step;c.shadowColor='#75deff';c.shadowBlur=10;c.fillStyle='#cfedff';c.beginPath();c.arc(px,py,size*.0105,0,Math.PI*2);c.fill();c.shadowBlur=0;c.fillStyle='#fff';c.beginPath();c.arc(px,py,size*.004,0,Math.PI*2);c.fill();}
    if(decorations)fx.forEach(function(f){var t=Math.min(1,(now-f.start)/900),cx=pad+(f.box%4+.5)*step,cy=pad+(Math.floor(f.box/4)+.5)*step;c.save();c.strokeStyle=colors[f.player];c.shadowColor=colors[f.player];c.shadowBlur=14;c.globalAlpha=1-t;c.lineWidth=2;c.strokeRect(cx-step*.42*(.5+t),cy-step*.42*(.5+t),step*.84*(.5+t),step*.84*(.5+t));for(var k=0;k<8;k++){var a=k*Math.PI/4,rr=step*(.25+t*.5);c.beginPath();c.moveTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);c.lineTo(cx+Math.cos(a)*(rr+6),cy+Math.sin(a)*(rr+6));c.stroke();}c.restore();});
  }
  function paint(now){drawBoard(ctx,cw,s,now||performance.now(),true);}
  function resize(){var w=$('board').clientWidth||400;cw=Math.min(720,Math.round(w*Math.min(window.devicePixelRatio||1,1.5)));$('canvas').width=cw;$('canvas').height=cw;paint();}
  function makeCard(board){var card=document.createElement('canvas');card.width=600;card.height=830;var c=card.getContext('2d');c.fillStyle='#0b1124';c.fillRect(0,0,600,830);c.textAlign='center';c.fillStyle='#7df3ff';c.font='bold 35px sans-serif';c.fillText('霓虹圈地',300,63);var q=E.scores(board);c.fillStyle='#effaff';c.font='bold 29px sans-serif';c.fillText(names[board.tier]+'   '+q[0]+' : '+q[1],300,117);var small=document.createElement('canvas');small.width=540;small.height=540;drawBoard(small.getContext('2d'),540,board,0,false);c.drawImage(small,30,150);c.fillStyle='#9bb6d0';c.font='20px sans-serif';c.fillText('最长连抢 '+board.best[0]+' 格 · 完整对局',300,736);c.fillStyle='#82efff';c.font='18px sans-serif';c.fillText(E.code(board),300,785);return card.toDataURL('image/png');}
  function createButtons(){for(var i=0;i<40;i++){var e=E.endpoints(i),b=document.createElement('button');b.className='edge '+(i<20?'h':'v');b.setAttribute('data-edge',i);b.style.left=(10+(e[0]+e[2])*10)+'%';b.style.top=(10+(e[1]+e[3])*10)+'%';b.addEventListener('click',function(ev){if(s.turn===0)action(Number(ev.currentTarget.getAttribute('data-edge')));});b.addEventListener('mouseenter',function(ev){hover=Number(ev.currentTarget.getAttribute('data-edge'));paint();});b.addEventListener('mouseleave',function(){hover=-1;paint();});$('edges').appendChild(b);}}
  bind('help',function(){guide(function(){if(phase==='result')resultPanel();else if(phase==='play')closePanel();else menu();});});bind('menu',settingsPanel);bind('records',recordsPanel);bind('new-round',menu);
  window.addEventListener('resize',resize);document.addEventListener('visibilitychange',function(){cancelAI();if(document.hidden){if(animation)window.cancelAnimationFrame(animation);animation=null;fx=[];}else if(phase==='result')resultPanel();else scheduleAI();sync();paint();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ready&&phase==='play')closePanel();});
  P.subscribe(function(){$('storage').textContent=P.status();});createButtons();resize();menu();
  store.ready.then(function(){ready=true;var d=prefs();if(d.active){var restored=E.restore(d.active.board);if(restored){s=restored;roundId=d.active.id;phase=s.over?'result':'play';if(s.over)store.update(function(v){return R.settle(v,s,roundId);});}}
    else phase='menu';menu();sync();paint();
  });
})();

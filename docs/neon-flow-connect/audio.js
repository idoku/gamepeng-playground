(function (root) {
  'use strict';
  var ctx=null, master=null, enabled=false, timer=null, beat=0;
  function create() {
    if(ctx) return true;
    var Audio = root.AudioContext || root.webkitAudioContext;
    if(!Audio) return false;
    try {ctx=new Audio();master=ctx.createGain();master.gain.value=.34;master.connect(ctx.destination);return true;}catch(e){return false;}
  }
  function tone(hz, duration, gain, type, delay, endHz) {
    if(!enabled || !ctx || ctx.state==='suspended') return;
    var t=ctx.currentTime+(delay||0),o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(hz,t);if(endHz)o.frequency.exponentialRampToValueAtTime(endHz,t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.025);o.onended=function(){o.disconnect();g.disconnect();};
  }
  function musicTick() {
    if(!enabled || document.hidden || !ctx || ctx.state!=='running') return;
    var chords=[[130.81,164.81,196],[110,130.81,164.81],[87.31,110,130.81],[98,123.47,146.83]],chord=chords[Math.floor(beat/16)%4];
    if(beat%4===0)tone(chord[0]/2,.8,.07,'sine');
    if(beat%2===0)tone(chord[(beat/2)%3]*2,.9,.025,'sine');
    if(beat%16===0)chord.forEach(function(h,i){tone(h,2.5,.015,'triangle',i*.025);});
    if(beat%8===4)tone(980,.06,.015,'triangle',0,410);
    beat++;
  }
  function set(on) {
    if(!on){enabled=false;if(timer){clearInterval(timer);timer=null;}if(ctx)ctx.suspend().catch(function(){});return false;}
    if(!create())return false;enabled=true;
    ctx.resume().then(function(){if(enabled&&!timer){musicTick();timer=setInterval(musicTick,210);}}).catch(function(){});
    return true;
  }
  function play(name, index) {
    if(!enabled) return;
    if(ctx && ctx.state==='suspended')ctx.resume().catch(function(){});
    var pitch=440*Math.pow(2,(index||0)/12);
    if(name==='start'){tone(pitch,.13,.09,'sine');tone(pitch*2,.09,.03,'triangle',.025);}
    else if(name==='step'){tone(pitch*(1+(index||0)*.02),.06,.026,'sine');}
    else if(name==='connect'){[0,4,7,12].forEach(function(n,i){tone(440*Math.pow(2,n/12),.29,.085,'sine',i*.045);});tone(120,.14,.08,'triangle',0,60);}
    else if(name==='erase'){tone(500,.16,.045,'triangle',0,160);}
    else if(name==='backtrack'){tone(300,.045,.024,'sine');}
    else if(name==='blocked'){tone(95,.055,.05,'triangle');}
    else if(name==='ui'){tone(660,.045,.045,'sine');}
    else if(name==='complete'){[0,4,7,12,16,19,24].forEach(function(n,i){tone(261.63*Math.pow(2,n/12),.9,.12,'triangle',i*.09);});[130.81,164.81,196].forEach(function(n){tone(n,1.8,.045,'sine',.3);});tone(180,.35,.12,'sine',0,38);}
  }
  document.addEventListener('visibilitychange',function(){if(!ctx)return;if(document.hidden)ctx.suspend().catch(function(){});else if(enabled)ctx.resume().catch(function(){});});
  root.NeonAudio={set:set,play:play,isEnabled:function(){return enabled;}};
}(this));

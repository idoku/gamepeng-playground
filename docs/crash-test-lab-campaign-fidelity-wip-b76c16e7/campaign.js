import {WIDTH,HEIGHT,LEVELS} from './engine.js';
import {CampaignLab,CAMPAIGN_VERSION,FULL_COUNT,loadFullProgress,saveFullProgress,advanceFullProgress} from './campaign-model.js';
import {drawCampaign} from './campaign-render.js';
import {selectVoiceEvent,freshAudioEvents} from './fidelity-audio.js';
import {CampaignAudio} from './campaign-audio.js';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let stored;try{stored=loadFullProgress(localStorage);}catch{stored=loadFullProgress({getItem(){throw Error();}});}
let reviewing=false;
let progress=stored.value,lab=new CampaignLab(progress.current),activePointer=null,last=performance.now(),paused=false,completeAt=0,resultShown=false,seenEvents=new WeakSet(),feedbackUntil=0;
export const AUDIO_PREFERENCE_KEY='idoku:crash-test-lab:fidelity-audio:v1';
const VOICE_PREFERENCE_KEY='idoku:crash-test-lab:provisional-voice:v1';
let voiceEnabled=false;try{voiceEnabled=localStorage.getItem(VOICE_PREFERENCE_KEY)==='on';}catch{}
const takeGroup=name=>[1,2,3].map(n=>`audio/voice-stilgar-${name}-${n}.wav`);
const audio=new CampaignAudio({voiceAssets:{'contact-light':takeGroup('light'),'contact-medium':takeGroup('medium'),detach:takeGroup('strong')},voiceFallback:false,onVoiceUnavailable:()=>announce('Voice recording unavailable; music and effects can continue.'),onUnavailable:()=>{soundState();announce('Audio unavailable; play can continue.');}});
try{if(localStorage.getItem(AUDIO_PREFERENCE_KEY)==='off')audio.setEnabled(false);}catch{}
audio.setVoiceEnabled(voiceEnabled);
if($('voice-toggle')){$('voice-toggle').checked=voiceEnabled;$('voice-toggle').onchange=()=>{voiceEnabled=Boolean($('voice-toggle').checked);audio.setVoiceEnabled(voiceEnabled);try{localStorage.setItem(VOICE_PREFERENCE_KEY,voiceEnabled?'on':'off');}catch{}};}
for(const id of ['selector','review-selector'])if($(id))for(const [i,l] of LEVELS.entries()){const option=document.createElement('option');option.value=String(i);option.textContent=`${String(i+1).padStart(2,'0')} · ${l.name}`;$(id).append(option);}
if($('review-selector'))$('review-selector').value='0';
const open=()=>!$('welcome').hidden||Boolean(document.querySelector('dialog[open]'));
function soundState(){ $('sound').setAttribute('aria-pressed',String(audio.enabled));$('sound').setAttribute('aria-label',audio.enabled?'Mute sound':'Enable sound');$('sound').textContent=audio.enabled?'🔊':'🔇';}
function sound(kind,details={}){audio.event(kind,details);}
async function unlockSound(){await audio.unlock();soundState();}
async function enableSound(){audio.setEnabled(!audio.enabled);soundState();try{localStorage.setItem(AUDIO_PREFERENCE_KEY,audio.enabled?'on':'off');}catch{}if(audio.enabled)await unlockSound();}
function save(){if(reviewing||!stored.writable)return;try{stored=saveFullProgress(localStorage,progress);progress=stored.value;}catch{stored.writable=false;stored.reason='Campaign save unavailable.';}if($('save-note'))$('save-note').textContent=stored.reason;}
function release(cancel=true){if(!cancel&&lab.grab?.type==='machine')sound('drop');lab.up(cancel);const id=activePointer;activePointer=null;if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);canvas.classList.remove('grabbing');}
function start(index,{persist=true}={}){release();lab=new CampaignLab(index);audio.reset(lab.index);sound('retry');if(!reviewing&&persist)progress.current=lab.index;completeAt=0;resultShown=false;seenEvents=new WeakSet();feedbackUntil=0;$('feedback').textContent='';$('feedback').classList.remove('show');for(const d of document.querySelectorAll('dialog[open]'))d.close();if(persist)save();last=performance.now();update();draw();}
function announce(text){$('feedback').textContent=text;$('feedback').classList.add('show');feedbackUntil=performance.now()+1100;}
function update(){ $('review-badge').hidden=!reviewing;$('return-campaign').hidden=!reviewing;$('return-campaign-result').hidden=!reviewing;if($('policy-note'))$('policy-note').textContent=lab.level.objective?.policyUnverified?'This goal uses an authored head + four-limbs scoring rule. The original five scoring members are unverified.':'';$('level-label').textContent=`LEVEL ${String(lab.index+1).padStart(2,'0')}`;$('objective').textContent=lab.level.goal;$('parts').textContent=`${lab.goalProgress}/${lab.level.count}`;$('parts').hidden=lab.level.count<2;$('hint').textContent=lab.machines.some(m=>m.movable)?'☝ DRAG ROBOT OR HIGHLIGHTED TRAP':'☝ DRAG THE ROBOT';$('play-area').classList.toggle('engaged',lab.engaged);$('play-area').classList.toggle('review-mode',reviewing);if($('selector')){for(const option of $('selector').options)option.disabled=Number(option.value)>progress.unlocked;$('selector').value=String(reviewing?progress.current:lab.index);}}
function observe(){
 const events=freshAudioEvents(lab.events,seenEvents),vocal=selectVoiceEvent(events,lab.time);
 for(const e of events){
  const details={...e,age:Math.max(0,lab.time-e.time),voice:e===vocal};
  if(e.type==='contact')sound('contact',details);
  if(e.type==='launch')sound('launch',{...details,voice:false});
  if(e.type==='detach'||e.type==='core-destroyed'){announce(e.type==='core-destroyed'?'CORE DESTROYED!':e.part==='head'?'HEAD OFF!':e.part.includes('arm')?'ARM RIPPED!':'LEG SNAPPED!');sound(e.type==='core-destroyed'?'core':'detach',details);}
 }
 if(feedbackUntil&&performance.now()>feedbackUntil){$('feedback').textContent='';$('feedback').classList.remove('show');feedbackUntil=0;}
}
function finish(){if(!lab.complete||resultShown)return;if(!completeAt){release();if(!reviewing){progress=advanceFullProgress(progress,lab.index);save();}completeAt=performance.now()+850;sound('complete');return;}if(performance.now()<completeAt)return;resultShown=true;const end=lab.index===FULL_COUNT-1;$('result-title').textContent=reviewing?(end?'ENDING REVIEW COMPLETE':'SINGLE-LEVEL COMPLETE'):end?'ALL TESTS COMPLETE':'TEST COMPLETE';if($('result-subtitle'))$('result-subtitle').textContent=reviewing?'SINGLE-LEVEL REVIEW · NOT A CAMPAIGN CLEAR':end?'LAB FULLY CERTIFIED':'ROBOT DISMANTLED';$('review-result-note').hidden=!reviewing;$('result-label').textContent=`LEVEL ${String(lab.index+1).padStart(2,'0')}`;$('result-copy').textContent=lab.level.goal;$('next').textContent=reviewing?(end?'REVIEW LEVEL 01 ▸':'REVIEW NEXT LEVEL ▸'):end?'PLAY AGAIN ▸':'NEXT LEVEL ▸';$('result').showModal();}
function draw(){drawCampaign(ctx,lab,{width:canvas.width,height:canvas.height});}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height};}
canvas.addEventListener('pointerdown',e=>{if(open()||activePointer!==null)return;e.preventDefault();audio.setPaused(false);void unlockSound();const p=point(e);if(lab.down(p.x,p.y)){sound('grab');activePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);canvas.classList.add('grabbing');update();}});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==activePointer)return;const p=point(e);lab.move(p.x,p.y);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(e.pointerId===activePointer)release(type!=='pointerup');});
$('begin').onclick=()=>{$('welcome').hidden=true;audio.reset(lab.index);audio.setPaused(false);void unlockSound().then(()=>sound('start'));last=performance.now();};$('sound').onclick=enableSound;$('reset').onclick=()=>start(lab.index);$('again').onclick=()=>start(lab.index);$('next').onclick=()=>{if(resultShown)start(lab.index===FULL_COUNT-1?0:lab.index+1);};
function selectedIndex(id){const value=$(id).value;return /^(0|[1-9]\d*)$/.test(value)?Number(value):NaN;}
if($('selector'))$('selector').onchange=()=>{const n=selectedIndex('selector');if(Number.isInteger(n)&&n>=0&&n<=progress.unlocked&&n<FULL_COUNT){reviewing=false;start(n);}};
$('try-review').onclick=()=>{const n=selectedIndex('review-selector');if(!Number.isInteger(n)||n<0||n>=FULL_COUNT)return;reviewing=true;start(n);$('welcome').hidden=true;$('controls').open=false;audio.setPaused(false);void unlockSound();};
function returnToCampaign(){if(!reviewing)return;reviewing=false;start(progress.current,{persist:false});$('controls').open=false;}
$('return-campaign').onclick=returnToCampaign;$('return-campaign-result').onclick=returnToCampaign;
for(const d of document.querySelectorAll('dialog')){d.addEventListener('cancel',e=>e.preventDefault());d.addEventListener('close',()=>{last=performance.now();});}
window.addEventListener('blur',()=>{release();audio.setPaused(true);});window.addEventListener('focus',()=>{if(!document.hidden)audio.setPaused(false);});document.addEventListener('visibilitychange',()=>{paused=document.hidden;audio.setPaused(paused);release();last=performance.now();});
function frame(now){audio.tick();const audioStatus=!audio.enabled?'Sound muted.':!audio.ready?'Audio waiting for a play gesture or foreground.':!voiceEnabled?'Music and effects running. Provisional character voice is off.':audio.voiceStatus==='ready'?'Audio engine running; nine provisional reactions loaded.':audio.voiceStatus==='loading'?'Audio engine running; voice recordings loading.':'Audio engine running; voice recordings unavailable or partial.';if($('audio-status')&&$('audio-status').textContent!==audioStatus)$('audio-status').textContent=audioStatus;const elapsed=Math.min(80,now-last);last=now;if(!paused&&!open()){let left=elapsed/1000;while(left>0){const dt=Math.min(left,1/120);lab.tick(dt);left-=dt;}observe();update();finish();}draw();requestAnimationFrame(frame);}
if($('save-note'))$('save-note').textContent=stored.reason;if($('sample-version'))$('sample-version').textContent=CAMPAIGN_VERSION;
soundState();update();draw();requestAnimationFrame(frame);

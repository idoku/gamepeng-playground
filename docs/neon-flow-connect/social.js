(function(root){
  'use strict';
  function Social(options){
    var $=function(id){return document.getElementById(id);},modal=$('social-modal'),store=root.FlowStore,share=new root.FlowShare(),selected=1,current=null,tab='rank',returnFocus=null,busy=false,generation=0;
    $('rank-level').textContent='';
    root.NeonLevels.forEach(function(level,i){var option=document.createElement('option');option.value=String(level.id);option.textContent=('0'+(i+1)).slice(-2)+' · '+level.name;$('rank-level').appendChild(option);});
    function message(text){$('social-status').textContent=text;}
    function caps(){var c=share.capabilities();$('share-comment').disabled=busy||!c.comment||!current;$('share-note').disabled=busy||!c.note||!current;if(!busy)message(c.comment?'把挑战卡带到评论区，邀请大家接招。':c.note?'可以晒成笔记；评论区分享需要小红书 9.49 及以上。':'当前为网页试玩，可预览挑战卡；在小红书内可分享。');}
    function ranks(){
      $('rank-list').textContent='';var rows=store.list(selected),level=root.NeonLevels[selected-1];$('rank-subtitle').textContent=level.name+' · 连线越少，排名越靠前';
      rows.forEach(function(r,i){var li=document.createElement('li'),num=document.createElement('b'),score=document.createElement('strong'),date=document.createElement('span');num.textContent=('0'+(i+1)).slice(-2);score.textContent=r.moves+' 次连线';var d=new Date(r.at);date.textContent=(d.getMonth()+1)+'月'+d.getDate()+'日 · 我';li.appendChild(num);li.appendChild(score);li.appendChild(date);$('rank-list').appendChild(li);});
      $('rank-empty').hidden=rows.length>0;$('rank-empty').textContent=store.get().best[selected]?'之前的最佳：'+store.get().best[selected]+' 次连线。再玩一局，留下完整战绩。':'点亮这重光境，你的第一条战绩就会出现。';
      $('rank-storage').textContent=store.warning()?'本次战绩未能可靠保存，关闭后可能丢失。':'个人战绩榜 · 每关保留最佳 10 局 · 记录在当前设备';
    }
    function card(){
      var canvas=$('share-card'),c=canvas.getContext('2d');canvas.width=480;canvas.height=720;canvas.setAttribute('aria-label','霓虹连线 · 第'+current.level+'重光境 '+current.name+' · '+(current.finished?current.moves+'次连线，全部接通':'已接通'+current.connected+' / '+current.total+'条，本局进行中'));
      var bg=c.createLinearGradient(0,0,480,720);bg.addColorStop(0,'#122e43');bg.addColorStop(1,'#131227');c.fillStyle=bg;c.fillRect(0,0,480,720);
      c.textAlign='left';c.fillStyle='#75e8ef';c.font='700 12px sans-serif';c.fillText('NEON / CIRCUIT CONNECT',32,36);
      c.fillStyle='#f0ffff';c.font='bold 32px sans-serif';c.fillText('霓虹连线',32,83);
      c.font='15px sans-serif';c.fillStyle='#b4cbdf';c.fillText('LIGHT '+('0'+current.level).slice(-2)+' · '+current.name,32,114);
      c.fillStyle='#35f2ff';c.font='bold 36px sans-serif';c.fillText(current.finished?current.moves+' 次连线':'已接通 '+current.connected+' / '+current.total,32,171);
      c.fillStyle='#dbe8f7';c.font='14px sans-serif';c.fillText(current.finished?'整座光境，被我点亮了。':'光路正在点亮 · 本局进行中',32,199);
      c.shadowColor='#35f2ff';c.shadowBlur=18;c.strokeStyle='#347689';c.lineWidth=2;c.strokeRect(32,225,416,416);c.shadowBlur=0;c.drawImage(options.board,40,233,400,400);
      c.fillStyle='#f4edff';c.font='bold 19px sans-serif';c.fillText(current.finished?(current.moves<=current.total?'你也能一步不绕吗？':'你能用更少步数点亮吗？'):'下一道光，等你来接通。',32,679);
      c.fillStyle='#839db8';c.font='11px sans-serif';c.fillText('同色相连 · 光路不交叉 · 没有倒计时',32,704);
    }
    function showTab(which){tab=which;$('rank-panel').hidden=tab!=='rank';$('share-panel').hidden=tab!=='share';$('rank-tab').setAttribute('aria-pressed',String(tab==='rank'));$('share-tab').setAttribute('aria-pressed',String(tab==='share'));if(tab==='rank')ranks();else{card();caps();}}
    this.open=function(which){returnFocus=document.activeElement;options.prepare();current=options.snapshot();selected=current?current.level:Math.min(store.get().unlocked,root.NeonLevels.length);$('rank-level').value=String(selected);$('share-tab').disabled=!current;modal.hidden=false;generation++;showTab(current&&which==='share'?'share':'rank');$('social-close').focus();};
    function close(){modal.hidden=true;generation++;if(returnFocus&&typeof returnFocus.focus==='function')returnFocus.focus({preventScroll:true});}
    this.isOpen=function(){return !modal.hidden;};
    function send(kind){if(busy||!current)return;var c=share.capabilities();if(!c[kind])return;busy=true;var token=generation;caps();message('正在准备挑战卡…');var image;try{image=$('share-card').toDataURL('image/png');}catch(e){busy=false;caps();message('挑战卡生成失败，请重试。');return;}share[kind](current,image).then(function(){if(token===generation&&!modal.hidden)message(kind==='comment'?'挑战卡已带入评论区，请在编辑器中确认。':'已完成笔记发布页操作，最终状态以小红书为准。');},function(){if(token===generation&&!modal.hidden)message('分享未完成或已取消，你的战绩仍保留。');}).then(function(){busy=false;if(!modal.hidden){var c=share.capabilities();$('share-comment').disabled=!c.comment;$('share-note').disabled=!c.note;if(token!==generation&&tab==='share')caps();}});}
    $('social-close').addEventListener('click',close);$('rank-tab').addEventListener('click',function(){showTab('rank');});$('share-tab').addEventListener('click',function(){showTab('share');});$('rank-level').addEventListener('change',function(){selected=Math.max(1,Math.min(root.NeonLevels.length,Math.floor(Number(this.value)||1)));ranks();});$('share-comment').addEventListener('click',function(){send('comment');});$('share-note').addEventListener('click',function(){send('note');});
    modal.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){var list=Array.prototype.slice.call(modal.querySelectorAll('button,select')).filter(function(el){return !el.disabled&&el.getClientRects().length;});var first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    store.subscribe(function(){if(!modal.hidden&&tab==='rank')ranks();});share.ready.then(function(){if(!modal.hidden&&tab==='share')caps();});
  }
  root.FlowSocial=Social;
})(window);

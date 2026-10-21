(function () {
  'use strict';
  var storage;
  try { storage = window.localStorage; } catch (error) { storage = { getItem: function () { return null; }, setItem: function () { throw error; } }; }
  var store = window.NeonRecords.create({ xhs: window.xhs, storage: storage, now: function () { return Date.now(); },
    onStatus: function (text) { document.getElementById('storage-status').textContent = text; document.getElementById('result-storage').textContent = text; } });
  var hooks = null, current = null, cardData = '', busy = false, wasPaused = false, resultFrame = null, resultFocusY = 0;
  function el(id) { return document.getElementById(id); }
  function render() {
    var state = store.snapshot();
    el('launch-record').textContent = state.best ? '最高 ' + state.best + ' 节 · 本次挑战 ' + state.target + ' 节' : '第一次出发 · 挑战 ' + state.target + ' 节';
    el('personal-best').textContent = state.best + ' 节';
    el('target-input').value = state.target;
    el('recent-count').textContent = '最近 ' + state.runs.length + ' 局 · 仅此小工具的个人成绩';
    el('personal-rows').textContent = '';
    var ranked = store.ranked();
    if (!ranked.length) el('personal-rows').textContent = '还没有完成的对局，先去吃点光点吧。';
    ranked.forEach(function (row, index) {
      var item = document.createElement('li');
      var d = new Date(row.at);
      item.textContent = (index + 1) + '.  ' + row.length + ' 节 · 击败 ' + row.kills + ' 条 · ' + (d.getMonth() + 1) + '/' + d.getDate();
      el('personal-rows').appendChild(item);
    });
    el('storage-status').textContent = store.status();
  }
  function progress(length) {
    var target = store.target();
    var remaining = Math.max(0, target - length);
    var text = remaining ? '挑战 ' + target + ' 节 · 还差 ' + remaining + ' 节' : '挑战达成！继续冲更长';
    if (el('challenge-hud').textContent !== text) el('challenge-hud').textContent = text;
  }
  function result(length, kills, focusY) {
    var saved = store.record(length, kills);
    current = saved.row;
    cardData = '';
    resultFrame = document.createElement('canvas');
    var live = el('game-canvas');
    resultFrame.width = live.width; resultFrame.height = live.height;
    resultFocusY = Number.isFinite(focusY) ? focusY : live.height / 2;
    var frameContext = resultFrame.getContext('2d');
    if (frameContext) frameContext.drawImage(live, 0, 0);
    el('result-title').textContent = saved.newBest ? '新纪录！' : '这一局，收下了';
    var goal = store.snapshot().target;
    el('result-goal').textContent = length >= goal ? '挑战 ' + goal + ' 节已达成' : '距离 ' + goal + ' 节还差 ' + (goal - length) + ' 节';
    el('share-status').textContent = store.canComment() ? '晒到评论区，邀请大家来挑战' : '升级小红书至 9.49+ 可带成绩卡到评论区';
    el('card-preview').hidden = true;
    el('comment-button').disabled = !store.canComment();
    render();
    saved.saved.then(render);
  }
  function makeCard() {
    var card = document.createElement('canvas');
    card.width = 720; card.height = 960;
    var ctx = card.getContext('2d');
    if (!ctx || !current) throw new Error('no canvas');
    ctx.fillStyle = '#020711'; ctx.fillRect(0, 0, 720, 960);
    ctx.strokeStyle = '#00d9e5'; ctx.lineWidth = 3; ctx.strokeRect(24, 24, 672, 912);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7ffcff'; ctx.font = 'bold 42px sans-serif'; ctx.fillText('霓虹贪食蛇', 360, 90);
    ctx.fillStyle = '#9cb1c6'; ctx.font = '24px sans-serif'; ctx.fillText('个人挑战成绩 · V4.4', 360, 137);
    var live = resultFrame || el('game-canvas');
    var cropHeight = Math.min(live.height, live.width * 270 / 620);
    var cropTop = Math.max(0, Math.min(live.height - cropHeight, resultFocusY - cropHeight / 2));
    ctx.drawImage(live, 0, cropTop, live.width, cropHeight, 50, 170, 620, 270);
    ctx.fillStyle = '#98ff91'; ctx.font = 'bold 112px sans-serif'; ctx.fillText(String(current.length), 360, 575);
    ctx.font = '28px sans-serif'; ctx.fillText('这一局的长度 / 节', 360, 625);
    ctx.fillStyle = '#e8efff'; ctx.font = '30px sans-serif'; ctx.fillText('击败 ' + current.kills + ' 条电脑蛇', 360, 697);
    ctx.fillText('个人最高 ' + store.snapshot().best + ' 节', 360, 753);
    ctx.fillStyle = '#7ffcff'; ctx.font = 'bold 30px sans-serif'; ctx.fillText('你能超过我吗？', 360, 842);
    ctx.fillStyle = '#9cb1c6'; ctx.font = '22px sans-serif'; ctx.fillText('点笔记挂着的小工具，来挑战', 360, 890);
    cardData = card.toDataURL('image/png');
    el('card-preview').src = cardData;
    el('card-preview').hidden = false;
    return cardData;
  }
  function board(open) {
    render();
    el('records-panel').hidden = !open;
    if (hooks) {
      if (open) { wasPaused = hooks.isPaused(); hooks.pause(true); }
      else hooks.pause(wasPaused);
    }
  }
  el('launch-records').addEventListener('click', function () { board(true); });
  el('records-button').addEventListener('click', function () { board(true); });
  el('close-records').addEventListener('click', function () { board(false); });
  el('result-records').addEventListener('click', function () { board(true); });
  el('set-target').addEventListener('click', function () {
    if (!store.setTarget(el('target-input').value)) { el('target-status').textContent = '请输入 8–500 之间的整数'; return; }
    el('target-status').textContent = '目标已设置，去挑战吧'; render();
    store.flush().then(render);
  });
  el('best-target').addEventListener('click', function () {
    store.setTarget(Math.min(500, Math.max(30, store.snapshot().best + 1))); render();
    el('target-status').textContent = store.snapshot().best >= 500 ? '目标：追平自己的最高纪录' : '目标：超越自己的最高纪录';
  });
  el('continue-button').addEventListener('click', function () { if (!busy && hooks) hooks.continueGame(); });
  el('pause-button').addEventListener('click', function () { if (hooks) hooks.togglePause(); });
  el('card-button').addEventListener('click', function () { try { makeCard(); } catch (error) { el('share-status').textContent = '成绩卡生成失败，请再试一次'; } });
  el('comment-button').addEventListener('click', async function () {
    if (busy || !current || !store.canComment()) return;
    busy = true; el('comment-button').disabled = true; el('continue-button').disabled = true;
    el('share-status').textContent = '正在准备成绩卡…';
    try {
      var mini = window.xhs && window.xhs.miniTool;
      var file = await mini.writeTempFile({ data: cardData || makeCard() });
      if (!file || !file.filePath) throw new Error('no file');
      var response = await store.comment(file.filePath, current);
      el('share-status').textContent = response && response.routed ? '已打开评论编辑器，请确认后发送' : '评论编辑器未打开，请从挂有小工具的笔记进入再试';
    } catch (error) { el('share-status').textContent = '未能打开评论，可先查看成绩卡；没有自动发送'; }
    finally { busy = false; el('comment-button').disabled = false; el('continue-button').disabled = false; }
  });
  el('start-button').disabled = true;
  var ready = store.init().then(function () { render(); el('start-button').disabled = false; });
  window.NeonClub = { ready: ready, store: store, result: result, progress: progress,
    attach: function (value) { hooks = value; }, render: render };
}());

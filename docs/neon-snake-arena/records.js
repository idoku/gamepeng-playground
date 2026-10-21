(function () {
  'use strict';
  var KEY = 'neon-snake-records-v1';
  var LEGACY = 'neon-snake-best';
  function integer(value, min, max, fallback) {
    var n = Number(value);
    return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
  }
  function normalize(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var rows = Array.isArray(raw.runs) ? raw.runs : [];
    var seen = {};
    var runs = rows.filter(function (r) {
      if (!r || typeof r.id !== 'string' || r.id.length > 80 || seen[r.id]) return false;
      if (integer(r.length, 8, 500, 0) === 0 || integer(r.kills, 0, 100000, -1) < 0 ||
          integer(r.at, 1, 8640000000000000, 0) === 0) return false;
      seen[r.id] = true;
      return true;
    }).slice(-20).map(function (r) {
      return { id: r.id, length: Number(r.length), kills: Number(r.kills), at: Number(r.at) };
    });
    var best = integer(raw.best, 0, 500, 0);
    runs.forEach(function (r) { best = Math.max(best, r.length); });
    return { schema: 1, best: best, target: integer(raw.target, 8, 500, 30), runs: runs };
  }
  function merge(a, b) {
    var result = normalize(a);
    var other = normalize(b);
    result.best = Math.max(result.best, other.best);
    result.runs = normalize({ runs: result.runs.concat(other.runs).sort(function (x, y) { return x.at - y.at; }) }).runs;
    return normalize(result);
  }
  function decode(data) {
    if (data === null || data === undefined || data === '') return normalize(null);
    var raw = JSON.parse(data);
    if (!raw || raw.schema !== 1 || !Array.isArray(raw.runs)) throw new Error('invalid records');
    return normalize(raw);
  }
  function bounded(promise) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('timeout')); }, 2500);
      Promise.resolve(promise).then(function (result) { clearTimeout(timer); resolve(result); },
        function (error) { clearTimeout(timer); reject(error); });
    });
  }
  function create(env) {
    var data = normalize(null), build = 0, backend = 'memory', writable = false;
    var message = '正在读取纪录…', queue = Promise.resolve(true), serial = 0;
    var stopped = false;
    var mini = env.xhs && env.xhs.miniTool;
    function notify(text) { message = text; if (env.onStatus) env.onStatus(text); }
    function localData() {
      var old = normalize(null);
      try {
        old = decode(env.storage.getItem(KEY));
        old.best = Math.max(old.best, integer(env.storage.getItem(LEGACY), 0, 500, 0));
      } catch (error) {
        try { old.best = integer(env.storage.getItem(LEGACY), 0, 500, 0); } catch (ignored) {}
      }
      return old;
    }
    async function init() {
      var options = env.xhs && env.xhs.launchOptions;
      if (!(options && options.miniToolEnv && options.miniToolEnv.buildVersion) && mini && typeof mini.getLaunchOptions === 'function') {
        try { options = await bounded(mini.getLaunchOptions()); } catch (error) {}
      }
      build = Number(options && options.miniToolEnv && options.miniToolEnv.buildVersion) || 0;
      var version = Math.floor(build / 1000);
      if (version >= 9460 && mini && typeof mini.getStorage === 'function' && typeof mini.setStorage === 'function') {
        backend = 'native';
        try {
          var result = await bounded(mini.getStorage({ key: KEY }));
          if (!result || !Object.prototype.hasOwnProperty.call(result, 'data')) throw new Error('invalid response');
          data = decode(result && result.data);
          var migration = localData();
          // Migrate without ever lowering an existing native best or losing native runs.
          var before = JSON.stringify(data);
          data = result.data === null || result.data === '' ? migration : merge(data, migration);
          writable = true;
          notify('纪录保存在当前小工具');
          if (before !== JSON.stringify(data)) await persist();
        } catch (error) {
          data = localData();
          writable = false;
          notify('纪录读取失败，本次仅临时记录；重新打开可重试');
        }
      } else {
        data = localData();
        backend = 'web';
        try {
          // No destructive probe keys: write the migrated record itself.
          env.storage.setItem(KEY, JSON.stringify(data));
          writable = true;
          notify('使用兼容存档，清理缓存后可能丢失');
        } catch (error) {
          backend = 'memory';
          notify('当前无法保存，纪录仅在本次打开有效');
        }
      }
      return snapshot();
    }
    function snapshot() { return normalize(data); }
    function persist() {
      var serialized = JSON.stringify(data);
      queue = queue.then(async function () {
        if (!writable || stopped) return false;
        try {
          if (backend === 'native') await bounded(mini.setStorage({ key: KEY, data: serialized }));
          else env.storage.setItem(KEY, serialized);
          notify(backend === 'native' ? '纪录已保存至当前小工具' : '已保存兼容存档，清理缓存后可能丢失');
          return true;
        } catch (error) {
          // A timed-out native write may still finish. Stop later writes this session
          // so it cannot overwrite newer records out of order.
          stopped = true;
          notify('纪录保存失败，本次仅临时记录；重新打开可重试');
          return false;
        }
      });
      return queue;
    }
    function record(length, kills) {
      var oldBest = data.best;
      var id;
      do { id = String(env.now()) + '-' + (++serial); } while (data.runs.some(function (r) { return r.id === id; }));
      var row = { id: id, length: integer(length, 8, 500, 8),
        kills: integer(kills, 0, 100000, 0), at: env.now() };
      data.runs.push(row);
      data.runs = data.runs.slice(-20);
      data.best = Math.max(data.best, row.length);
      return { row: row, newBest: row.length > oldBest, saved: persist() };
    }
    function setTarget(target) {
      var valid = integer(target, 8, 500, 0);
      if (!valid) return false;
      data.target = valid;
      persist();
      return true;
    }
    function ranked() {
      return data.runs.slice().sort(function (a, b) { return b.length - a.length || b.kills - a.kills || b.at - a.at; }).slice(0, 5);
    }
    async function comment(filePath, row) {
      if (Math.floor(build / 1000) < 9490 || !mini || typeof mini.interactionOpenApi !== 'function') return { unsupported: true };
      await queue; // Save before the container closes the game.
      return mini.interactionOpenApi({ payload: { action: 'post_comment',
        content: '我在霓虹贪食蛇长到 ' + row.length + ' 节，击败 ' + row.kills + ' 条电脑蛇！谁来挑战？',
        media_bean: [{ media_type: 'image', cover_image_url: filePath }],
        miniToolSnapshotInfo: JSON.stringify({ game: 'neon-snake', version: 1, target: row.length }) }, saveToAlbum: false });
    }
    return { init: init, snapshot: snapshot, record: record, setTarget: setTarget, ranked: ranked, comment: comment,
      flush: function () { return queue; }, status: function () { return message; },
      target: function () { return data.target; },
      canComment: function () { return Math.floor(build / 1000) >= 9490 && mini && typeof mini.interactionOpenApi === 'function' && typeof mini.writeTempFile === 'function'; } };
  }
  window.NeonRecords = { create: create, normalize: normalize, merge: merge, integer: integer };
}());

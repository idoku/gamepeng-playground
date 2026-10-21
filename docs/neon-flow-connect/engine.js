(function (root) {
  'use strict';
  function same(a, b) { return !!a && !!b && a[0] === b[0] && a[1] === b[1]; }
  function clonePaths(paths) {
    var copy = {};
    Object.keys(paths).forEach(function (id) { copy[id] = paths[id].map(function (c) { return c.slice(); }); });
    return copy;
  }
  function Engine(level) { this.load(level); }
  Engine.prototype.load = function (level) {
    this.level = level; this.paths = {}; this.history = []; this.active = null; this.moves = 0;
  };
  Engine.prototype.inside = function (cell) {
    return !!cell && cell[0] >= 0 && cell[1] >= 0 && cell[0] < this.level.size && cell[1] < this.level.size;
  };
  Engine.prototype.dot = function (cell) {
    for (var i = 0; i < this.level.pairs.length; i++) {
      var p = this.level.pairs[i];
      if (same(cell, p.start) || same(cell, p.end)) return p;
    }
    return null;
  };
  Engine.prototype.owner = function (cell) {
    var ids = Object.keys(this.paths);
    for (var i = 0; i < ids.length; i++) {
      if (this.paths[ids[i]].some(function (c) { return same(c, cell); })) return ids[i];
    }
    return null;
  };
  Engine.prototype.begin = function (cell) {
    if (!this.inside(cell)) return {type:'none'};
    this.cancel();
    var pair = this.dot(cell), owner = this.owner(cell);
    if (!pair) {
      if (owner !== null) {
        this.history.push({paths:clonePaths(this.paths),moves:this.moves});
        delete this.paths[owner]; this.moves++;
        return {type:'erase',id:owner};
      }
      return {type:'none'};
    }
    var backup = clonePaths(this.paths);
    delete this.paths[pair.id];
    this.active = {id:pair.id,path:[cell.slice()],backup:backup};
    return {type:'start',id:pair.id};
  };
  Engine.prototype.step = function (cell) {
    var a = this.active;
    if (!a || !this.inside(cell)) return {type:'none'};
    var last = a.path[a.path.length-1];
    if (same(last, cell)) return {type:'none'};
    if (Math.abs(cell[0]-last[0])+Math.abs(cell[1]-last[1]) !== 1) return {type:'jump'};
    var visited = -1;
    for (var i=0;i<a.path.length;i++) if(same(a.path[i],cell)) visited=i;
    if (visited !== -1) { a.path = a.path.slice(0,visited+1); return {type:'backtrack',id:a.id}; }
    var lastDot = this.dot(last);
    if (a.path.length > 1 && lastDot) return {type:'blocked',id:a.id};
    var dot = this.dot(cell);
    if ((dot && dot.id !== a.id) || this.owner(cell) !== null) return {type:'blocked',id:a.id};
    a.path.push(cell.slice());
    return {type:dot?'arrive':'step',id:a.id,cell:cell.slice()};
  };
  Engine.prototype.release = function () {
    var a=this.active;
    if(!a) return {type:'none'};
    var end=this.dot(a.path[a.path.length-1]);
    if(a.path.length<2 || !end || end.id!==a.id || same(a.path[0],a.path[a.path.length-1])) {
      this.paths=a.backup; this.active=null; return {type:'cancel',id:a.id};
    }
    this.history.push({paths:a.backup,moves:this.moves});
    this.paths[a.id]=a.path; this.active=null; this.moves++;
    return {type:this.complete()?'complete':'connect',id:a.id};
  };
  Engine.prototype.cancel = function () {
    if(this.active) { this.paths=this.active.backup; this.active=null; }
  };
  Engine.prototype.undo = function () {
    this.cancel();
    var h=this.history.pop();
    if(!h) return false;
    this.paths=h.paths; this.moves=h.moves; return true;
  };
  Engine.prototype.reset = function () { this.load(this.level); };
  Engine.prototype.complete = function () {
    var used={}, self=this;
    return this.level.pairs.every(function (p) {
      var path=self.paths[p.id];
      if(!path || path.length<2) return false;
      if(!((same(path[0],p.start)&&same(path[path.length-1],p.end)) || (same(path[0],p.end)&&same(path[path.length-1],p.start)))) return false;
      for(var i=0;i<path.length;i++) {
        var c=path[i],k=c[0]+','+c[1];
        if(!self.inside(c) || used[k]) return false;
        if(i && Math.abs(c[0]-path[i-1][0])+Math.abs(c[1]-path[i-1][1])!==1) return false;
        used[k]=true;
      }
      return true;
    });
  };
  if(typeof module!=='undefined' && module.exports) module.exports=Engine;
  else root.NeonEngine=Engine;
}(this));

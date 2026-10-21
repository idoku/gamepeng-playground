(function(root){
  'use strict';
  var E=root.GridEngine;
  function blank(){return {schema:1,tier:'easy',sound:true,effects:true,tutorial:false,active:null,records:[]};}
  function valid(v){return !!(v&&v.schema===1&&E.tiers.indexOf(v.tier)>=0&&typeof v.sound==='boolean'&&typeof v.effects==='boolean'&&typeof v.tutorial==='boolean'&&Array.isArray(v.records)&&v.records.length<=30&&(v.active===null||v.active&&typeof v.active.id==='string'&&v.active.id.length<80&&E.restore(v.active.board))&&v.records.every(function(r){var s=r&&E.restore(r.board);return s&&s.over&&typeof r.id==='string'&&r.id.length<80;}));}
  function clean(v){
    var d=blank();if(!v||v.schema!==1)return d;d.tier=E.tiers.indexOf(v.tier)>=0?v.tier:'easy';d.sound=v.sound!==false;d.effects=v.effects!==false;d.tutorial=v.tutorial===true;
    if(v.active&&typeof v.active.id==='string'&&v.active.id.length<80&&E.restore(v.active.board))d.active={id:v.active.id,board:v.active.board};
    if(Array.isArray(v.records))v.records.slice(0,30).forEach(function(r){
      if(!r||typeof r.id!=='string'||r.id.length>80||!r.board)return;var s=E.restore(r.board);if(!s||!s.over)return;
      if(d.records.some(function(x){return x.id===r.id;}))return;
      var q=E.scores(s);d.records.push({id:r.id,board:E.pack(s),score:q[0],opponent:q[1],tier:s.tier,outcome:E.outcome(s),combo:s.best[0],date:typeof r.date==='string'?r.date.slice(0,30):''});
    });return d;
  }
  function settle(d,s,id){
    if(!s.over||d.records.some(function(r){return r.id===id;}))return d;
    var q=E.scores(s),r={id:id,board:E.pack(s),score:q[0],opponent:q[1],tier:s.tier,outcome:E.outcome(s),combo:s.best[0],date:new Date().toISOString()};
    d.records.unshift(r);d.records=d.records.slice(0,30);d.active=null;d.tier=E.nextTier(s.tier,r.outcome);return d;
  }
  function ranked(d,tier){return d.records.filter(function(r){return r.tier===tier;}).slice().sort(function(a,b){return b.score-a.score||b.combo-a.combo;});}
  root.GridRecords={blank:blank,valid:valid,clean:clean,settle:settle,ranked:ranked};
})(typeof window!=='undefined'?window:this);

(function(root){
  'use strict';
  var key='neon-flow-v1',levelCount=(root.NeonLevels&&root.NeonLevels.length)||7,listeners=[],api=null,writing=false,pending=false,soundDirty=false,warning=false,limited=false;
  function clean(value){
    var v=value&&typeof value==='object'?value:{},best={},seen={};
    for(var i=1;i<=levelCount;i++){var n=Number(v.best&&v.best[i]);if(Number.isInteger(n)&&n>=1&&n<=10000)best[i]=n;}
    var records=(Array.isArray(v.records)?v.records:[]).slice(0,levelCount*20+100).filter(function(r){
      if(!r||typeof r.id!=='string'||r.id.length>80||seen[r.id]||!Number.isInteger(r.level)||r.level<1||r.level>levelCount||!Number.isInteger(r.moves)||r.moves<1||r.moves>10000||!Number.isFinite(r.at)||r.at<0)return false;
      seen[r.id]=true;return true;
    }).map(function(r){return {id:r.id,level:r.level,moves:r.moves,at:r.at};});
    var bounded=[];for(i=1;i<=levelCount;i++)bounded=bounded.concat(records.filter(function(r){return r.level===i;}).sort(function(a,b){return a.moves-b.moves||b.at-a.at||a.id.localeCompare(b.id);}).slice(0,10));
    var unlocked=Math.max(1,Math.min(levelCount,Math.floor(Number(v.unlocked)||1)));
    // Keep the same save key and promote a previously completed frontier into newly added content.
    while(unlocked<levelCount&&best[unlocked])unlocked++;
    return {unlocked:unlocked,best:best,sound:v.sound!==false,guideDone:!!v.guideDone,records:bounded};
  }
  function parse(raw){try{return clean(JSON.parse(raw||'null'));}catch(e){return clean(null);}}
  var data;try{data=parse(root.localStorage.getItem(key));}catch(e){data=clean(null);}
  function notify(){listeners.forEach(function(fn){fn();});}
  function merge(left,right){var a=clean(left),b=clean(right),best={};for(var i=1;i<=levelCount;i++){var n=Math.min(a.best[i]||Infinity,b.best[i]||Infinity);if(n!==Infinity)best[i]=n;}return clean({unlocked:Math.max(a.unlocked,b.unlocked),best:best,sound:soundDirty||!right||typeof right.sound!=='boolean'?a.sound:b.sound,guideDone:a.guideDone||b.guideDone,records:a.records.concat(b.records)});}
  function local(){try{root.localStorage.setItem(key,JSON.stringify(data));return true;}catch(e){return false;}}
  function call(name,args){return new Promise(function(resolve,reject){try{api[name](Object.assign({},args,{success:resolve,fail:reject}));}catch(e){reject(e);}});}
  function flush(){
    if(!api||writing||!pending)return;writing=true;pending=false;
    call('setStorage',{key:key,data:JSON.stringify(data)}).then(function(){warning=false;limited=false;},function(){warning=true;limited=true;}).then(function(){writing=false;notify();if(pending)flush();});
  }
  var store={get:function(){return clean(data);},clean:clean,merge:merge,warning:function(){return warning;},subscribe:function(fn){listeners.push(fn);},
    update:function(v){if(typeof v.sound==='boolean'&&v.sound!==data.sound)soundDirty=true;data=clean(Object.assign({},data,v));var ok=local();if(api){pending=true;flush();}else warning=!ok||limited;notify();},
    record:function(level,moves){var now=Date.now(),r={id:now+'-'+Math.random().toString(36).slice(2,10),level:level,moves:moves,at:now};store.update({records:data.records.concat([r])});return r;},
    list:function(level){return data.records.filter(function(r){return r.level===level;});},ready:null};
  var xhs=root.xhs,native=xhs&&xhs.miniTool,launch=xhs&&xhs.launchOptions;
  function version(v){var env=v&&v.miniToolEnv;return Math.floor((Number(env&&env.buildVersion)||0)/1000);}
  var request;try{request=version(launch)?Promise.resolve(launch):native&&typeof native.getLaunchOptions==='function'?native.getLaunchOptions():Promise.resolve(null);}catch(e){request=Promise.resolve(null);}
  store.ready=Promise.resolve(request).then(function(v){
    if(version(v)<9460||!native||typeof native.getStorage!=='function'||typeof native.setStorage!=='function')return false;
    // Read and merge before sending mutations that happened while native startup was pending.
    api=native;writing=true;
    return call('getStorage',{key:key}).then(function(result){if(result&&result.data!==null&&result.data!==undefined){var value=JSON.parse(result.data);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid_storage');data=merge(data,value);}local();pending=true;}).catch(function(){warning=true;limited=true;api=null;pending=false;}).then(function(){writing=false;notify();flush();return !!api;});
  },function(){return false;});
  root.FlowStore=store;
})(window);

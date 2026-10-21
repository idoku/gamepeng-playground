/* Public mini-tool contract: https://miniapp-sandbox.xiaohongshu.com/minitool/doc
 * Verified 2026-10-12. No undocumented startup snapshot field is assumed. */
(function(root){
  'use strict';
  var api=root.xhs&&root.xhs.miniTool,version=0,launch=null,stores=[],listeners=[];
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function emit(){listeners.forEach(function(fn){fn();});}
  function call(name,args){return new Promise(function(resolve,reject){
    if(!api||typeof api[name]!=='function'){reject(Error('unavailable'));return;}
    // Interactive native pages complete only when the user returns or cancels.
    var interactive=/^(postNote|interactionOpenApi|saveImageToPhotosAlbum)$/.test(name);
    var done=false,timer=interactive?null:setTimeout(function(){finish(false,Error('timeout'));},3000);
    function finish(ok,value){if(done)return;done=true;clearTimeout(timer);(ok?resolve:reject)(value);}
    try{var p=api[name](Object.assign({},args,{success:function(v){finish(true,v);},fail:function(e){finish(false,e);}}));if(p&&typeof p.then==='function')p.then(function(v){finish(true,v);},function(e){finish(false,e);});}catch(e){finish(false,e);}
  });}
  function apply(v){launch=v;var env=v&&v.miniToolEnv;version=Math.floor((Number(env&&env.buildVersion)||0)/1000);return version;}
  var sync=root.xhs&&root.xhs.launchOptions;
  var ready=sync&&sync.miniToolEnv&&Number(sync.miniToolEnv.buildVersion)?Promise.resolve(apply(sync)):
    api&&typeof api.getLaunchOptions==='function'?call('getLaunchOptions',{}).then(apply,function(){return apply(null);}):Promise.resolve(apply(null));
  function localGet(key){try{return root.localStorage.getItem(key);}catch(e){return null;}}
  function localSet(key,data){try{root.localStorage.setItem(key,data);return true;}catch(e){return false;}}
  function Store(options){
    var self=this;this.key=options.key;this.clean=options.clean;this.mode='loading';this.warning='';this.blocked=false;this.chain=Promise.resolve();
    var raw=localGet(this.key),legacy=null;
    try{legacy=raw===null?(options.legacy?options.legacy():null):JSON.parse(raw);}catch(e){legacy=null;}
    this.data=this.clean(legacy);stores.push(this);
    this.ready=ready.then(function(){
      if(version>=9460&&api){
        self.mode='native';
        if(typeof api.getStorage!=='function'||typeof api.setStorage!=='function')throw Error('native_storage_unavailable');
        return call('getStorage',{key:self.key}).then(function(result){
          if(!result||(!Object.prototype.hasOwnProperty.call(result,'data')))throw Error('invalid_read');
          if(result.data!==null){if(typeof result.data!=='string')throw Error('invalid_read');var saved=JSON.parse(result.data);if(options.validate&&!options.validate(saved))throw Error('invalid_read');if(saved===null||typeof saved!=='object'||Array.isArray(saved)!==Array.isArray(self.data))throw Error('invalid_read');self.data=self.clean(options.merge?options.merge(self.data,saved):saved);}
          // Only migrate after a successful read proves the native key is absent.
          if(result.data===null&&legacy!==null)return call('setStorage',{key:self.key,data:JSON.stringify(self.data)}).then(function(){localSet(self.key,JSON.stringify(self.data));},function(){self.warning='存档迁移未成功，本次修改暂未保存';});
        });
      }
      self.mode='browser';if(legacy!==null&&!localSet(self.key,JSON.stringify(self.data)))self.warning='当前环境无法保存，关闭后可能丢失进度';
    }).catch(function(){self.blocked=true;self.mode='protected';self.warning='原存档未能读取，已保护旧数据；本次进度暂未保存';}).then(function(){emit();return self;});
  }
  Store.prototype.get=function(){return copy(this.data);};
  Store.prototype.update=function(change){var self=this;var task=this.chain.then(function(){return self.ready;}).then(function(){
    self.data=self.clean(typeof change==='function'?change(self.get()):Object.assign({},self.data,change));
    if(self.blocked){emit();return false;}
    var data=JSON.stringify(self.data);if(data.length>900000){self.warning='存档过大，本次修改未保存';emit();return false;}
    if(self.mode==='native')return call('setStorage',{key:self.key,data:data}).then(function(){self.warning='';localSet(self.key,data);emit();return true;},function(){self.warning='保存失败，本次修改暂未保存';emit();return false;});
    var ok=localSet(self.key,data);self.warning=ok?'':'当前环境无法保存，关闭后可能丢失进度';emit();return ok;
  });this.chain=task.catch(function(){self.warning='保存失败，本次修改暂未保存';emit();return false;});return this.chain;};
  function capabilities(){return {nativeStorage:!!(version>=9460&&api&&typeof api.getStorage==='function'&&typeof api.setStorage==='function'),comment:!!(version>=9490&&api&&typeof api.interactionOpenApi==='function'&&typeof api.writeTempFile==='function'),note:!!(api&&typeof api.postNote==='function'),album:!!(api&&typeof api.saveImageToPhotosAlbum==='function')};}
  function flush(){return Promise.all(stores.map(function(s){return s.chain.then(function(){return s.ready;});})).then(function(){if(stores.some(function(s){return s.blocked||s.warning;}))throw Error('unsaved');return true;});}
  function image(data,required){
    if(typeof data!=='string'||!/^data:image\/png;base64,/.test(data)||data.length>1400000)return Promise.reject(Error('invalid_card'));
    if(!api||typeof api.writeTempFile!=='function')return required?Promise.reject(Error('unavailable')):Promise.resolve(data);
    return call('writeTempFile',{data:data}).then(function(r){var path=r&&r.filePath;if(typeof path!=='string'||!path||/^(https?:|data:)/i.test(path)||(required&&/^(\/|\\|[a-z]:[\\/])/i.test(path)))throw Error('invalid_handle');return path;});
  }
  root.NeonPlatform={ready:ready,Store:Store,call:call,flush:flush,capabilities:capabilities,subscribe:function(fn){listeners.push(fn);},status:function(){var warning=stores.map(function(s){return s.warning;}).filter(Boolean);return warning.length?warning[0]:stores.some(function(s){return s.mode==='loading';})?'正在读取存档…':capabilities().nativeStorage?'小红书本地存档':'浏览器试玩存档（可能被清理）';},
    share:function(action,card,text,snapshot,title){return ready.then(function(){var caps=capabilities();if(!caps[action])throw Error(action==='comment'?'requires_949':'unavailable');return flush();}).then(function(){return image(card,action==='comment').then(function(path){
      if(action==='album')return call('saveImageToPhotosAlbum',{filePath:path});
      if(action==='note')return call('postNote',{title:title.slice(0,20),content:text.slice(0,1000),mediaInfo:{image_resources:[{url:path}]}});
      if(typeof snapshot!=='string'||snapshot.length>2048)throw Error('invalid_snapshot');
      return call('interactionOpenApi',{payload:{action:'post_comment',content:text,media_bean:[{media_type:'image',cover_image_url:path}],miniToolSnapshotInfo:snapshot},saveToAlbum:false}).then(function(r){if(!r||r.routed!==true)throw Error('route_failed');return r;});
    });});}
  };
})(window);

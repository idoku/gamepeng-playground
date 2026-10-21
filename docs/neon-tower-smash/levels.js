(function(root){
  'use strict';
  function block(x,y,w,h,material){return {x:x,y:y,w:w,h:h,material:material||'glass'};}
  function core(x,y){return {x:x,y:y};}
  var levels=[
    {name:'初次引爆',tip:'打断青色支柱，整塔倾倒',shots:3,optimal:1,two:2,blocks:[block(300,576,26,76),block(398,576,26,76),block(349,531,150,16,'steel'),block(329,496,24,52),block(370,496,24,52),block(349,461,112,16,'steel')],cores:[core(349,434)]},
    {name:'悬光之桥',tip:'左侧细柱是整座桥的薄弱处',shots:3,optimal:1,two:2,blocks:[block(268,566,22,96),block(408,566,32,96,'steel'),block(338,510,190,16,'steel'),block(290,482,30,38),block(388,482,30,38)],cores:[core(290,445),core(388,445)]},
    {name:'双塔回响',tip:'两座塔，一发穿透两处支撑',shots:4,optimal:2,two:3,blocks:[block(265,581,32,66),block(265,540,78,16,'steel'),block(265,504,24,56),block(265,468,78,16,'steel'),block(399,574,28,80),block(399,526,78,16,'steel'),block(399,487,24,62),block(399,448,78,16,'steel')],cores:[core(265,441),core(399,421)]},
    {name:'棱镜阶梯',tip:'从下向上，击碎支撑点',shots:4,optimal:2,two:3,blocks:[block(245,582,30,64),block(245,542,80,16,'steel'),block(310,548,30,132),block(310,474,80,16,'steel'),block(392,514,30,200),block(392,406,92,16,'steel')],cores:[core(245,515),core(310,447),core(392,379)]},
    {name:'紫电拱门',tip:'两根细柱托着三枚核心',shots:3,optimal:1,two:2,blocks:[block(268,539,24,150),block(416,539,24,150),block(342,456,198,16,'steel'),block(270,429,30,38),block(342,429,30,38),block(414,429,30,38)],cores:[core(270,391),core(342,391),core(414,391)]},
    {name:'能量王冠',tip:'玻璃支撑易碎，金属横梁会传递冲击',shots:4,optimal:2,two:3,blocks:[block(282,570,24,88),block(390,570,24,88),block(336,518,170,16,'steel'),block(282,482,24,56),block(390,482,24,56),block(336,446,170,16,'steel'),block(317,411,24,52),block(356,411,24,52),block(336,377,94,16,'steel')],cores:[core(282,419),core(390,419),core(336,350)]}
  ];
  // Taller crystal silhouettes fill the phone playfield; the floor remains fixed.
  levels.forEach(function(def,index){var factor=index===5?1.4:1.55;def.blocks.forEach(function(b){b.y=614-(614-b.y)*factor;b.h*=factor;});def.cores.forEach(function(c){c.y=614-(614-c.y)*factor;});});
  var chapters=['精准打击','光路试炼','护盾堡垒','极限弹道','终极挑战'];
  levels.forEach(function(def,i){def.blocks.forEach(function(b){if(b.h>b.w*1.4)b.material='pillar';});def.shots=[2,3,3,4,4,4][i];def.optimal=def.cores.length;def.two=Math.min(def.shots,def.optimal+1);def.tip=['瞄准上方核心，一发点亮','两枚核心在桥上，分别调整弹道','高低双塔，需要两个射击角度','不同高度的核心，需要不同力度','三枚核心，别浪费每一发','瞄准王冠中的三枚核心'][i];});
  function target(x,y,armor){return {x:x,y:y,hp:armor||1,fixed:armor>1};}
  function stand(x,y,w){return [block(x,(614+y+10)/2,22,614-y-10,'pillar'),block(x,y,w||60,16,'steel')];}
  function wall(x,top,bottom,w){return block(x,(top+bottom)/2,w||18,bottom-top,'pillar');}
  function reflector(x,y,w,angle){var b=block(x,y,w,14,'reflector');b.angle=angle;return b;}
  function scene(name,tip,positions,obstacles,spare){
    var blocks=[],cores=[],required=0;positions.forEach(function(p){var hp=p[2]||1;cores.push(target(p[0],p[1],hp));required+=hp;blocks=blocks.concat(stand(p[0],p[1]+26,p[3]||56));});
    levels.push({name:name,tip:tip,shots:required+(spare||0),optimal:required,two:Math.min(required+1,required+(spare||0)),blocks:blocks.concat(obstacles||[]),cores:cores});
  }
  scene('高低交错','两枚核心的高度差很大',[[288,300],[414,490]],[wall(226,420,614)],1);
  scene('隔墙取光','越过立柱，从上方击中核心',[[352,425],[430,285]],[wall(232,330,614)],1);
  scene('三点校准','每一座平台都需要重新瞄准',[[250,450],[340,260],[433,405]],[wall(285,490,614)],1);
  scene('棱镜反射','绿色反弹板会改变能量弹方向',[[337,315],[430,470]],[reflector(230,485,84,-.5),wall(285,495,614)],1);
  scene('穿越窄口','找到窄口，穿过一道光',[[315,425],[426,245]],[block(246,355,125,14,'pillar'),wall(230,485,614)],1);
  scene('四座光台','4枚核心，5发弹药',[[250,470],[310,270],[378,415],[440,190]],[wall(208,450,614)],1);
  scene('护盾初现','普通弹两次命中破盾，穿盾弹可一击贯穿',[[355,350,2]],[wall(238,435,614)],1);
  scene('双重防线','先打破护盾，再击碎核心',[[283,300,2],[415,445]],[wall(229,430,614)],1);
  scene('光之双盾','两枚护盾核心，4次有效命中',[[305,410,2],[420,275,2]],[wall(240,435,614)],1);
  scene('侧窗瞄准','从横梁两侧寻找射击角度',[[335,460,2],[431,260]],[block(285,365,88,14,'pillar'),wall(245,510,614)],1);
  scene('星环封锁','绕过屏障，点亮三枚星核',[[267,440],[350,280,2],[431,435]],[wall(224,465,614),block(389,345,60,14,'pillar')],1);
  scene('三盾之城','三枚护盾，6发必须有效命中',[[280,435,2],[355,260,2],[430,440,2]],[wall(223,475,614)],0);
  scene('高墙抛射','高墙之后，精准控制抛物线',[[354,480],[430,335]],[wall(236,285,614)],0);
  scene('上下夹层','横梁之间的空隙是射击窗口',[[340,455],[430,280]],[block(271,363,105,14,'pillar'),block(379,190,120,14,'pillar')],0);
  scene('反射之廊','反弹板不是目标，保持弹道方向',[[318,365],[427,485]],[reflector(220,476,85,-.48),wall(264,510,614)],0);
  scene('狭路三光','高低错开的3枚核心，各有入口',[[264,300],[348,475],[436,220]],[wall(212,455,614),block(376,365,70,14,'pillar')],0);
  scene('盾后双星','护盾与普通核心混合，只有3发',[[330,310,2],[430,470]],[wall(236,425,614),reflector(267,495,65,-.36)],0);
  scene('四向试炼','四个目标，四次精准命中',[[250,475],[310,250],[376,410],[440,170]],[wall(209,460,614)],0);
  scene('王冠重铸','高低护盾各需两发，不能失误',[[295,445,2],[425,260,2]],[wall(224,470,614),block(355,365,70,14,'pillar')],0);
  scene('五芒之阵','5枚核心，需要连续调整力度',[[244,490],[293,315],[340,180],[389,415],[444,260]],[wall(198,475,614)],0);
  scene('三层守护','混合目标分布在三种高度',[[274,460,2],[352,270],[431,410,2]],[wall(221,478,614)],0);
  scene('极光内舱','高抛绕过屏障，再落入内舱',[[338,455,2],[429,295,2]],[wall(234,340,614),block(368,220,115,14,'pillar')],0);
  scene('无隙连击','四枚核心，其中两枚带护盾',[[250,450],[310,250,2],[378,400],[437,175,2]],[wall(210,467,614)],0);
  scene('霓虹终局','4枚护盾，8发弹药，精准通关',[[250,460,2],[310,240,2],[378,395,2],[438,170,2]],[wall(211,474,614),reflector(258,540,58,-.34)],0);
  levels[14].shots=4;levels[14].optimal=3;levels[14].two=4;
  levels[17].shots=5;levels[17].optimal=4;levels[17].two=5;levels[17].tip='三枚护盾，需要利用连续命中节省弹药';
  levels[28].shots=6;levels[28].optimal=5;levels[28].two=6;
  levels[29].shots=6;levels[29].optimal=6;levels[29].two=6;levels[29].tip='4枚护盾，只有6发，寻找能连续命中的弹道';
  levels.forEach(function(def,i){def.chapter=Math.floor(i/6);def.difficulty=i<6?'入门':i<12?'进阶':i<18?'困难':i<24?'极难':'大师';});
  var data={levels:levels,chapters:chapters,rules:2,width:480,height:660,floor:614,anchor:{x:92,y:548}};
  root.TowerLevels=data;
  if(typeof module!=='undefined'&&module.exports)module.exports=data;
})(typeof window!=='undefined'?window:global);

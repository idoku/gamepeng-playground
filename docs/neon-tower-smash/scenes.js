(function(root){
  'use strict';
  var scenes=[{name:'霓虹街区',sky:['#0c1937','#262248','#102639'],accent:'#50d9ec',floor:'#102d43'},{name:'赛博港湾',sky:['#082735','#14535b','#133850'],accent:'#72efd9',floor:'#12475b'},{name:'极光雪岭',sky:['#11152f','#202d52','#193e50'],accent:'#a1f1ef',floor:'#294053'},{name:'赤霞峡谷',sky:['#261b35','#704251','#242844'],accent:'#ffa78a',floor:'#443241'},{name:'星环基地',sky:['#10122f','#272b4b','#143347'],accent:'#9dc1ff',floor:'#162d45'}];
  function line(c,a,b,x,y,color,w){c.strokeStyle=color;c.lineWidth=w||1;c.beginPath();c.moveTo(a,b);c.lineTo(x,y);c.stroke();}
  function path(c,pts,fill,stroke){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(var i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
  function disk(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
  function glow(c,x,y,r,color){var g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  function draw(c,id){var s=scenes[id]||scenes[0];c.clearRect(0,0,480,660);var g=c.createLinearGradient(0,0,0,660);g.addColorStop(0,s.sky[0]);g.addColorStop(.58,s.sky[1]);g.addColorStop(1,s.sky[2]);c.fillStyle=g;c.fillRect(0,0,480,660);
    for(var i=0;i<65;i++){disk(c,(i*79+13)%480,(i*i*23+47)%410,i%8===0?1.1:.5,i%3===0?'#c7e7ff80':'#b6d6f530');}
    if(id===0){
      glow(c,340,220,220,'#9962bc40');glow(c,94,125,105,'#5acbed35');disk(c,95,124,33,'#a4e6ff12');
      for(var layer=0;layer<3;layer++)for(var n=0;n<12;n++){var x=n*44-20+layer*10,h=60+(n*43+layer*51)%185,w=26+(n*11)%16,y=614-h-layer*13;c.fillStyle=['#101a30','#12273d','#143749'][layer];c.fillRect(x,y,w,h);line(c,x,y,x+w,y,layer===2?'#61dcec50':'#7665c950');for(var k=0;k<5;k++)for(var j=0;j<9;j++)if((n+k+j+layer)%4===0){c.fillStyle=j%3?'#5ae0ed35':'#ce8aff38';c.fillRect(x+4+k*5,y+8+j*17,2,5);}if(n%4===1){line(c,x+w/2,y,x+w/2,y-28,'#63c7df55');disk(c,x+w/2,y-28,2,'#7ddfff');}}
      line(c,0,452,480,402,'#4bb4e51a',6);line(c,0,480,480,430,'#af73db14',4);
    }
    if(id===1){
      glow(c,105,180,160,'#69f4d73a');disk(c,106,178,39,'#88d7d82a');c.fillStyle='#103b4b';c.fillRect(0,452,480,163);
      for(var wave=0;wave<18;wave++){var y=465+wave*8;line(c,(wave*37)%180,y,480-(wave*29)%130,y,wave%3?'#5ce1d722':'#87fff23b',1);}
      for(var pier=0;pier<5;pier++){var px=35+pier*105;path(c,[[px,425],[px+58,425],[px+58,445],[px,445]],'#183849','#6cd0d733');line(c,px+18,438,px+18,486,'#23495b',8);}
      for(var crane=0;crane<3;crane++){var cx=48+crane*170,cy=360-crane%2*90;line(c,cx,cy,cx,448,'#326e7950',8);line(c,cx-20,cy,cx+95,cy-17,'#6cacac66',4);line(c,cx,cy-38,cx+85,cy-16,'#50999c55',2);line(c,cx+85,cy-16,cx+85,cy+25,'#64e1d966');disk(c,cx+85,cy+27,2,'#abffe055');}
      line(c,0,445,480,445,'#71e9d766',2);line(c,0,431,480,431,'#89dccc40');
    }
    if(id===2){
      glow(c,175,205,240,'#56dece25');
      for(var ribbon=0;ribbon<4;ribbon++){c.beginPath();c.moveTo(-30,130+ribbon*26);c.bezierCurveTo(125,40+ribbon*45,220,300-ribbon*35,510,112+ribbon*38);c.strokeStyle=['#67f5d01d','#79d5f928','#aa83fb2c','#b8efec18'][ribbon];c.lineWidth=17+ribbon*4;c.stroke();}
      path(c,[[0,470],[75,348],[126,399],[215,259],[304,384],[365,292],[480,435],[480,615],[0,615]],'#253c57','#7898af40');
      path(c,[[155,345],[215,259],[272,339],[229,317],[209,332],[192,311]],'#b5d6dd44');path(c,[[328,338],[365,292],[413,359],[377,343],[360,324]],'#afdbde38');
      path(c,[[0,542],[85,476],[152,511],[272,424],[354,489],[440,439],[480,480],[480,615],[0,615]],'#19364a','#b4e1e340');
      for(var tree=0;tree<11;tree++){var tx=tree*48+5,ty=552+(tree%3)*17;path(c,[[tx,ty-45],[tx-12,ty],[tx+12,ty]],'#174348','#68b5bc25');}
    }
    if(id===3){
      glow(c,135,205,175,'#ffad7340');disk(c,135,205,65,'#ffbd8b50');for(var stripe=0;stripe<6;stripe++){line(c,75,209+stripe*8,196,209+stripe*8,'#764357',3);}
      path(c,[[0,280],[44,271],[61,335],[98,345],[101,415],[136,424],[155,614],[0,614]],'#533c53','#bb7c773d');
      path(c,[[480,320],[442,313],[421,364],[386,377],[374,452],[345,461],[326,615],[480,615]],'#513951','#b3757833');
      path(c,[[0,526],[106,497],[190,529],[287,467],[364,522],[480,483],[480,615],[0,615]],'#302b46','#edb39326');
      for(var contour=0;contour<7;contour++){line(c,0,329+contour*38,60+contour*11,325+contour*39,'#d3937f2d',2);line(c,419-contour*9,373+contour*30,480,363+contour*30,'#d79a8030',2);}
      line(c,0,580,480,535,'#ffb39722',3);
    }
    if(id===4){
      glow(c,122,177,175,'#7d94f540');var planet=c.createLinearGradient(70,130,170,225);planet.addColorStop(0,'#778ab17a');planet.addColorStop(1,'#36335f70');disk(c,122,177,57,planet);c.save();c.translate(122,177);c.rotate(-.35);c.strokeStyle='#a4c9ed55';c.lineWidth=4;c.beginPath();c.ellipse(0,0,96,16,0,0,Math.PI*2);c.stroke();c.restore();
      for(var strut=0;strut<6;strut++){var sx=strut*94-20;path(c,[[sx,445],[sx+30,415],[sx+63,415],[sx+90,445],[sx+90,607],[sx,607]],'#1d2b43','#5369944a');line(c,sx+8,449,sx+80,449,'#70adf43f',2);for(var slot=0;slot<4;slot++)line(c,sx+15,470+slot*22,sx+71,470+slot*22,'#6d8ed522',2);}
      line(c,0,388,480,388,'#86a8db44',5);for(var truss=0;truss<8;truss++){line(c,truss*60,386,truss*60+30,366,'#86a8db3b');line(c,truss*60+30,366,truss*60+60,386,'#86a8db3b');}line(c,0,366,480,366,'#6278ad55',2);
    }
    line(c,0,614,480,614,s.accent+'88',1.5);var floor=c.createLinearGradient(0,614,0,660);floor.addColorStop(0,s.floor);floor.addColorStop(1,'#071420');c.fillStyle=floor;c.fillRect(0,615,480,45);for(var grid=-4;grid<13;grid++)line(c,240+(grid-4)*30,615,240+(grid-4)*85,660,s.accent+'20');[625,642,658].forEach(function(y){line(c,0,y,480,y,s.accent+'22');});
  }
  root.TowerScenes={scenes:scenes,draw:draw};if(typeof module!=='undefined'&&module.exports)module.exports=root.TowerScenes;
})(typeof window!=='undefined'?window:global);

// Observed finite source campaign through its level100 ending. Geometry/forces are authored calibration.
// Evidence: runtime/research/robo-crash-observations.md and subsequent normal-input replay.
const m=(type,options={})=>({type,...options});
const goals={
 ANY4:{type:'any',count:4,text:'BREAK OFF 4 BODY PARTS'},
 ANY1:{type:'any',count:1,text:'BREAK OFF ANY BODY PART'},ANY2:{type:'any',count:2,text:'BREAK OFF 2 BODY PARTS'},ANY3:{type:'any',count:3,text:'BREAK OFF 3 BODY PARTS'},
 HEAD:{type:'specific',parts:['head'],count:1,text:'DETACH THE HEAD'},ARMS:{type:'specific',parts:['left arm','right arm'],count:2,text:'RIP OFF BOTH ARMS'},LEGS:{type:'specific',parts:['left leg','right leg'],count:2,text:'BREAK OFF BOTH LEGS'},
 LIMBS4:{type:'specific',parts:['left arm','right arm','left leg','right leg'],count:4,text:'REMOVE ALL 4 LIMBS'},
 DESTROY5:{type:'any',count:5,text:'COMPLETELY DESTROY THE ROBOT',policyUnverified:true,policy:'Authored five-target policy: head and four limbs. Original scoring membership is unverified.'}
};
const right={x:310,y:490},left={x:105,y:490},center={x:210,y:490};
// Unknown source spawn sides use an authored safe left opening, not a claimed observation.
const rows=[
 ['ANY1',left,[m('saw')]],
 ['HEAD',left,[m('guillotine')]],
 ['ANY1',{x:302,y:490},[m('anvil')]],
 ['ANY2',left,[m('pendulum')]],
 ['ANY2',left,[m('chainBall',{pivotX:300,movable:true})]],
 ['ANY1',right,[m('piston',{side:'left'})]],
 ['ANY2',left,[m('wheel',{movable:true})]],
 ['ANY2',right,[m('electric',{x:180})]],
 ['ANY1',right,[m('spikeWall',{x:44,y:475,h:240,direction:'right'})]],
 ['ANY3',right,[m('press',{x:135,w:140})]],
 ['ARMS',right,[m('inwardSpikes')]],
 ['ARMS',left,[m('cleavers')]],
 ['ARMS',right,[m('spikeBay')]],
 ['LEGS',left,[m('conveyor'),m('saw',{x:330})]],
 ['LEGS',right,[m('springSpikes',{x:110})]],
 ['HEAD',left,[m('saw',{x:310,y:405,r:43,powered:true,support:true})]],
 ['ANY2',left,[m('verticalSaw')]],
 ['LEGS',left,[m('railSaw')]],
 ['ANY2',left,[m('saw',{x:165,y:551,r:30}),m('saw',{x:310,y:360,r:44,support:true})]],
 ['HEAD',left,[m('pivotBlade')]],
 ['ANY3',left,[m('press',{x:230,w:170,label:'40T'})]],
 ['HEAD',left,[m('upPiston')]],
 ['LIMBS4',center,[m('crusher')]],
 ['LEGS',left,[m('railWheel')]],
 ['ARMS',left,[m('drum')]],
 ['ANY2',{x:70,y:490},[m('barrier')]],
 ['ANY2',{x:65,y:350},[m('bridge'),m('spikeBed',{x:210,w:210})]],
 ['ANY2',{x:210,y:490},[m('pivotPlatform'),m('spikeBed',{x:88,w:120}),m('spikeBed',{x:328,w:120}),m('spikeWall',{x:402,y:500,h:180,direction:'left'})]],
 ['ANY2',{x:365,y:490},[m('tiltPlatform'),m('saw',{x:95,y:556,r:35}),m('spikeBed',{x:300,w:75})]],
 ['ANY3',left,[m('swingPlatform'),m('spikeWall',{x:22,y:370,h:130,direction:'right'}),m('spikeWall',{x:398,y:470,h:150,direction:'left'})]],
 ['ANY2',left,[m('pendulum'),m('wheel',{movable:true})]],
 ['ANY3',right,[m('chainBall',{pivotX:110}),m('spikedWheel',{x:175,y:554,r:36})]],
 ['LEGS',{x:335,y:490},[m('chainBall',{pivotX:210}),m('piston',{side:'left'})]],
 ['ANY3',right,[m('cleavers'),m('inwardSpikes')]],
 ['HEAD',{x:335,y:490},[m('piston',{side:'left'}),m('chainBall',{pivotX:210,movable:true})]],
 ['ARMS',left,[m('pendulum'),m('wheel',{movable:false})]],
 ['HEAD',right,[m('chainBall',{pivotX:110}),m('wheel',{x:180,movable:false})]],
 ['LEGS',left,[m('press'),m('piston',{side:'right',y:450})]],
 ['HEAD',{x:335,y:490},[m('chainBall',{pivotX:210}),m('piston',{side:'left'})]],
 ['DESTROY5',{x:230,y:490},[m('spikeBay'),m('piston',{side:'right'})]],
 ['ANY3',left,[m('conveyor'),m('spikedWheel',{x:330,y:553,r:38})]],
 ['HEAD',right,[m('spikedWheel',{x:210,y:553,r:38}),m('piston',{side:'left'})]],
 ['LEGS',left,[m('springSpikes',{x:220,movable:false}),m('piston',{side:'right'})]],
 ['ANY2',{x:230,y:490},[m('spikeBay'),m('guillotine')]],
 ['ANY2',left,[m('press',{opposing:true,maxY:430}),m('electric',{x:344,w:100})]],
 ['ARMS',right,[m('cleavers'),m('electric',{x:90,w:110})]],
 ['LEGS',left,[m('guillotine',{x:210}),m('anvil',{x:335,y:255,movable:false,autoDrop:true})]],
 ['ARMS',center,[m('electric',{x:90,w:110}),m('guillotine')]],
 ['ARMS',left,[m('spikedWheel',{x:330,y:553,r:38}),m('piston',{side:'right',y:440})]],
 ['DESTROY5',left,[m('cleavers'),m('conveyor'),m('spikedWheel',{x:330,y:553,r:38})]],
 ['LEGS',left,[m('conveyor'),m('electric',{x:340,w:110})]],
 ['ARMS',right,[m('cleavers'),m('wheel',{x:85,movable:false})]],
 // Source 53–59: normal-input replay, 2026-11-05 00:38–00:52 UTC.
 // Goals, spawn sides and compositions are observed; dimensions remain authored.
 ['LIMBS4',left,[m('cleavers'),m('wheel',{x:330,movable:false})]],
 ['LEGS',center,[m('piston',{side:'left'}),m('spikeBay',{x:325})]],
 ['LEGS',right,[m('piston',{side:'left'}),m('saw',{x:210})]],
 ['LEGS',right,[m('pendulum',{pivotX:110}),m('wheel',{x:180,movable:false})]],
 ['LEGS',right,[m('anvil',{x:210,movable:true}),m('electric',{x:90,w:110})]],
 ['LIMBS4',left,[m('conveyor'),m('guillotine')]],
 ['ANY3',left,[m('conveyor'),m('anvil',{x:335,movable:false,autoDrop:true})]],
 // Source 60–63: normal-input replay, 2026-11-05 01:06–01:11 UTC.
 // Only source62 verifies travel for this spike-wall composition.
 ['DESTROY5',left,[m('conveyor'),m('electric',{x:340,w:110})]],
 ['ARMS',left,[m('cleavers'),m('saw',{x:330})]],
 ['LEGS',left,[m('chainBall',{pivotX:210}),m('spikeWall',{x:388,y:530,w:22,h:125,direction:'left',travel:208,railY:598})]],
 ['LEGS',left,[m('chainBall',{pivotX:210}),m('piston',{side:'right'})]],
 // Source 64–68: normal-input replay, 2026-11-05 01:26–01:29 UTC.
 // Spring movability was not tested in these compositions; keep it disabled.
 ['ANY3',center,[m('springSpikes',{x:320,movable:false}),m('wheel',{x:85,movable:false})]],
 ['ANY3',left,[m('anvil',{x:210,movable:false,autoDrop:true}),m('guillotine')]],
 ['LIMBS4',left,[m('spikeBay',{x:210}),m('anvil',{x:335,movable:true})]],
 ['ANY4',right,[m('springSpikes',{x:210,movable:false}),m('anvil',{x:90,movable:false,autoDrop:true})]],
 ['LIMBS4',center,[m('press',{x:90,w:130,opposing:true,maxY:430}),m('electric',{x:344,w:100})]],
 // Source 69–71: normal-input replay, 2026-11-05 01:45–01:48 UTC.
 // Source70 highlights the anchored ball; reuse its existing chain constraint.
 // Source71's piston is elevated; exact height and dimensions are authored.
 ['ANY4',right,[m('chainBall',{pivotX:210,angle:0}),m('piston',{side:'left'})]],
 ['DESTROY5',center,[m('chainBall',{pivotX:110,angle:0,movable:true}),m('inwardSpikes',{x:320,closeTravel:56})]],
 ['ANY3',left,[m('electric',{x:210}),m('piston',{side:'right',y:390,h:90})]],
 // Source 72–75: normal-input replay, 2026-11-05 01:53–01:56 UTC.
 // The left wall strip in72 is separate from its opposing press.
 // Source75 highlights the ball; its exact drag constraint remains unverified,
 // so reuse the existing anchored-chain interaction rather than invent free motion.
 ['ANY4',right,[m('press',{x:90,w:130,opposing:true,maxY:430}),m('spikeWall',{x:22,y:400,h:160,direction:'right'}),m('anvil',{x:210,movable:true})]],
 ['ANY3',left,[m('conveyor'),m('saw',{x:330}),m('piston',{side:'right',y:440})]],
 ['ANY3',right,[m('chainBall',{pivotX:210,angle:0}),m('piston',{side:'left',y:480,h:90}),m('saw',{x:110})]],
 ['ANY4',right,[m('chainBall',{pivotX:210,angle:0,movable:true}),m('piston',{side:'left',y:480,h:90}),m('saw',{x:110})]],
 // Source 76–80: normal-input replay, 2026-11-05 02:08–02:11 UTC.
 // Double-ball anchors shift between76/77; only80 highlights both balls.
 // Floor-wheel placement and all dimensions/forces remain authored calibration.
 // Source80 jaw travel was NOT observed: keep static, unlike source70.
 // Destroy0/5 also occurs off-decade; exact scoring membership remains unverified.
 ['DESTROY5',right,[m('chainBall',{pivotX:110,angle:0}),m('chainBall',{pivotX:210,angle:0}),m('wheel',{x:180,movable:false})]],
 ['DESTROY5',left,[m('chainBall',{pivotX:210,angle:0}),m('chainBall',{pivotX:330,angle:0}),m('wheel',{x:330,movable:false})]],
 ['ANY4',left,[m('cleavers'),m('saw',{x:210}),m('electric',{x:340,w:110})]],
 ['DESTROY5',left,[m('conveyor'),m('saw',{x:330}),m('chainBall',{pivotX:330,angle:0})]],
 ['DESTROY5',right,[m('chainBall',{pivotX:110,angle:0,movable:true}),m('chainBall',{pivotX:210,angle:0,movable:true}),m('inwardSpikes',{x:100,gap:130})]],
 // Source81–85: normal-input replay, 2026-11-05 02:18–02:23 UTC.
 // 81's upper saw translates horizontally; 83's jaws close AND reopen after
 // robot engagement. Timing/dimensions remain authored, not measured constants.
 // 85's left wall moves right and back; only a short excursion was observed,
 // so its full rail span is visual evidence, not an asserted travel amplitude.
 ['ANY4',left,[m('railSaw',{x:190,y:385,minX:90,maxX:330,railY:330,movable:false}),m('spikeWall',{x:388,y:530,w:22,h:125,direction:'left',travel:208,railY:598})]],
 ['ANY4',right,[m('cleavers'),m('saw',{x:110}),m('saw',{x:210})]],
 ['ANY4',right,[m('chainBall',{pivotX:110,angle:0}),m('spikeWall',{x:22,y:440,h:140,direction:'right'}),m('inwardSpikes',{x:210,gap:130,closeTravel:56,cyclic:true})]],
 ['ANY3',left,[m('chainBall',{pivotX:210,angle:0}),m('piston',{side:'right',y:390,h:90})]],
 ['ANY4',right,[m('pendulum',{pivotX:110}),m('spikeWall',{x:22,y:530,w:22,h:125,direction:'right',travel:-20,railY:598,railEndX:270}),m('spikeWall',{x:398,y:440,h:140,direction:'left'})]],
 // Source86–90: normal-input replay, 2026-11-05 02:44–02:46 UTC.
 // 87 jaw motion was not isolated: keep static, not source83's cyclic motion.
 // 89 conveyor points left. 90 spring dragging was untested and stays disabled.
 // Dimensions/forces remain authored; destroy membership remains unverified.
 ['ANY4',left,[m('chainBall',{pivotX:210,angle:0}),m('piston',{side:'right',y:375,h:90})]],
 ['DESTROY5',center,[m('chainBall',{pivotX:110,angle:0}),m('inwardSpikes',{x:100,gap:130}),m('piston',{side:'right',y:380,h:90})]],
 ['LIMBS4',left,[m('chainBall',{pivotX:210,angle:0}),m('chainBall',{pivotX:330,angle:0}),m('wheel',{x:330,movable:false})]],
 ['LIMBS4',right,[m('press',{x:90,w:130}),m('conveyor',{x:210,w:160,speed:-95}),m('chainBall',{pivotX:210,angle:0})]],
 ['DESTROY5',center,[m('saw',{x:110}),m('springSpikes',{x:330,movable:false})]],
 // Source91–95: normal-input replay, 2026-11-05 02:54–02:58 UTC.
 // 91's highlighted wheel alone completed the source goal; floor return was
 // observed, but its held vertical constraint remains unverified. Reuse wheel physics.
 // 95 shows inward jaw travel, not reopening, and only the CENTER ball highlighted.
 // Its ball drag was untested; reuse the anchored-chain constraint, not free motion.
 ['DESTROY5',right,[m('pendulum',{pivotX:110}),m('spikeWall',{x:22,y:380,h:140,direction:'right'}),m('wheel',{x:155,movable:true})]],
 ['LIMBS4',right,[m('cleavers'),m('saw',{x:110}),m('saw',{x:210})]],
 ['LIMBS4',left,[m('cleavers'),m('saw',{x:210}),m('saw',{x:330})]],
 ['DESTROY5',right,[m('pendulum',{pivotX:110}),m('saw',{x:210})]],
 ['DESTROY5',right,[m('chainBall',{pivotX:110,angle:0,movable:false}),m('chainBall',{pivotX:210,angle:0,movable:true}),m('inwardSpikes',{x:100,gap:130,closeTravel:56})]],
 // Source96–100: normal-input replay, 2026-11-05 03:11–03:16 UTC.
 // 97 wall and99 upper saw translate horizontally. 100 jaw closure is observed,
 // but reopening is unverified. The original displays its terminal screen at100.
 // Exact destroy-score membership and all geometry/forces remain authored caveats.
 ['DESTROY5',left,[m('electric',{x:210}),m('saw',{x:330})]],
 ['LIMBS4',left,[m('chainBall',{pivotX:210,angle:0}),m('chainBall',{pivotX:330,angle:0}),m('spikeWall',{x:388,y:530,w:22,h:125,direction:'left',travel:208,railY:598})]],
 ['DESTROY5',right,[m('cleavers'),m('saw',{x:210})]],
 ['DESTROY5',right,[m('railSaw',{x:110,y:400,minX:80,maxX:340,railY:345,movable:false}),m('saw',{x:210})]],
 ['DESTROY5',left,[m('cleavers'),m('inwardSpikes',{x:210,gap:130,closeTravel:56}),m('spikeWall',{x:398,y:340,h:140,direction:'left'})]]
];
const names={saw:'Circular saw',guillotine:'Guillotine',anvil:'Hanging anvil',pendulum:'Pivot hammer',chainBall:'Chain wrecking ball',piston:'20T piston',wheel:'Loose wheel',electric:'Electric pad',spikeWall:'Spike wall',press:'Vertical press',inwardSpikes:'Inward spike columns',cleavers:'Rotating cleavers',spikeBay:'Spike bay',conveyor:'Conveyor',springSpikes:'Spring and ceiling spikes',verticalSaw:'Vertical travelling saw',railSaw:'Rail saw',pivotBlade:'Rocking blade',upPiston:'Upward piston',crusher:'60T wall crushers',railWheel:'Rail spiked wheel',drum:'Studded drum',spikedWheel:'Spiked wheel',barrier:'Travelling barrier',bridge:'Two-leaf bridge',spikeBed:'Floor spikes',pivotPlatform:'Rotating platform',tiltPlatform:'Tilting platform',swingPlatform:'Swinging platform'};
const freeze=o=>{Object.values(o).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return Object.freeze(o);};
export const LEVELS=freeze(rows.map(([key,spawn,machines],i)=>({sourceNumber:i+1,sourceLevel:i+1,spawn,kind:machines[0].type,machine:machines.map(m=>names[m.type]).join(' + '),name:machines.map(m=>names[m.type]).join(' + '),objective:{...goals[key]},goal:goals[key].text,count:goals[key].count,verifiedGoal:true,goalMembershipVerified:key!=='DESTROY5',hint:'Grab the robot. Hold against machinery or release to throw.',machines})));

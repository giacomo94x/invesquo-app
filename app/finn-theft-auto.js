/* Finholdra FinnTheftAuto 10.9.1: original stylized top-down free-roam city, no third-party assets */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const root=$('finnTheftAuto'),canvas=$('ftaCanvas'),mini=$('ftaMini');
if(!root||!canvas||!mini)return;
const c=canvas.getContext('2d',{alpha:true}),mc=mini.getContext('2d');if(!c||!mc)return;
const WORLD=4032,GRID=448,ROAD=112,SIDE=16,BLOCKS=WORLD/GRID,TAU=Math.PI*2;
const rngSeed=20261121;let seed=rngSeed;const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296};
const r=(a,b)=>a+(b-a)*rand(),pick=arr=>arr[Math.floor(rand()*arr.length)],clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const streets=['Via dei Dividendi','Corso dei Futures','Viale della Liquidità','Via degli ETF','Corso delle Cedole','Viale dello Spread','Via dei Mercati','Lungomercato','Via dei Rendimenti'];
const cross=['Piazza Affari','Borgo Nasdaq','Quartiere Euribor','Piazza del Toro','Piazzale Obbligazioni','Darsena delle Azioni','Porto delle Valute','Distretto Indici','Borsa Vecchia'];
const parkNames=['Giardini del PAC','Parco Riserva','Parco degli Interessi','Mercato Verde'];
const buildings=[];const parks=[];const landmarks=[];
const labels=['BANCA','BORSA','PAC','ETF','FINTECH','EXCHANGE','DIVIDENDI','BROKER','FONDI','CENTRALE','MERCATO','DEPOSITI','CREDITI','VALUTE','INDICI'];
const palettes=['#35475c','#4a6071','#48546b','#566d71','#3f5361','#62737c','#315567','#6b6367'];
function addBuilding(x,y,w,h){buildings.push({x,y,w,h,col:pick(palettes),roof:pick(['#7fa9b2','#a0b0bc','#8e9bba','#9bafa7']),lab:pick(labels),id:buildings.length})}
for(let row=0;row<BLOCKS;row++)for(let col=0;col<BLOCKS;col++){
 const x=col*GRID+ROAD/2+SIDE+14,y=row*GRID+ROAD/2+SIDE+14,bw=GRID-ROAD-2*SIDE-28;
 if((row+col*3)%11===0 || (col===4&&row===4)){
  parks.push({x:x-12,y:y-12,w:bw+24,h:bw+24,name:pick(parkNames)});
 }else{
  const divisions=rand()<.5?2:3;
  if(divisions===2){addBuilding(x,y,bw,bw*.47);addBuilding(x,y+bw*.55,bw,bw*.45)}
  else{addBuilding(x,y,bw*.46,bw*.48);addBuilding(x+bw*.54,y,bw*.46,bw*.48);addBuilding(x+bw*.15,y+bw*.56,bw*.74,bw*.44)}
 }
}
landmarks.push({x:GRID*4,y:GRID*4,t:'PIAZZA AFFARI',color:'#e9bd47'},{x:GRID*6,y:GRID*2,t:'BORSA FUTURES',color:'#6ee6b8'},{x:GRID*2,y:GRID*6,t:'MERCATO VALUTE',color:'#f9ab6a'});
const cars=[];const people=[];const police=[];const particles=[];
const vehicleColors=['#e6bc46','#75c9ad','#e88789','#9aabe0','#dfdfdf','#9181c7','#48a2b8'];
function carSpawn(i,isPolice=false){const vertical=rand()<.5,lane=r(0,GRID*BLOCKS),axis=Math.floor(lane/GRID)*GRID+(rand()<.5?-26:26);let x=vertical?axis:lane,y=vertical?lane:axis;
 const speed=(isPolice?115:r(35,66))*(rand()<.5?-1:1);return {x,y,vertical,dir:Math.sign(speed),speed:Math.abs(speed),col:isPolice?'#f2f2f7':pick(vehicleColors),police:isPolice,occupied:false,heading:vertical?(speed>0?Math.PI/2:-Math.PI/2):(speed>0?0:Math.PI),health:100,id:i};}
for(let i=0;i<67;i++)cars.push(carSpawn(i));
function personSpawn(i){const x=r(80,WORLD-80),y=r(80,WORLD-80);const v=rand()<.5;const base=Math.floor((v?x:y)/GRID)*GRID;return {x:v?base+r(65,150):x,y:v?y:base+r(65,150),axis:v?'y':'x',dir:rand()<.5?1:-1,speed:r(15,33),phase:r(0,TAU),col:pick(['#ffd479','#79d5a7','#b4a6e0','#f49eac','#9dd0db']),down:0};}
for(let i=0;i<94;i++)people.push(personSpawn(i));
const hero={x:GRID*4,y:GRID*4+GRID/2,dir:0,hp:100,armor:0,cash:120,ammo:55,car:null,weapon:'melee',invuln:0,step:0};
let active=false,raf=0,last=0,heat=0,policeTick=0,spawnTick=0,worldTime=0,viewW=1,viewH=1,zoom=1,camX=0,camY=0,toastTime=0,saveOverflow='',fireCooldown=0,rideCooldown=0,miniTick=0;
const held=new Set();const has=(name)=>held.has(name);
const bounds=b=>({x:b.x,y:b.y,w:b.w,h:b.h});
function circleRect(x,y,rad,b){const xx=clamp(x,b.x,b.x+b.w),yy=clamp(y,b.y,b.y+b.h);return (x-xx)**2+(y-yy)**2<(rad)**2}
function blocked(x,y,rad=14){if(x<16||x>WORLD-16||y<16||y>WORLD-16)return true;return buildings.some(b=>circleRect(x,y,rad,b));}
function walk(x,y,vx,vy,rad){const nx=clamp(x+vx,24,WORLD-24);if(!blocked(nx,y,rad))x=nx;const ny=clamp(y+vy,24,WORLD-24);if(!blocked(x,ny,rad))y=ny;return [x,y]}
function nearestCar(maxDist=80){let ret=null,dist=maxDist;for(const car of cars){if(car.occupied)continue;const d=Math.hypot(car.x-hero.x,car.y-hero.y);if(d<dist){dist=d;ret=car}}return ret}
function note(text,secs=3){const node=$('ftaMessage');if(!node)return;node.textContent=text;node.classList.add('show');toastTime=secs;}
function raise(amount){heat=clamp(heat+amount,0,5);policeTick=0}
function stars(){const n=Math.ceil(heat-0.01);$('ftaStars').textContent='★'.repeat(n)+'☆'.repeat(5-n)}
function status(){stars();$('ftaHealth').textContent=`♥ ${Math.ceil(hero.hp)}/100`;$('ftaCash').textContent=`€ ${Math.floor(hero.cash)} · 🔫 ${hero.ammo}`;$('ftaRide').innerHTML=hero.car?'<span>🚶</span>Scendi':'<span>🚙</span>Entra';$('ftaAttack').innerHTML=hero.weapon==='fire'?'<span>🎯</span>Spara':'<span>👊</span>Colpisci';}
function district(){const col=clamp(Math.round(hero.x/GRID),0,8),row=clamp(Math.round(hero.y/GRID),0,8);const v=Math.abs(hero.x%GRID-GRID/2),h=Math.abs(hero.y%GRID-GRID/2);return (v<h?streets[col]:streets[row])+' · '+cross[(row+col)%cross.length]}
function toggleRide(){if(!active||rideCooldown>0)return;rideCooldown=.35;if(hero.car){const vehicle=hero.car;for(const [dx,dy] of [[40,0],[-40,0],[0,40],[0,-40]]){if(!blocked(vehicle.x+dx,vehicle.y+dy,16)){hero.x=vehicle.x+dx;hero.y=vehicle.y+dy;vehicle.occupied=false;hero.car=null;note('Sei sceso dal veicolo.');status();return}}note('Qui non puoi scendere: spostati su una strada.');return}
 const car=nearestCar(75);if(!car){note('Avvicinati a una vettura per entrare.');return;}car.occupied=true;hero.car=car;hero.x=car.x;hero.y=car.y;hero.dir=car.heading;raise(.35);note('Veicolo acquisito • guida con le frecce');status()}
function attack(){if(!active||fireCooldown>0)return;fireCooldown=hero.weapon==='fire'?.36:.45;if(hero.weapon==='fire'&&hero.ammo<=0){note('Munizioni esaurite. Premi Arma per il corpo a corpo.');return;}if(hero.weapon==='fire')hero.ammo--;
 const reach=hero.weapon==='fire'?255:57;const aim=hero.dir;let hit=false;for(const p of people){if(p.down>0)continue;const dx=p.x-hero.x,dy=p.y-hero.y,dist=Math.hypot(dx,dy);if(dist>reach)continue;let delta=Math.atan2(dy,dx)-aim;delta=Math.atan2(Math.sin(delta),Math.cos(delta));if(Math.abs(delta)>(hero.weapon==='fire'?.35:.95))continue;let clear=true;for(let s=1;s<12;s++){const t=s/12;if(blocked(hero.x+dx*t,hero.y+dy*t,3)){clear=false;break}}if(!clear)continue;p.down=8;hit=true;particles.push({x:p.x,y:p.y,life:.6,text:'★'});raise(hero.weapon==='fire'?1.3:1);break;}
 if(hero.weapon==='fire')raise(hit?.45:.22);else if(!hit)note('Nessuno a portata di mano.',1.2);
 if(hero.weapon==='fire')particles.push({x:hero.x+Math.cos(hero.dir)*22,y:hero.y+Math.sin(hero.dir)*22,life:.3,text:'✦'});status();}
function rotateControl(key,down){if(down)held.add(key);else held.delete(key)}
let introVisible=false;function update(dt){worldTime+=dt;fireCooldown=Math.max(0,fireCooldown-dt);rideCooldown=Math.max(0,rideCooldown-dt);hero.invuln=Math.max(0,hero.invuln-dt);
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('ftaMessage')?.classList.remove('show')}
 const dx=Number(has('right'))-Number(has('left')),dy=Number(has('down'))-Number(has('up'));if(introVisible&&(dx||dy)){introVisible=false;toastTime=0;$('ftaMessage')?.classList.remove('show');}
 if(hero.car){const car=hero.car;const move=Math.hypot(dx,dy);if(move>0){const d=Math.atan2(dy,dx);let delta=Math.atan2(Math.sin(d-car.heading),Math.cos(d-car.heading));car.heading+=clamp(delta,-dt*2.7,dt*2.7);const speed=290*dt;const nx=car.x+Math.cos(car.heading)*speed,ny=car.y+Math.sin(car.heading)*speed;if(!blocked(nx,ny,23)){car.x=nx;car.y=ny;}else{hero.hp=clamp(hero.hp-8,0,100);raise(.18);note('Attenzione ai palazzi!');}car.speed=220;}else car.speed=0;hero.x=car.x;hero.y=car.y;hero.dir=car.heading;}
 else if(dx||dy){const mag=Math.hypot(dx,dy),vx=dx/mag*126*dt,vy=dy/mag*126*dt;[hero.x,hero.y]=walk(hero.x,hero.y,vx,vy,13);hero.dir=Math.atan2(dy,dx);hero.step+=dt*10;}
 for(const car of cars){if(car.occupied)continue;if(car.police){if(heat>0.2){const targetX=hero.x,targetY=hero.y;const a=Math.atan2(targetY-car.y,targetX-car.x);let diff=Math.atan2(Math.sin(a-car.heading),Math.cos(a-car.heading));car.heading+=clamp(diff,-dt*1.3,dt*1.3);const vx=Math.cos(car.heading)*car.speed*dt,vy=Math.sin(car.heading)*car.speed*dt;let [x,y]=walk(car.x,car.y,vx,vy,21);car.x=x;car.y=y;if(Math.hypot(car.x-hero.x,car.y-hero.y)<45&&hero.invuln<=0){hero.hp=Math.max(0,hero.hp-(hero.car?12:8));hero.invuln=1.5;note('🚨 La pattuglia ti ha raggiunto!');}}continue}
 const s=car.speed*car.dir*dt;const nx=car.x+(car.vertical?0:s),ny=car.y+(car.vertical?s:0);if(!blocked(nx,ny,23)){car.x=nx;car.y=ny}else car.dir*=-1;car.heading=car.vertical?(car.dir>0?Math.PI/2:-Math.PI/2):(car.dir>0?0:Math.PI);
 if(car.x<24)car.x=WORLD-25;if(car.x>WORLD-24)car.x=25;if(car.y<24)car.y=WORLD-25;if(car.y>WORLD-24)car.y=25;
 }
 for(const p of people){if(p.down>0){p.down-=dt;continue}const velocity=p.dir*p.speed*dt;const nx=p.x+(p.axis==='x'?velocity:0),ny=p.y+(p.axis==='y'?velocity:0);if(nx<20||nx>WORLD-20||ny<20||ny>WORLD-20||blocked(nx,ny,9)){p.dir*=-1}else{p.x=nx;p.y=ny};p.phase+=dt*5;
  if(hero.car&&Math.hypot(p.x-hero.x,p.y-hero.y)<22){p.down=7;raise(1.2);particles.push({x:p.x,y:p.y,life:.7,text:'!'});} }
 for(let i=particles.length-1;i>=0;i--){particles[i].life-=dt;if(particles[i].life<=0)particles.splice(i,1)}
 if(heat>0){heat=Math.max(0,heat-dt*.009);if(heat>.7){policeTick+=dt;if(policeTick>Math.max(2.2,7-heat*.85)){policeTick=0;const cap=2+Math.ceil(heat);const current=cars.filter(c=>c.police).length;if(current<cap){const z=carSpawn(800+current,true);z.x=clamp(hero.x+r(-450,450),40,WORLD-40);z.y=clamp(hero.y+r(-450,450),40,WORLD-40);z.speed=110+heat*20;cars.push(z)}}}else{for(let i=cars.length-1;i>=0;i--)if(cars[i].police)cars.splice(i,1)}}
 if(hero.hp<=0){hero.hp=100;heat=0;hero.car&&(hero.car.occupied=false);hero.car=null;hero.x=GRID*4;hero.y=GRID*4+GRID/2;hero.cash=Math.max(0,hero.cash-30);note('Rientro dalla centrale · cauzione €30',4)}
 miniTick+=dt;if(miniTick>.12){miniTick=0;status();$('ftaStreet').textContent=district();renderMini()}
}
function roundedRect(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fill()}
function drawStreet(){const minx=camX,maxx=camX+viewW/zoom,miny=camY,maxy=camY+viewH/zoom;
 c.fillStyle='#354653';c.fillRect(camX,camY,viewW/zoom,viewH/zoom);
 const startx=Math.max(0,Math.floor(minx/GRID)-1),endx=Math.min(BLOCKS,Math.ceil(maxx/GRID)+1),starty=Math.max(0,Math.floor(miny/GRID)-1),endy=Math.min(BLOCKS,Math.ceil(maxy/GRID)+1);
 for(let j=starty;j<=endy;j++)for(let i=startx;i<=endx;i++){
 const x=i*GRID,y=j*GRID;
 c.fillStyle='#344e59';c.fillRect(x-ROAD/2,y-ROAD/2,ROAD,ROAD);
 c.fillStyle='#53636d';c.fillRect(x-ROAD/2,y-ROAD/2,ROAD,ROAD);
 c.fillStyle='#425c66';c.fillRect(x-ROAD/2,y-ROAD/2,ROAD*1.05,ROAD*1.05);
 c.fillStyle='#adb5a8';c.fillRect(x-ROAD/2+12,y-ROAD/2+12,6,9);
 }
 c.fillStyle='#4d6065';for(let i=startx;i<=endx;i++){const x=i*GRID;c.fillRect(x-ROAD/2,Math.max(0,miny-ROAD),ROAD,Math.min(WORLD,maxy-miny+ROAD*2));}
 for(let j=starty;j<=endy;j++){const y=j*GRID;c.fillStyle='#4d6065';c.fillRect(Math.max(0,minx-ROAD),y-ROAD/2,Math.min(WORLD,maxx-minx+ROAD*2),ROAD)}
 c.save();c.strokeStyle='#c4cbb577';c.lineWidth=3;c.setLineDash([24,26]);for(let i=startx;i<=endx;i++){const x=i*GRID;c.beginPath();c.moveTo(x,miny-40);c.lineTo(x,maxy+40);c.stroke()}for(let j=starty;j<=endy;j++){const y=j*GRID;c.beginPath();c.moveTo(minx-40,y);c.lineTo(maxx+40,y);c.stroke()}c.restore();
}
function drawBuildings(){const x0=camX-60,y0=camY-60,x1=camX+viewW/zoom+60,y1=camY+viewH/zoom+60;
 for(const p of parks){if(p.x+p.w<x0||p.y+p.h<y0||p.x>x1||p.y>y1)continue;roundedRect(c,p.x,p.y,p.w,p.h,14,'#28705a');c.fillStyle='#65b58b';for(let i=0;i<12;i++){const x=p.x+16+(i*73)%Math.max(30,p.w-32),y=p.y+20+(i*93)%Math.max(30,p.h-40);c.beginPath();c.arc(x,y,9+i%3*2,0,TAU);c.fill()}c.fillStyle='#d7f4c5';c.font='bold 13px Montserrat, sans-serif';c.fillText(p.name,p.x+16,p.y+p.h-18)}
 for(const b of buildings){if(b.x+b.w<x0||b.y+b.h<y0||b.x>x1||b.y>y1)continue;roundedRect(c,b.x+8,b.y+13,b.w,b.h,7,'#111d2a77');roundedRect(c,b.x,b.y,b.w,b.h,6,b.col);roundedRect(c,b.x+7,b.y+7,b.w-14,b.h-14,4,b.roof);c.strokeStyle='#d2e4e555';c.lineWidth=2;c.strokeRect(b.x+14,b.y+15,b.w-28,b.h-30);c.fillStyle='#142b3ddc';c.font='bold 11px Montserrat, sans-serif';c.textAlign='center';c.fillText(b.lab,b.x+b.w/2,b.y+b.h/2+4);c.textAlign='left';}}
function drawCar(car){const x=car.x,y=car.y;c.save();c.translate(x,y);c.rotate(car.heading);const w=car.police?57:48,h=26;roundedRect(c,-w/2+3,-h/2+5,w,h,6,'#14233599');roundedRect(c,-w/2,-h/2,w,h,5,car.col);roundedRect(c,-5,-h/2+3,20,h-6,3,'#27455b');c.fillStyle=car.police?'#143da2':'#e5d5a1';c.fillRect(w/2-4,-h/2+3,3,6);c.fillRect(w/2-4,h/2-9,3,6);if(car.police){c.fillStyle='#e74754';c.fillRect(1,-5,7,5);c.fillStyle='#2d93f0';c.fillRect(1,2,7,5)}c.restore()}
function drawFinn(x,y,dir,t){c.save();c.translate(x,y);c.rotate(dir+Math.PI/2);c.fillStyle='#061b2e66';c.beginPath();c.ellipse(2,6,17,10,0,0,TAU);c.fill();roundedRect(c,-12,-17,24,34,9,'#09223e');roundedRect(c,-9,-14,18,28,7,'#70e5a8');c.fillStyle='#0c2b45';c.fillRect(-10,-9,20,5);c.fillStyle='#0c2b45';c.fillRect(-4,-3,3,4);c.fillRect(4,-3,3,4);c.strokeStyle='#0d2d3a';c.lineWidth=3;c.beginPath();c.moveTo(-5,5);c.quadraticCurveTo(0,9,5,5);c.stroke();c.restore()}
function drawPerson(p){if(p.down>0)return;c.fillStyle='#0f253a99';c.beginPath();c.ellipse(p.x+3,p.y+5,8,4,0,0,TAU);c.fill();c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,8,0,TAU);c.fill();c.fillStyle='#192d48';c.beginPath();c.arc(p.x,p.y-5,4,0,TAU);c.fill()}
function draw(){const dpr=Math.min(window.devicePixelRatio||1,2),rect=canvas.getBoundingClientRect();viewW=Math.max(200,rect.width);viewH=Math.max(160,rect.height);const actualW=Math.round(viewW*dpr),actualH=Math.round(viewH*dpr);if(canvas.width!==actualW||canvas.height!==actualH){canvas.width=actualW;canvas.height=actualH}
 zoom=clamp(Math.min(viewW/440,viewH/540),.49,1.3);camX=clamp(hero.x-viewW/(2*zoom),0,WORLD-viewW/zoom);camY=clamp(hero.y-viewH/(2*zoom),0,WORLD-viewH/zoom);
 c.setTransform(dpr*zoom,0,0,dpr*zoom,-camX*dpr*zoom,-camY*dpr*zoom);drawStreet();drawBuildings();
 const near=(o,pad=90)=>o.x>camX-pad&&o.x<camX+viewW/zoom+pad&&o.y>camY-pad&&o.y<camY+viewH/zoom+pad;
 for(const car of cars)if(near(car))drawCar(car);
 for(const p of people)if(near(p))drawPerson(p);
 for(const l of landmarks)if(near(l,260)){c.fillStyle=l.color;c.font='900 19px Montserrat, sans-serif';c.textAlign='center';c.fillText(l.t,l.x,l.y-80);c.textAlign='left'}
 if(!hero.car)drawFinn(hero.x,hero.y,hero.dir,worldTime);else {c.save();c.translate(hero.x,hero.y);c.fillStyle='#e8ffe5';c.font='bold 12px Montserrat, sans-serif';c.fillText('FINN',-17,-26);c.restore()}
 for(const p of particles){c.fillStyle='#ffde7e';c.font='bold 30px sans-serif';c.fillText(p.text,p.x,p.y-20+(1-p.life)*30)}
 c.setTransform(1,0,0,1,0,0)}
function renderMini(){const w=112,h=112;mini.width=w*2;mini.height=h*2;mc.setTransform(2,0,0,2,0,0);mc.fillStyle='#0d3449';mc.fillRect(0,0,w,h);const s=w/WORLD;
 mc.strokeStyle='#7490a4';mc.lineWidth=2;for(let i=0;i<BLOCKS;i++){let k=i*GRID*s;mc.beginPath();mc.moveTo(k,0);mc.lineTo(k,h);mc.stroke();mc.beginPath();mc.moveTo(0,k);mc.lineTo(w,k);mc.stroke()}
 mc.fillStyle='#3c9c74';for(const p of parks)mc.fillRect(p.x*s,p.y*s,p.w*s,p.h*s);
 mc.fillStyle='#ef7e65';for(const car of cars)if(car.police)mc.fillRect(car.x*s-1.2,car.y*s-1.2,3,3);
 mc.fillStyle='#77fdb5';mc.beginPath();mc.arc(hero.x*s,hero.y*s,4,0,TAU);mc.fill();mc.strokeStyle='#fff';mc.lineWidth=1.5;mc.stroke();}
function loop(now){if(!active)return;const dt=last?Math.min(.046,(now-last)/1000):0;last=now;try{update(dt)}catch(err){console.error('[Finn City] update',err)}try{draw()}catch(err){console.error('[Finn City] draw',err);drawFallback()}raf=requestAnimationFrame(loop)}
function drawFallback(){const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(240,canvas.clientWidth),h=Math.max(240,canvas.clientHeight);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#345364';c.fillRect(0,0,w,h);c.strokeStyle='#7f99a2';c.lineWidth=34;for(let x=-w;x<w*2;x+=105){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=35;y<h;y+=125){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}c.fillStyle='#79e6a6';c.beginPath();c.arc(w/2,h/2,13,0,TAU);c.fill();c.fillStyle='#fff';c.font='bold 13px system-ui';c.fillText('FINN',w/2-16,h/2-20)}
function open(){if(active)return;$('finnGamePicker')?.classList.remove('is-open');saveOverflow=document.body.style.overflow;document.body.style.overflow='hidden';root.classList.add('fta-open');root.setAttribute('aria-hidden','false');active=true;last=0;held.clear();note('Benvenuto a Finn City! Esplora liberamente Piazza Affari.',4);introVisible=true;status();renderMini();try{draw()}catch(err){console.error('[Finn City] first draw',err);drawFallback()}raf=requestAnimationFrame(loop)}
function close(){if(!active)return;active=false;cancelAnimationFrame(raf);raf=0;root.classList.remove('fta-open');root.setAttribute('aria-hidden','true');document.body.style.overflow=saveOverflow;held.clear()}
function setHeldButton(b,dir){const down=e=>{if(!active)return;e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}rotateControl(dir,true);b.classList.add('fta-held')};const up=e=>{e.preventDefault();rotateControl(dir,false);b.classList.remove('fta-held')};b.addEventListener('pointerdown',down);for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,up)}
root.querySelectorAll('[data-fta-dir]').forEach(b=>setHeldButton(b,b.dataset.ftaDir));
$('ftaExit')?.addEventListener('click',close);$('ftaInteract')?.addEventListener('click',toggleRide);$('ftaAttack')?.addEventListener('click',attack);$('ftaWeapon')?.addEventListener('click',()=>{hero.weapon=hero.weapon==='fire'?'melee':'fire';status();note(hero.weapon==='fire'?'Arma a distanza selezionata.':'Corpo a corpo selezionato.',1.5)});
$('fgpTheftAuto')?.addEventListener('click',open);
const keyDir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right',W:'up',S:'down',A:'left',D:'right'};
window.addEventListener('keydown',e=>{if(!active)return;if(keyDir[e.key]){e.preventDefault();rotateControl(keyDir[e.key],true)}else if(e.key==='e'||e.key==='E'){e.preventDefault();if(!e.repeat)toggleRide()}else if(e.key==='f'||e.key==='F'){e.preventDefault();if(!e.repeat)attack()}else if(e.key==='q'||e.key==='Q'){e.preventDefault();if(!e.repeat)$('ftaWeapon')?.click()}else if(e.key==='Escape')close()});
window.addEventListener('keyup',e=>{if(!active)return;if(keyDir[e.key]){e.preventDefault();rotateControl(keyDir[e.key],false)}});
window.addEventListener('resize',()=>{if(active){try{draw();renderMini()}catch(err){console.error('[Finn City] resize',err)}}});window.addEventListener('blur',()=>held.clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)held.clear()});
window.FinnTheftAuto={open,close,getState:()=>({active,hero:{x:hero.x,y:hero.y,hp:hero.hp,inCar:!!hero.car},vehicles:cars.length,people:people.length,wanted:Math.ceil(heat-.01),world:WORLD})};
})();

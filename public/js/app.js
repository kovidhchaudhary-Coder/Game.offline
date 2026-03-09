const DT = 1 / 60;
const GRAVITY = 9.80665;
const AIR_DENSITY = 1.225;
const ROLLING_RESISTANCE = 0.015;
const DRIVETRAIN_EFFICIENCY = 0.9;
const FINAL_DRIVE = 3.9;
const WHEEL_RADIUS_M = 0.3;
const BRAKE_FORCE = 1800;
const MAX_FLAP_ANGLE = (15 * Math.PI) / 180;
const WORLD_WRAP = 10000;

const FLEET = Object.freeze({
  nano: Object.freeze({ name: 'Tata Nano', type: 'ground', hp: 37, mass: 600, cd: 0.39, gears: [3.5, 2.0, 1.4, 1.0, 0.8], fuel: 1.1 }),
  swift: Object.freeze({ name: 'Maruti Swift', type: 'ground', hp: 88, mass: 900, cd: 0.32, gears: [3.4, 1.9, 1.3, 0.9, 0.7], fuel: 1.0 }),
  lamborghini: Object.freeze({ name: 'Lamborghini', type: 'ground', hp: 1001, mass: 1772, cd: 0.24, gears: [3.1, 2.1, 1.6, 1.2, 0.9], fuel: 2.4 }),
  rolls: Object.freeze({ name: 'Rolls Royce', type: 'ground', hp: 563, mass: 2560, cd: 0.33, gears: [4.7, 3.1, 2.1, 1.6, 1.2], fuel: 1.9 }),
  plane: Object.freeze({ name: 'Strike Plane', type: 'plane', hp: 720, mass: 2100, cd: 0.22, gears: [2.8, 1.9, 1.4, 1.1, 0.9], aeroArea: 18, clBase: 0.6, cdBase: 0.09, stallSpeed: 38, fuel: 3.1 }),
  helicopter: Object.freeze({ name: 'Helicopter', type: 'heli', hp: 610, mass: 3200, cd: 0.6, gears: [3.4, 2.4, 1.8, 1.3, 1.0], aeroArea: 12, clBase: 1.1, cdBase: 0.7, fuel: 3.5 })
});

class Powertrain {
  constructor(hp, gearRatios, finalDrive) { this.hp=hp; this.gearRatios=gearRatios; this.finalDrive=finalDrive; this.currentGear=0; this.rpm=800; this.maxRpm=7000; }
  calculateTorque() { const rpm=Math.max(this.rpm,1000); const efficiency=Math.max(0.35,1-Math.abs(this.rpm-4500)/6000); return ((this.hp*5252)/rpm)*efficiency; }
  getWheelTorque() { return this.calculateTorque()*this.gearRatios[this.currentGear]*this.finalDrive*DRIVETRAIN_EFFICIENCY; }
  updateRpm(speed) { const wheelRps=speed/(2*Math.PI*WHEEL_RADIUS_M); const driveline=wheelRps*60*this.gearRatios[this.currentGear]*this.finalDrive; this.rpm=Math.min(this.maxRpm,Math.max(800,driveline)); }
  shiftUp(){this.currentGear=Math.min(this.currentGear+1,this.gearRatios.length-1)}
  shiftDown(){this.currentGear=Math.max(this.currentGear-1,0)}
}

class Aerofoil { constructor(area,clBase,cdBase){this.area=area;this.clBase=clBase;this.cdBase=cdBase;} getAero(v,flap){ const cl=this.clBase*(1+Math.sin(flap)*0.5); const cd=this.cdBase*(1+Math.abs(Math.sin(flap))); const q=0.5*AIR_DENSITY*v*v; return {lift:q*this.area*cl,drag:q*this.area*cd}; } }

class Vehicle {
  constructor(config){
    this.config=config; this.mass=config.mass; this.cd=config.cd; this.powertrain=new Powertrain(config.hp,config.gears,FINAL_DRIVE); this.aero=new Aerofoil(config.aeroArea||2.2,config.clBase||0.05,config.cdBase||config.cd);
    this.position={x:0,y:0,z:0}; this.velocity={x:0,y:0,z:0}; this.accel={x:0,y:0,z:0};
    this.angle=0; this.pitch=0; this.roll=0; this.angularVelocity=0; this.yawVelocity=0; this.verticalThrust=0; this.flapAngle=0; this.gForce=0;
    this.health=100; this.cargo=['Textiles','Chemicals','Diamonds'][Math.floor(Math.random()*3)]; this.profit=0;
    this.wheels=[{id:'FL',x:-1,isPowered:true,isBraking:false},{id:'FR',x:1,isPowered:true,isBraking:false},{id:'RL',x:-1,isPowered:false,isBraking:false},{id:'RR',x:1,isPowered:false,isBraking:false}];
  }
  isAir(){ return this.config.type==='plane' || this.config.type==='heli'; }
  applyDamage(amount){ this.health=Math.max(0,this.health-amount); }
  applyAirBrake(dt){ this.velocity.x*=1-1.1*dt; this.velocity.y*=1-1.1*dt; this.velocity.z*=1-1.1*dt; }
  update(dt,input,difficulty){
    const speed=Math.hypot(this.velocity.x,this.velocity.y,this.velocity.z); this.powertrain.updateRpm(speed);
    let fx=0,fy=0,fz=-this.mass*GRAVITY,yawT=0;
    if(this.config.type==='ground'){
      const powered=this.wheels.filter(w=>w.isPowered).length||1; const drive=input.throttle*(this.powertrain.getWheelTorque()/WHEEL_RADIUS_M)/powered;
      for(const w of this.wheels){ let f=0; if(w.isPowered)f+=drive; if(w.isBraking)f-=input.braking; fx+=f*Math.cos(this.angle); fy+=f*Math.sin(this.angle); yawT+=f*w.x; }
      const bump=Math.sin(this.position.x*0.01*difficulty)*0.4 + Math.sin(this.position.y*0.008*difficulty)*0.3;
      if(this.position.z<=bump){ if(this.velocity.z<0) this.applyDamage(Math.abs(this.velocity.z)*2); this.position.z=bump; this.velocity.z=Math.max(0,this.velocity.z*0.1); fz+=22000*(bump-this.position.z)-1900*this.velocity.z; }
    }
    if(this.config.type==='heli'){
      this.verticalThrust=Math.max(-16000,Math.min(22000,this.verticalThrust+input.collectiveCmd*1000*dt));
      this.yawVelocity += input.yawCmd*0.05;
      const mainT=this.powertrain.calculateTorque(); const tailT=mainT*0.1; this.yawVelocity += (mainT-tailT)*0.0006;
      const thrust=this.config.hp*18+this.verticalThrust; const vert=thrust*Math.cos(this.roll)*Math.cos(this.pitch); const horiz=thrust*Math.sin(Math.abs(this.roll)+Math.abs(this.pitch));
      fz+=vert; fx+=horiz*Math.cos(this.angle+this.roll); fy+=horiz*Math.sin(this.angle+this.pitch);
      this.roll+=input.rollCmd*dt*1.4; this.pitch+=input.pitchCmd*dt*1.4; this.roll*=0.98; this.pitch*=0.98;
      this.angularVelocity=this.yawVelocity*0.98;
    }
    if(this.config.type==='plane'){
      this.pitch+=input.pitchCmd*0.02; this.roll+=input.rollCmd*0.03; this.pitch=Math.max(-0.55,Math.min(0.55,this.pitch)); this.roll=Math.max(-0.8,Math.min(0.8,this.roll));
      const thrust=this.config.hp*Math.max(0.2,input.throttle)*8.5;
      fx+=Math.cos(this.angle)*Math.cos(this.pitch)*thrust; fy+=Math.sin(this.angle)*Math.cos(this.pitch)*thrust; fz+=Math.sin(this.pitch)*thrust;
      const aero=this.aero.getAero(Math.max(speed,1),this.flapAngle); if(speed>=this.config.stallSpeed) fz+=aero.lift; if(speed>0.001){fx-=(aero.drag*this.velocity.x)/speed; fy-=(aero.drag*this.velocity.y)/speed;}
      this.angularVelocity += input.rollCmd*dt*0.8;
    }
    const drag=0.5*AIR_DENSITY*this.cd*2.2*speed*speed + this.mass*GRAVITY*ROLLING_RESISTANCE;
    if(speed>0.001){ fx-=(drag*this.velocity.x)/speed; fy-=(drag*this.velocity.y)/speed; fz-=(drag*0.7*this.velocity.z)/speed; }

    this.angularVelocity += (yawT/(this.mass*2))*dt; this.angularVelocity*=0.995; this.angle+=this.angularVelocity*dt;
    this.accel.x=fx/this.mass; this.accel.y=fy/this.mass; this.accel.z=fz/this.mass;
    this.velocity.x+=this.accel.x*dt; this.velocity.y+=this.accel.y*dt; this.velocity.z+=this.accel.z*dt;
    this.position.x=(this.position.x+this.velocity.x*dt+WORLD_WRAP)%WORLD_WRAP;
    this.position.y=(this.position.y+this.velocity.y*dt+WORLD_WRAP)%WORLD_WRAP;
    this.position.z=Math.max(0,this.position.z+this.velocity.z*dt);
    this.gForce=Math.hypot(this.accel.x,this.accel.y,this.accel.z)/GRAVITY;

    const fuelBurn=(Math.abs(this.powertrain.rpm)/7000)*this.config.fuel*dt; this.profit += Math.max(0, 0.7 - fuelBurn) * (this.health/100);
  }
}

class Camera3D {
  constructor(){ this.distance=350; this.yaw=0; this.pitch=0.2; this.targetYaw=0; this.targetPitch=0.2; this.lookTimer=0; this.fov=75; this.shake=0; }
  update(vehicle,mouse){
    if(Math.abs(mouse.dx)>0.1||Math.abs(mouse.dy)>0.1){ this.targetYaw+=mouse.dx*0.005; this.targetPitch=Math.max(-0.5,Math.min(0.5,this.targetPitch-mouse.dy*0.005)); this.lookTimer=60; }
    if(this.lookTimer>0) this.lookTimer--; else {
      const resetSpeed=0.05; const defaultYaw=vehicle.config.type==='heli'?vehicle.angle+Math.PI/2:vehicle.angle+Math.PI; const defaultPitch=vehicle.config.type==='ground'?0.3:0;
      this.targetYaw += (defaultYaw-this.targetYaw)*resetSpeed; this.targetPitch += (defaultPitch-this.targetPitch)*resetSpeed;
    }
    this.yaw += (this.targetYaw-this.yaw)*0.1; this.pitch += (this.targetPitch-this.pitch)*0.1;
    const speedKmh=Math.hypot(vehicle.velocity.x,vehicle.velocity.y,vehicle.velocity.z)*3.6;
    this.shake=((vehicle.config.name==='Lamborghini'&&speedKmh>250)||(vehicle.config.type==='plane'&&speedKmh>1235))?1:0;
  }
}

function seedRand(seed){ let x=seed|0; return ()=>{ x ^= x<<13; x ^= x>>17; x ^= x<<5; return ((x>>>0)%10000)/10000; }; }
function generateCity(seed=18452073){ const rand=seedRand(seed); const size=40; const cell=25; const blocks=[]; const grid=[]; for(let y=0;y<size;y++){grid[y]=[];for(let x=0;x<size;x++){ const road=(x%5===0||y%5===0); const h=road?0:20+Math.floor(rand()*180); grid[y][x]=h; if(h>0) blocks.push({x:x*cell,y:y*cell,w:cell,h:cell,height:h}); }} return {size,cell,grid,blocks}; }

function aStarPath(start,end,grid){
  const h=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  const key=(n)=>`${n.x},${n.y}`;
  const open=[start]; const came=new Map(); const g=new Map([[key(start),0]]); const f=new Map([[key(start),h(start,end)]]);
  while(open.length){ open.sort((a,b)=>(f.get(key(a))??1e9)-(f.get(key(b))??1e9)); const cur=open.shift(); if(cur.x===end.x&&cur.y===end.y){ const out=[cur]; let k=key(cur); while(came.has(k)){ const p=came.get(k); out.push(p); k=key(p);} return out.reverse(); }
    for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=cur.x+d[0], ny=cur.y+d[1]; if(ny<0||nx<0||ny>=grid.length||nx>=grid[0].length) continue; if(grid[ny][nx]>0) continue; const n={x:nx,y:ny}; const nk=key(n); const tg=(g.get(key(cur))??1e9)+1; if(tg<(g.get(nk)??1e9)){ came.set(nk,cur); g.set(nk,tg); f.set(nk,tg+h(n,end)); if(!open.find(o=>o.x===nx&&o.y===ny)) open.push(n);} }
  }
  return [];
}

const select=document.getElementById('vehicle-select');
const stats=document.getElementById('fleet-stats');
const chassis=document.getElementById('chassis-grid');
const rpmEl=document.getElementById('rpm-readout');
const gEl=document.getElementById('g-readout');
const pathEl=document.getElementById('path-status');
const saveStatus=document.getElementById('save-status');
const canvas=document.getElementById('world-canvas');
const ctx=canvas.getContext('2d');
const mapCanvas=document.getElementById('city-map');
const mapCtx=mapCanvas.getContext('2d');
const sonic=document.getElementById('sonic-wave');
const difficultyEl=document.getElementById('difficulty-status');

for(let i=0;i<24;i++){ const b=document.createElement('span'); b.style.height='8px'; sonic.appendChild(b); }
Object.entries(FLEET).forEach(([id,v])=>{ const o=document.createElement('option'); o.value=id; o.textContent=v.name; select.appendChild(o); });

let vehicle=new Vehicle(FLEET.nano);
let camera=new Camera3D();
const mouse={dx:0,dy:0};
const keys={};
const input={throttle:1,braking:0,pitchCmd:0,rollCmd:0,yawCmd:0,collectiveCmd:0};
const city=generateCity();
let aPath=[];
let phase=1;

function project3D(x,y,z,cam){
  const relX=x-cam.x, relY=y-cam.y, relZ=z-cam.z;
  const cosY=Math.cos(cam.yaw), sinY=Math.sin(cam.yaw); const cosP=Math.cos(cam.pitch), sinP=Math.sin(cam.pitch);
  const rX=relX*cosY-relY*sinY; const rY=relX*sinY+relY*cosY; const rZ=rY*sinP+relZ*cosP; const depth=rY*cosP-relZ*sinP;
  if(depth<=1) return null; const focal=(canvas.width*0.5)/Math.tan((cam.fov*Math.PI)/360); const s=focal/depth;
  return {x:canvas.width/2+rX*s,y:canvas.height/2-rZ*s,depth};
}
function drawLine3D(a,b,cam,color){ const p1=project3D(a.x,a.y,a.z,cam), p2=project3D(b.x,b.y,b.z,cam); if(!p1||!p2)return; ctx.strokeStyle=color; ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke(); }
function drawBox3D(b,cam,color='rgba(120,255,150,.22)'){ const x=b.x,y=b.y,z=0,w=b.w,d=b.h,h=b.height; const p=[{x,y,z},{x:x+w,y,z},{x:x+w,y:y+d,z},{x,y:y+d,z},{x,y,z:h},{x:x+w,y,z:h},{x:x+w,y:y+d,z:h},{x,y:y+d,z:h}]; [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([i,j])=>drawLine3D(p[i],p[j],cam,color)); }

function drawInfiniteSky(cam){ const gs=1000; const sx=Math.floor(vehicle.position.x/gs)*gs; const sy=Math.floor(vehicle.position.y/gs)*gs; for(let i=-5;i<5;i++)for(let j=-5;j<5;j++) drawBox3D({x:sx+i*gs,y:sy+j*gs,w:140,h:140,height:40,},cam,'rgba(120,180,255,.12)'); }
function drawGroundGrid(cam){ const gs=200; const ox=Math.floor(vehicle.position.x/gs)*gs; const oy=Math.floor(vehicle.position.y/gs)*gs; for(let i=-30;i<=30;i++){ drawLine3D({x:ox-6000,y:oy+i*gs,z:0},{x:ox+6000,y:oy+i*gs,z:0},cam,'rgba(0,255,65,.13)'); drawLine3D({x:ox+i*gs,y:oy-6000,z:0},{x:ox+i*gs,y:oy+6000,z:0},cam,'rgba(0,255,65,.13)'); }}

function drawCity(cam){ for(const b of city.blocks) drawBox3D(b,cam); }

function drawVehicle(cam){ const p=vehicle.position; const corners=[{x:p.x-60,y:p.y-30,z:p.z+10},{x:p.x+60,y:p.y-30,z:p.z+10},{x:p.x+60,y:p.y+30,z:p.z+10},{x:p.x-60,y:p.y+30,z:p.z+10}]; const roof=corners.map(v=>({...v,z:v.z+30})); [[0,1],[1,2],[2,3],[3,0]].forEach(([i,j])=>drawLine3D(corners[i],corners[j],cam,'#00ff41')); [[0,1],[1,2],[2,3],[3,0]].forEach(([i,j])=>drawLine3D(roof[i],roof[j],cam,'#00ff41')); [[0,1],[1,2],[2,3],[3,0]].forEach(([i])=>drawLine3D(corners[i],roof[i],cam,'#00ff41')); if(vehicle.config.type==='plane') drawLine3D({x:p.x-110,y:p.y,z:p.z+18},{x:p.x+110,y:p.y,z:p.z+18},cam,'#64ff87'); if(vehicle.config.type==='heli') drawLine3D({x:p.x-120,y:p.y,z:p.z+70},{x:p.x+120,y:p.y,z:p.z+70},cam,'#80ff9a'); }

function drawAStarPath(cam){ if(!aPath.length) return; for(let i=0;i<aPath.length-1;i++){ const a=aPath[i],b=aPath[i+1]; drawLine3D({x:a.x*city.cell+city.cell/2,y:a.y*city.cell+city.cell/2,z:1},{x:b.x*city.cell+city.cell/2,y:b.y*city.cell+city.cell/2,z:1},cam,'#00ff41'); } }

function cameraState(){ const jitter=camera.shake?(Math.random()-0.5)*1.2:0; return {x:vehicle.position.x-Math.cos(camera.yaw)*camera.distance,y:vehicle.position.y-Math.sin(camera.yaw)*camera.distance,z:vehicle.position.z+160+jitter,yaw:camera.yaw,pitch:camera.pitch,fov:camera.fov}; }

function drawMap(){ mapCtx.fillStyle='#061106'; mapCtx.fillRect(0,0,mapCanvas.width,mapCanvas.height); const sx=mapCanvas.width/city.size, sy=mapCanvas.height/city.size; for(let y=0;y<city.size;y++)for(let x=0;x<city.size;x++){ const h=city.grid[y][x]; mapCtx.fillStyle=h>0?`rgba(0,255,65,${0.15+Math.min(0.75,h/220)})`:'rgba(0,40,0,.8)'; mapCtx.fillRect(x*sx,y*sy,sx,sy); }
  if(aPath.length){ mapCtx.strokeStyle='#00ff41'; mapCtx.lineWidth=2; mapCtx.beginPath(); aPath.forEach((n,i)=>{ const px=(n.x+0.5)*sx, py=(n.y+0.5)*sy; if(i===0) mapCtx.moveTo(px,py); else mapCtx.lineTo(px,py);}); mapCtx.stroke(); }
}

function updateSonic(speed){ const bars=[...sonic.children]; const base=(vehicle.powertrain.rpm/7000)*0.7 + Math.min(0.6,speed/280); bars.forEach((b,i)=>{ const wave=Math.abs(Math.sin(performance.now()*0.008+i*0.6)); b.style.height=`${8+wave*44*base}px`; }); }

function updateInput(){
  input.braking=vehicle.wheels.some(w=>w.isBraking)?BRAKE_FORCE:0; input.pitchCmd=0; input.rollCmd=0; input.yawCmd=0; input.collectiveCmd=0;
  if(vehicle.config.type==='heli'){ if(keys.ArrowUp) input.collectiveCmd+=1; if(keys.ArrowDown) input.collectiveCmd-=1; if(keys.ArrowLeft) input.yawCmd-=1; if(keys.ArrowRight) input.yawCmd+=1; input.rollCmd=(keys.d?1:0)-(keys.a?1:0); input.pitchCmd=(keys.w?1:0)-(keys.s?1:0); }
  if(vehicle.config.type==='plane'){ if(keys.ArrowUp) input.pitchCmd-=1; if(keys.ArrowDown) input.pitchCmd+=1; if(keys.ArrowLeft) input.rollCmd-=1; if(keys.ArrowRight) input.rollCmd+=1; vehicle.flapAngle += ((keys.w?1:0)-(keys.s?1:0))*0.015; vehicle.flapAngle=Math.max(-MAX_FLAP_ANGLE,Math.min(MAX_FLAP_ANGLE,vehicle.flapAngle)); }
  if(keys.Space||keys.Shift) vehicle.applyAirBrake(DT);
}

function runRollsAutopilot(){
  if(vehicle.config.name!=='Rolls Royce' || !aPath.length) return;
  const target=aPath[0];
  const tx=target.x*city.cell+city.cell/2, ty=target.y*city.cell+city.cell/2;
  const dx=tx-vehicle.position.x, dy=ty-vehicle.position.y; const dist=Math.hypot(dx,dy);
  const desired=Math.atan2(dy,dx); const err=((desired-vehicle.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
  input.rollCmd=Math.max(-1,Math.min(1,err*2)); input.throttle=0.95;
  if(dist<20) aPath.shift();
}

function cityCollision(){
  const px=vehicle.position.x, py=vehicle.position.y, pz=vehicle.position.z;
  for(const b of city.blocks){ if(px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h&&pz<b.height){ vehicle.applyDamage(10); vehicle.velocity.x*=-0.25; vehicle.velocity.y*=-0.25; return true; } }
  return false;
}

function frame(now){
  if(!frame.last) frame.last=now; const dt=Math.min((now-frame.last)/1000,0.25); frame.last=now; accumulator+=dt;
  updateInput(); runRollsAutopilot();
  camera.update(vehicle,mouse,DT); mouse.dx=0; mouse.dy=0;
  camera.fov += ((input.throttle>0.95?90:75)-camera.fov)*0.08;
  while(accumulator>=DT){ vehicle.update(DT,input,phase); accumulator-=DT; }

  const hit=cityCollision();
  document.body.classList.toggle('glitch', hit || vehicle.gForce>2.8);
  if(hit){ pathEl.textContent='EXPLOSION_FX: Building impact detected'; }

  if(vehicle.position.x>WORLD_WRAP-5){ phase++; difficultyEl.textContent=String(phase); }

  const cam=cameraState();
  ctx.fillStyle='#091109'; ctx.fillRect(0,0,canvas.width,canvas.height);
  drawInfiniteSky(cam); drawGroundGrid(cam); drawCity(cam); drawAStarPath(cam); drawVehicle(cam);

  const speed=Math.hypot(vehicle.velocity.x,vehicle.velocity.y,vehicle.velocity.z); updateSonic(speed);
  rpmEl.textContent=`${Math.round(vehicle.powertrain.rpm)} RPM | G${vehicle.powertrain.currentGear+1} | FOV ${camera.fov.toFixed(0)}`;
  gEl.textContent=`${vehicle.gForce.toFixed(2)} g | HP ${vehicle.health.toFixed(0)}`;

  document.getElementById('warn-redline').classList.toggle('active', vehicle.powertrain.rpm>vehicle.powertrain.maxRpm*0.95);
  document.getElementById('warn-stall').classList.toggle('active', vehicle.config.type==='plane' && speed < (vehicle.config.stallSpeed||35));
  document.getElementById('warn-abs').classList.toggle('active', input.braking>0 || keys.Space || keys.Shift);

  if(!hit){ pathEl.textContent=`A*: ${aPath.length?`${aPath.length} nodes`:'standby'}\nCamera: ${vehicle.config.type==='ground'?'1s-lag Chase':vehicle.config.type==='heli'?'Parallel':'Tail'}\nV: ${speed.toFixed(2)} m/s  Alt: ${vehicle.position.z.toFixed(2)} m\nCargo: ${vehicle.cargo} | Profit ₹${vehicle.profit.toFixed(1)} | Health ${vehicle.health.toFixed(0)}%\nWorldPhase: ${phase}`; }
  drawMap();
  requestAnimationFrame(frame);
}

function renderWheels(){ chassis.innerHTML=''; vehicle.wheels.forEach((w,idx)=>{ const b=document.createElement('button'); b.className=`wheel ${w.isPowered?'power':''} ${w.isBraking?'brake':''}`; b.textContent=`${w.id}\n${w.isPowered?'PWR':w.isBraking?'BRK':'IDLE'}`; b.onclick=()=>{ if(!w.isPowered&&!w.isBraking)w.isPowered=true; else if(w.isPowered){w.isPowered=false;w.isBraking=true;} else w.isBraking=false; renderWheels(); pathEl.textContent=`Wheel ${idx+1} -> ${w.isPowered?'POWER':w.isBraking?'BRAKE':'IDLE'}`; }; chassis.appendChild(b);}); }
function updateStats(){ const v=vehicle.config; stats.textContent=`Type ${v.type.toUpperCase()} | HP ${v.hp} | Mass ${v.mass}kg\nCd ${v.cd} | Gears: ${v.gears.join(', ')}\nFuelRate ${v.fuel.toFixed(2)} | FinalDrive ${FINAL_DRIVE}`; }

mapCanvas.addEventListener('click',(e)=>{
  if(vehicle.config.name!=='Rolls Royce') return;
  const r=mapCanvas.getBoundingClientRect(); const gx=Math.floor((e.clientX-r.left)/r.width*city.size); const gy=Math.floor((e.clientY-r.top)/r.height*city.size);
  const sx=Math.floor(vehicle.position.x/city.cell), sy=Math.floor(vehicle.position.y/city.cell);
  aPath=aStarPath({x:sx,y:sy},{x:gx,y:gy},city.grid);
});

select.onchange=()=>{ vehicle=new Vehicle(FLEET[select.value]); camera=new Camera3D(); aPath=[]; updateStats(); renderWheels(); };
document.getElementById('shift-up').onclick=()=>vehicle.powertrain.shiftUp();
document.getElementById('shift-down').onclick=()=>vehicle.powertrain.shiftDown();

document.addEventListener('keydown',(e)=>{ keys[e.key]=true; keys[e.key.toLowerCase()]=true; if(e.key.toLowerCase()==='t') input.throttle=Math.min(1.2,input.throttle+0.05); if(e.key.toLowerCase()==='g') input.throttle=Math.max(0.2,input.throttle-0.05); });
document.addEventListener('keyup',(e)=>{ keys[e.key]=false; keys[e.key.toLowerCase()]=false; });
canvas.addEventListener('mousemove',(e)=>{ mouse.dx+=e.movementX||0; mouse.dy+=e.movementY||0; });

document.getElementById('save-btn').onclick=async()=>{ saveStatus.textContent='Saving...'; try{ const res=await fetch('/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(vehicle)}); const j=await res.json(); saveStatus.textContent=j.ok?`Saved to ${j.saved_to}`:j.error;}catch{saveStatus.textContent='Save failed';} };

updateStats(); renderWheels(); drawMap(); requestAnimationFrame(frame);

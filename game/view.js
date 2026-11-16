import * as T from 'three';
import {walls,sites} from './map.js';
const cream=0xd9c9aa,ink=0x243b40,copper=0xb16c45,teal=0x247f82;
export class View{
 constructor(canvas){
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
  this.scene=new T.Scene();this.scene.background=new T.Color(0x95c4cc);this.scene.fog=new T.Fog(0x9abfc1,36,105);
  this.camera=new T.PerspectiveCamera(76,1,.05,180);this.camera.rotation.order='YXZ';this.scene.add(this.camera);
  this.boxGeo=new T.BoxGeometry(1,1,1);this.mats=new Map();this.bots=[];this.effects=[];this.temp=new T.Vector3();
  const hemi=new T.HemisphereLight(0xc2e9ff,0x8c6842,2.5);this.scene.add(hemi);
  const sun=new T.DirectionalLight(0xffdfb0,3.3);sun.position.set(-25,37,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-29;sun.shadow.camera.right=29;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;sun.shadow.camera.far=100;sun.shadow.bias=-.0005;sun.shadow.normalBias=.025;this.scene.add(sun);
  this.buildMap();this.batchArchitecture();this.buildWeapon();for(let i=1;i<6;i++)this.bots[i]=this.buildBot(i<3);
  this.charge=this.box(0,.25,-14,.65,.4,.5,0x253c3e);this.lamp=this.box(0,.49,-14,.15,.06,.15,0xe8c77b);this.lamp.material=new T.MeshBasicMaterial({color:0xffcb62});
  this.grenadeMeshes=[];
  this.resize();addEventListener('resize',()=>this.resize());
 }
 mat(color,metal=0){const key=color+':'+metal;if(!this.mats.has(key))this.mats.set(key,new T.MeshStandardMaterial({color,roughness:metal?.4:.84,metalness:metal}));return this.mats.get(key);}
 box(x,y,z,w,h,d,color,parent=this.scene,metal=0){const m=new T.Mesh(this.boxGeo,this.mat(color,metal));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 cylinder(x,y,z,r,h,color,parent=this.scene){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,16),this.mat(color,.35));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 sign(text,x,y,z,w=4,h=1.2,rot=0,sub='FLOOD CONTROL AUTHORITY'){
  const c=document.createElement('canvas');c.width=1024;c.height=256;const q=c.getContext('2d');q.fillStyle='#213c40';q.fillRect(0,0,1024,256);q.fillStyle='#e8d9b6';q.fillRect(20,18,12,220);q.font='bold 89px Arial';q.fillText(text,60,130);q.fillStyle='#8eac9d';q.font='25px monospace';q.fillText(sub,65,200);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:texture,roughness:.8}));m.position.set(x,y,z);m.rotation.y=rot;this.scene.add(m);
 }
 buildMap(){
  // A procedural clear coastal sky, with high-altitude cloud strips.
  const sunDisc=new T.Mesh(new T.SphereGeometry(3,20,16),new T.MeshBasicMaterial({color:0xffe8bc,fog:false}));sunDisc.position.set(-55,65,-70);this.scene.add(sunDisc);
  const cloudMat=new T.MeshBasicMaterial({color:0xe0e5d5,transparent:true,opacity:.48,depthWrite:false});
  for(let i=0;i<8;i++){const cloud=new T.Mesh(new T.SphereGeometry(1,12,8),cloudMat);cloud.position.set(-75+i*23,36+(i%3)*5,-80);cloud.scale.set(13+(i%3)*3,1.2,3);this.scene.add(cloud);}
  this.box(0,-.28,0,35,.5,45,cream);
  // Coastal horizon, tidal channels, and distant breakwater silhouettes.
  this.water=this.box(0,-1.1,0,230,.1,210,teal);this.water.material=new T.MeshStandardMaterial({color:0x278f93,roughness:.26,metalness:.55});
  for(let i=0;i<65;i++){const z=-90+i*3.1;this.box(-45,-1.02,z,25,.015,.08,0x67b0ac);this.box(43,-1.02,z+1,22,.015,.06,0x67b0ac);}
  for(let i=0;i<12;i++){this.box(-48+i*9,1,-62,3,4+Math.sin(i)*2,5,0x658c8d);}
  for(const b of walls){
   const isCrate=b.kind==='crate';this.box(b.x,b.h/2,b.z,b.w,b.h,b.d,isCrate?0xa66d45:cream);
   this.box(b.x,b.h+.08,b.z,b.w+.15,.16,b.d+.15,isCrate?0x6d4936:0xe9dfc4);
   if(isCrate){for(const dx of [-.35,.35])this.box(b.x+b.w*dx,b.h/2,b.z+b.d/2+.015,.1,b.h,.03,0x514d3d);this.box(b.x,b.h*.5,b.z+b.d/2+.03,b.w,.08,.03,0xe7b166);}
   else{
    this.box(b.x,.45,b.z,b.w+.025,.4,b.d+.025,0x8eab9f);
    if(b.w>3&&b.d>3){
     for(let xx=-b.w/2+.7;xx<b.w/2;xx+=1.45){this.box(b.x+xx,b.h*.65,b.z+b.d/2+.035,.8,.8,.07,0x38585c);this.box(b.x+xx,b.h*.65,b.z+b.d/2+.08,.025,.8,.025,copper);}
     for(let zz=-b.d/2+.8;zz<b.d/2;zz+=2)this.box(b.x+b.w/2+.04,1.6,b.z+zz,.08,1.6,.8,0x436569);
    }
   }
  }
  // Expansion joints and guide lines make navigation readable.
  for(let z=-21;z<22;z+=3)this.box(0,-.018,z,33,.012,.025,0xb2a68b);
  for(let x=-15;x<17;x+=3)this.box(x,-.017,0,.024,.014,43,0xb9ac91);
  for(let z=-19;z<20;z+=2){this.box(-11.1,.008,z,.1,.018,.8,0xe8d9a5);this.box(10.4,.008,z,.1,.018,.8,0xe8d9a5);}
  for(const [x,z] of [[-12,11],[12,-5],[-1,8]]){const g=this.box(x,.01,z,1.5,.03,1,0x455d57);for(let i=0;i<8;i++)this.box(x-.65+i*.18,.035,z,.045,.02,.9,0x889489);}
  // Huge original floodgate gantry, winches, striped hazard bollards.
  this.box(-5,4.5,-20,1,9,1,copper);this.box(5,4.5,-20,1,9,1,copper);this.box(0,8.8,-20,11,.6,1,copper);
  for(let x=-4;x<=4;x+=2){this.box(x,3.2,-21.2,1.7,6,.3,0x546d67);this.box(x,3.2,-20.98,.1,6,.1,0x263c3d);}
  this.sign('SLUICE / 07',0,7.25,-19.42,6,1.5,0,'BRASS TIDE  •  NORTH SPILLWAY');
  this.sign('PUMP HOUSE',-7,3.9,10.56,5.7,1,0,'01  /  WEST SERVICE');
  this.sign('TURBINE HALL',7,3.3,9.56,5,1,0,'02  /  EAST CHANNEL');
  this.sign('KEEP THE TIDE OUT',0,3.2,21.42,8,1.2,Math.PI,'BRASS TIDE  /  COASTAL WORKS');
  this.sign('07   BREACH',-7,4.2,-7.43,5.7,1,0,'CHARGE SITE  ↑');
  this.sign('EAST  →',8,3.7,-9.43,4,1,0,'SPILLWAY ACCESS');
  for(const x of [-2.2,2.2]){this.cylinder(x,.55,-12,.12,1.1,0xd5a75e);for(let y=.2;y<1;y+=.25)this.cylinder(x,y,-12,.125,.11,ink);}
  this.siteRings=[];
  for(const site of sites){
   const ring=new T.Mesh(new T.RingGeometry(site.r-.1,site.r,64),new T.MeshBasicMaterial({color:0xeebd6c,side:T.DoubleSide}));
   ring.rotation.x=-Math.PI/2;ring.position.set(site.x,.035,site.z);this.scene.add(ring);this.siteRings.push(ring);
   this.sign(site.id+' / PLANT',site.x,.05,site.z,2.3,1.1,0,site.name);
   this.scene.children[this.scene.children.length-1].rotation.x=-Math.PI/2;
  }
  this.sign('B / INTAKE',10.55,2.7,-5,3.5,1.1,Math.PI/2,'EAST CHANNEL / CHARGE SITE');
  this.sign('A / SPILLWAY',0,3,-21.4,5,1.1,0,'NORTH / CHARGE SITE');
  // Copper pipes, roof vents, cable lines, and dock edge rails.
  for(const x of [-9,9]){const p=this.cylinder(x,4.9,4,.18,7,copper);p.rotation.z=Math.PI/2;for(let j=0;j<4;j++)this.box(x+(j-1.5),5,4,.1,.7,.7,ink);}
  for(const x of [-16,16])for(let z=-20;z<=20;z+=4){this.box(x,2.7,z,.1,1.4,.1,ink);this.box(x,3.25,z+1.95,.06,.06,4,ink);}
  for(const [x,z] of [[-8,5],[7,1],[-7,-10]]){this.box(x,5.3,z,1.4,.8,1.6,0x59716b);for(let j=0;j<6;j++)this.box(x-.55+j*.22,5.3,z+.82,.07,.6,.05,ink);}
  for(let i=0;i<6;i++){const x=-14+i*5;this.cylinder(x,5,-24,.12,10,ink);this.box(x,10,-24,1,.16,.6,cream);}
 }
 batchArchitecture(){
  // Static architecture shares box geometry: one instanced draw per material.
  const batches=new Map();
  for(const mesh of [...this.scene.children])if(mesh.geometry===this.boxGeo){let group=batches.get(mesh.material);if(!group){group=[];batches.set(mesh.material,group);}group.push(mesh);}
  for(const [material,meshes] of batches){const batch=new T.InstancedMesh(this.boxGeo,material,meshes.length);for(let i=0;i<meshes.length;i++){meshes[i].updateMatrix();batch.setMatrixAt(i,meshes[i].matrix);this.scene.remove(meshes[i]);}batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();this.scene.add(batch);}
 }
 buildBot(ally){
  const g=new T.Group();this.scene.add(g);const color=ally?0x388bb0:0xb44e39;
  const body=this.box(0,.99,0,.55,.65,.34,color,g);this.box(0,1.06,-.2,.4,.47,.1,ink,g);
  this.box(0,.65,0,.43,.23,.3,ink,g);
  const head=this.box(0,1.57,0,.32,.34,.32,0xd4ac81,g);this.box(0,1.72,0,.38,.15,.38,color,g);this.box(0,1.59,-.18,.31,.1,.05,0x183137,g);
  this.box(-.36,1.04,-.08,.18,.52,.2,color,g);this.box(.34,1.05,-.12,.18,.5,.2,color,g);
  const l=this.box(-.15,.32,0,.2,.64,.24,ink,g),r=this.box(.15,.32,0,.2,.64,.24,ink,g);
  this.box(-.15,.08,-.07,.22,.16,.4,0x253234,g);this.box(.15,.08,-.07,.22,.16,.4,0x253234,g);
  this.box(.17,1.1,-.48,.13,.15,.8,0x273638,g);this.box(.17,1.13,-.92,.07,.07,.25,0x273638,g);
  // Bright blue/red shoulder patch and backpack identify teams at a glance.
  this.box(0,1.04,.24,.37,.48,.18,color,g);this.box(-.365,1.2,-.08,.03,.13,.18,0xf3d7a2,g);
  const patch=new T.Mesh(new T.OctahedronGeometry(.2),new T.MeshBasicMaterial({color:0xffdc84}));patch.position.set(0,2.15,0);g.add(patch);patch.visible=false;
  return {g,l,r,body,head,patch,team:ally?0:1};
 }
 buildWeapon(){
  this.gun=new T.Group();this.camera.add(this.gun);this.gun.position.set(.25,-.26,-.48);
  const g=this.gun;
  this.box(0,0,-.15,.135,.16,.48,0x283d40,g,.7);this.box(0,.075,-.29,.15,.035,.66,0x142a2f,g,.65);
  this.box(0,-.01,-.49,.12,.125,.29,0x986843,g,.5);for(let i=0;i<7;i++)this.box(.065,.01,-.61+i*.038,.01,.055,.019,0x233538,g);
  this.box(0,.015,-.76,.055,.055,.3,0x273d3f,g,.8);this.box(0,.015,-.93,.08,.075,.08,0x152b30,g,.7);
  this.box(0,-.12,.04,.095,.23,.12,0x172c30,g);this.box(0,-.2,-.14,.09,.27,.16,0x405053,g,.5);
  this.box(0,.015,.25,.12,.14,.23,0x8d6747,g);this.box(0,.014,.38,.15,.18,.045,0x253638,g);
  this.box(0,.14,-.15,.09,.1,.07,0x182e34,g);this.box(0,.22,-.15,.11,.06,.035,0x182e34,g);this.box(0,.14,-.57,.04,.11,.03,0x182e34,g);
  this.box(.071,.027,-.1,.008,.045,.11,0xd8ba73,g,.5);
  // Gloved support hand, cuff, and two forearms.
  this.box(-.06,-.15,-.45,.16,.14,.2,0x3f5d5b,g);const arm=this.box(-.14,-.27,-.2,.18,.2,.5,0x51829a,g);arm.rotation.y=-.34;this.box(.07,-.23,.13,.18,.2,.34,0x51829a,g);this.box(.045,-.12,.035,.14,.17,.15,0x3f5d5b,g);
  this.flash=new T.Mesh(new T.ConeGeometry(.13,.28,7),new T.MeshBasicMaterial({color:0xffdc83,transparent:true,opacity:.9}));this.flash.rotation.x=-Math.PI/2;this.flash.position.set(0,.015,-1.1);this.gun.add(this.flash);this.flash.visible=false;
 }
 resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 effect(e){
  if(e.type==='shot'){
   const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(e.x,e.y,e.z),new T.Vector3(e.tx,e.ty,e.tz)]);const line=new T.Line(geo,new T.LineBasicMaterial({color:0xffd693,transparent:true,opacity:.7}));this.scene.add(line);this.effects.push({m:line,t:.055});
   const spark=new T.Mesh(new T.SphereGeometry(.055,6,4),new T.MeshBasicMaterial({color:0xffe6a9}));spark.position.set(e.tx,e.ty,e.tz);this.scene.add(spark);this.effects.push({m:spark,t:.14});
  }else if(e.type==='blast'){
   const m=new T.Mesh(new T.SphereGeometry(1,16,12),new T.MeshBasicMaterial({color:0xf2b06d,transparent:true,opacity:.6}));m.position.set(e.x,.8,e.z);this.scene.add(m);this.effects.push({m,t:.45,blast:true});
  }
 }
 render(s,input,dt){
  const p=s.actors[0];let watch=p;if(p.hp<=0)watch=s.actors.find(a=>a.team===p.team&&a.hp>0)||p;
  const targetY=watch.crouch?1.08:1.62;this.camera.position.set(watch.x,targetY,watch.z);
  this.camera.rotation.set(input.pitch,watch===p?input.yaw:watch.yaw,0);
  const ads=input.ads&&p.hp>0;this.camera.fov+=( (ads?(p.weapon==='marksman'?42:59):76)-this.camera.fov)*Math.min(1,dt*12);this.camera.updateProjectionMatrix();
  const speed=Math.hypot(p.vx,p.vz),bob=Math.sin(s.elapsed*10)*Math.min(speed,.8)*.009;
  const recoil=p.cooldown>0?p.cooldown/0.115:0;
  this.gun.visible=p.hp>0;
  this.gun.position.set(ads?.035:.25,-.26+bob-(p.reload>0?.22:0),-.48+Math.min(1,recoil)*.045);this.gun.rotation.set(Math.min(1,recoil)*.07,p.reload>0?-.25:0,p.reload>0?-.35:-bob);
  this.gun.scale.setScalar(p.weapon==='pistol'?.76:1);this.flash.visible=p.cooldown>WEAPON_FLASH[p.weapon];this.flash.rotation.y=s.elapsed*38;
  for(let i=1;i<6;i++){
   const a=s.actors[i],b=this.bots[i];b.g.visible=!!a;if(!a)continue;b.g.position.set(a.x,0,a.z);b.g.rotation.y=a.yaw;
   if(b.team!==a.team){const old=this.mat(b.team===0?0x388bb0:0xb44e39),next=this.mat(a.team===0?0x388bb0:0xb44e39);b.g.traverse(m=>{if(m.material===old)m.material=next;});b.team=a.team;}
   b.patch.visible=s.bomb.carrier===a.id&&a.hp>0;
   if(a.hp<=0){b.g.rotation.z=Math.PI/2;b.g.position.y=.25;}
   else{b.g.rotation.z=0;b.g.scale.y=a.crouch?.72:1;const moving=a.wait<=0&&s.phase==='live';b.l.rotation.x=moving?Math.sin(s.elapsed*8+i)*.3:0;b.r.rotation.x=-b.l.rotation.x;}
  }
  this.charge.visible=s.bomb.planted||s.bomb.dropped;this.lamp.visible=this.charge.visible;
  this.charge.position.set(s.bomb.x,.25,s.bomb.z);this.lamp.position.set(s.bomb.x,.49,s.bomb.z);
  this.lamp.material.color.setHex(Math.sin(s.elapsed*9)>0?0xffba54:0xbb4433);
  for(let i=0;i<this.siteRings.length;i++)this.siteRings[i].material.color.setHex(s.bomb.planted&&s.bomb.site===sites[i].id?0xeb7b48:0xeebd6c);
  for(let i=0;i<(s.grenades||[]).length;i++){
   const g=s.grenades[i];if(!this.grenadeMeshes[i]){const m=new T.Mesh(new T.SphereGeometry(.13,8,6),this.mat(0x4b6254));this.scene.add(m);this.grenadeMeshes[i]=m;}const m=this.grenadeMeshes[i];m.visible=g.time>0;m.position.set(g.x,g.y,g.z);
  }
  for(let i=(s.grenades||[]).length;i<this.grenadeMeshes.length;i++)this.grenadeMeshes[i].visible=false;
  for(let i=this.effects.length-1;i>=0;i--){const e=this.effects[i];e.t-=dt;if(e.blast){e.m.scale.addScalar(dt*10);e.m.material.opacity=Math.max(0,e.t);}
   if(e.t<=0){this.scene.remove(e.m);e.m.geometry.dispose();e.m.material.dispose();this.effects.splice(i,1);}}
  this.renderer.render(this.scene,this.camera);
 }
}
const WEAPON_FLASH={pistol:.215,rifle:.07,marksman:.605};

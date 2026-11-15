// Every sound is generated locally. No samples or remote resources.
export class Audio{
 constructor(){this.ctx=null;this.muted=false;this.lastStep=0;this.lastBeep=0;}
 start(){if(!this.ctx){this.ctx=new AudioContext();this.bus=this.ctx.createGain();this.bus.gain.value=.23;this.bus.connect(this.ctx.destination);const n=this.ctx.sampleRate;this.noise=this.ctx.createBuffer(1,n,this.ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<n;i++)data[i]=Math.random()*2-1;}this.ctx.resume().catch(()=>{});}
 tone(freq,duration=.08,volume=.3,type='sine',pan=0){if(!this.ctx||this.muted)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq*.5),c.currentTime+duration);g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);p.pan.value=pan;o.connect(g);g.connect(p);p.connect(this.bus);o.start();o.stop(c.currentTime+duration);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};}
 burst(duration,volume,cutoff=1600,pan=0){if(!this.ctx||this.muted)return;const c=this.ctx,n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),p=c.createStereoPanner();n.buffer=this.noise;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);p.pan.value=pan;n.connect(f);f.connect(g);g.connect(p);p.connect(this.bus);n.start();n.stop(c.currentTime+duration);n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();p.disconnect();};}
 event(e,player,yaw){
  if(e.type==='shot'){const d=Math.hypot(e.x-player.x,e.z-player.z),gain=e.id===0?1:.65/(1+d*.1),pan=e.id===0?0:Math.max(-1,Math.min(1,((e.x-player.x)*Math.cos(yaw)-(e.z-player.z)*Math.sin(yaw))/15));this.burst(.15,gain,2200,pan);this.tone(e.weapon==='marksman'?85:130,.13,gain*.7,'triangle',pan);}
  else if(e.type==='hit'&&e.id===0)this.tone(e.head?1300:800,.07,.35,'triangle');
  else if(e.type==='blast'){this.burst(.65,2,700);this.tone(55,.65,1);}
  else if(e.type==='plant'){this.tone(750,.2,.4);}
  else if(e.type==='round'){this.tone(e.team===0?440:200,.4,.5,'triangle');setTimeout(()=>this.tone(e.team===0?660:150,.4,.4,'triangle'),150);}
 }
 tick(s,p){if(Math.hypot(p.vx,p.vz)>1&&s.elapsed-this.lastStep>(p.crouch?.48:.34)){this.lastStep=s.elapsed;this.burst(.055,.14,600);}if(s.bomb.planted&&s.elapsed-this.lastBeep>(s.bomb.time<8?.23:.85)){this.lastBeep=s.elapsed;this.tone(1100,.05,.15);}}
}

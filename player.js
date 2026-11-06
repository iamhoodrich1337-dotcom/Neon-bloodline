// NEON: BLOODLINE — PlayerController + CharacterAnimator (v0.3)
// Временная процедурная 2D-анимация (не 3D).
// В будущем CharacterAnimator заменяется на GLB-модель (Three.js)
// с тем же интерфейсом: update(info), bump(nx,ny), setPosition(x,y), destroy().

function makeHeroParts(s){
  if(s.textures.exists('h_torso'))return;
  const g=s.make.graphics({add:false});
  const T=(k,w,h)=>{g.generateTexture(k,w,h);g.clear();};
  const SKIN=0xd9a27e,HAIR=0x120c0a,SUIT=0x0e0e12,RIM=0x3a3a48;
  g.fillStyle(0x0b0b0f).fillRoundedRect(0,0,8,18,3);
  g.fillStyle(0x2a2a33).fillRect(0,15,8,3);
  T('h_leg',8,18);
  g.fillStyle(0x111116).fillRoundedRect(0,0,7,17,3);
  g.fillStyle(SKIN).fillCircle(3.5,17,3);
  T('h_arm',7,21);
  g.fillStyle(SUIT).fillRoundedRect(0,0,28,24,7);
  g.fillStyle(0x1e1e26).fillTriangle(8,0,14,12,11,0).fillTriangle(20,0,14,12,17,0);
  g.fillStyle(0x050506).fillRect(13,2,2,20);
  g.fillStyle(0xc9a227).fillRect(3,17,3,2);
  g.lineStyle(1,RIM).strokeRoundedRect(0.5,0.5,27,23,7);
  T('h_torso',28,24);
  g.fillStyle(SUIT).fillRoundedRect(0,0,28,24,7);
  g.fillStyle(0x08080a).fillRect(13,4,2,18);
  g.lineStyle(1,RIM).strokeRoundedRect(0.5,0.5,27,23,7);
  T('h_torso_b',28,24);
  g.fillStyle(SKIN).fillCircle(11,12,10);
  g.fillStyle(HAIR).fillEllipse(11,6,22,12).fillRect(1,4,3,8).fillRect(18,4,3,8);
  g.fillStyle(0x1a1010).fillRect(6,12,3,2).fillRect(13,12,3,2);
  g.fillStyle(0x3a2a22,0.5).fillEllipse(11,18,12,6);
  T('h_head_f',22,23);
  g.fillStyle(SKIN).fillCircle(11,12,10);
  g.fillStyle(HAIR).fillCircle(11,10,10.5);
  T('h_head_b',22,23);
  g.fillStyle(SKIN).fillCircle(11,12,10);
  g.fillStyle(HAIR).fillEllipse(8,7,20,12).fillRect(1,5,8,10);
  g.fillStyle(0x1a1010).fillRect(16,12,3,2);
  g.fillStyle(0x3a2a22,0.5).fillEllipse(14,18,9,5);
  T('h_head_s',22,23);
  g.fillStyle(0x000000,0.45).fillEllipse(16,6,32,12);
  T('h_shadow',32,12);
  g.destroy();
}

class CharacterAnimator{
  constructor(scene,x,y){
    makeHeroParts(scene);
    this.phase=0;this.t=0;this.facing='down';this.flip=1;
    this.turnT=0;this.bumpT=0;this.bx=0;this.by=0;
    const A=(k,ox,oy)=>scene.add.image(0,0,k).setOrigin(ox,oy);
    this.shadow=A('h_shadow',.5,.5);
    this.legL=A('h_leg',.5,0);this.legR=A('h_leg',.5,0);
    this.armL=A('h_arm',.5,.1);this.armR=A('h_arm',.5,.1);
    this.torso=A('h_torso',.5,.5).setY(-28);
    this.head=A('h_head_f',.5,.5).setY(-48);
    this.body=scene.add.container(0,0,[this.legL,this.legR,this.armL,this.torso,this.armR,this.head]);
    this.root=scene.add.container(x,y,[this.shadow,this.body]);
    this.applyFacing();
  }
  applyFacing(){
    const f=this.facing,side=f==='side';
    this.head.setTexture(f==='up'?'h_head_b':side?'h_head_s':'h_head_f');
    this.torso.setTexture(f==='up'?'h_torso_b':'h_torso');
    this.torso.scaleX=side?0.72:1;
    const ax=side?6:15;
    this.armL.setPosition(-ax,-39);this.armR.setPosition(ax,-39);
    const lx=side?2:5;
    this.legL.setPosition(-lx,-18);this.legR.setPosition(lx,-18);
  }
  update(o){
    const dt=o.dt,k=o.speedPx;
    this.t+=dt;
    let f=this.facing,fl=this.flip;
    if(o.moving){
      f=Math.abs(o.dx)>Math.abs(o.dy)*1.1?'side':(o.dy<0?'up':'down');
      if(Math.abs(o.dx)>0.15)fl=o.dx<0?-1:1;
    }
    if(f!==this.facing||fl!==this.flip){this.facing=f;this.flip=fl;this.turnT=0.14;this.applyFacing();}
    if(this.turnT>0)this.turnT=Math.max(0,this.turnT-dt);

    const amp=Math.min(k/150,1.6),side=this.facing==='side';
    this.phase+=dt*k*0.055;
    const s=Math.sin(this.phase),c=Math.cos(this.phase);
    if(side){
      this.legL.rotation=s*0.45*amp;this.legR.rotation=-s*0.45*amp;
      this.legL.scaleY=this.legR.scaleY=1;
      this.armL.rotation=-s*0.55*amp;this.armR.rotation=s*0.55*amp;
    }else{
      this.legL.rotation=this.legR.rotation=0;
      this.legL.scaleY=1-Math.max(0,s)*0.25*amp;
      this.legR.scaleY=1-Math.max(0,-s)*0.25*amp;
      this.armL.rotation=s*0.15*amp;this.armR.rotation=s*0.15*amp;
    }
    const bob=-Math.abs(c)*2*amp;
    let rot;
    if(k<10){
      const br=Math.sin(this.t*2.2);
      this.torso.scaleY=1+br*0.025;
      this.head.y=-48+br*0.5;
      rot=Math.sin(this.t*0.8)*0.015;
    }else{
      this.torso.scaleY=1;this.head.y=-48;
      rot=side?(o.running?0.12:0.04)*this.flip:s*0.04*amp;
    }
    this.body.rotation=rot;

    const ts=this.turnT>0?0.55+0.45*(1-this.turnT/0.14):1;
    let sx=1,sy=1,bx=0,by=0;
    if(this.bumpT>0){
      this.bumpT=Math.max(0,this.bumpT-dt);
      const q=this.bumpT/0.22;
      bx=this.bx*q*3;by=this.by*q*3;sx=1+0.08*q;sy=1-0.08*q;
    }
    this.body.setScale(this.flip*ts*sx,sy);
    this.body.setPosition(bx,bob+by);
    this.shadow.setScale(1+bob*0.04);
  }
  bump(nx,ny){if(this.bumpT>0.1)return;this.bumpT=0.22;this.bx=nx;this.by=ny;}
  setPosition(x,y){this.root.setPosition(x,y);this.root.setDepth(y);}
  destroy(){this.root.destroy();}
}

class PlayerController{
  constructor(scene,x,y,walls){
    this.WALK=150;this.RUN=260;
    this.vx=0;this.vy=0;this.state='IDLE';this.wasHit=false;
    this.sprite=scene.physics.add.sprite(x,y,'hero').setVisible(false).setCollideWorldBounds(true);
    this.sprite.body.setSize(22,14).setOffset(13,48);
    scene.physics.add.collider(this.sprite,walls);
    this.anim=new CharacterAnimator(scene,x,y+24);
    // позиция героя синхронизируется ПОСЛЕ шага физики — без дрожания камеры
    const sync=()=>this.anim.setPosition(this.sprite.x,this.sprite.y+24);
    scene.events.on('postupdate',sync);
    scene.events.once('shutdown',()=>scene.events.off('postupdate',sync));
  }
  update(inp,dt){
    let ix=inp.x,iy=inp.y;
    const len=Math.hypot(ix,iy);
    if(len>1){ix/=len;iy/=len;}
    const moving=len>0.15,max=inp.run?this.RUN:this.WALK;
    const tx=moving?ix*max:0,ty=moving?iy*max:0;
    const a=1-Math.exp(-(moving?10:8)*dt);
    this.vx+=(tx-this.vx)*a;this.vy+=(ty-this.vy)*a;

    const bl=this.sprite.body.blocked;
    let hit=false,nx=0,ny=0;
    if(bl.left&&ix<-0.3){hit=true;nx=1;this.vx=0;}
    if(bl.right&&ix>0.3){hit=true;nx=-1;this.vx=0;}
    if(bl.up&&iy<-0.3){hit=true;ny=1;this.vy=0;}
    if(bl.down&&iy>0.3){hit=true;ny=-1;this.vy=0;}
    if(hit&&!this.wasHit)this.anim.bump(nx,ny);
    this.wasHit=hit;

    if(!moving&&Math.hypot(this.vx,this.vy)<2){this.vx=0;this.vy=0;}
    this.sprite.setVelocity(this.vx,this.vy);

    const sp=Math.hypot(this.vx,this.vy);
    this.anim.update({dt,speedPx:sp,moving,dx:ix,dy:iy,running:sp>200});
    this.state=hit?'COLLISION':this.anim.turnT>0?'TURN':sp<12?'IDLE':sp>200?'RUN':'WALK';
  }
}

// NEON: BLOODLINE — Vehicle System v0.4
// VehiclePhysics   — физика: разгон, торможение, задний ход, инерция, повороты, удары
// VehicleController — одна машина: спрайт, физика, фары, неоновая подсветка
// VehicleManager    — все машины, посадка/выход, камера
// VehicleUI         — сенсорные кнопки (в сцене UI)
// Новая машина = новая запись в VEHICLE_TYPES + manager.spawn('id',x,y,угол)

const VEHICLE_TYPES={
  nova:{id:'nova',name:'NOVA GT',body:0x0a0a0d,glass:0x1b2a3a,accent:0x00f0ff,
    max:420,accel:230,brake:520,reverse:170,maxRev:120,drag:110,turn:2.6,grip:6}
};

function makeCarTexture(s,t){
  const key='car_'+t.id;
  if(s.textures.exists(key))return key;
  const g=s.make.graphics({add:false});
  g.fillStyle(0x000000,0.4).fillRoundedRect(5,7,74,32,10);
  g.fillStyle(0x000000).fillRect(14,1,12,4).fillRect(54,1,12,4).fillRect(14,34,12,4).fillRect(54,34,12,4);
  g.fillStyle(t.body).fillRoundedRect(2,3,74,32,9);
  g.fillStyle(t.glass).fillRoundedRect(26,7,26,24,6);
  g.fillStyle(0x15151b).fillRoundedRect(32,9,16,20,4);
  g.lineStyle(1,0x2a2a33).lineBetween(54,10,72,12).lineBetween(54,28,72,26);
  g.fillStyle(t.accent).fillRect(8,3,58,2).fillRect(8,33,58,2);
  g.fillStyle(0xe8fbff).fillRect(71,7,4,7).fillRect(71,24,4,7);
  g.fillStyle(0xff2b4a).fillRect(2,7,3,8).fillRect(2,23,3,8);
  g.lineStyle(1,t.accent,0.6).strokeRoundedRect(2,3,74,32,9);
  g.generateTexture(key,80,40);
  g.destroy();
  return key;
}

class VehiclePhysics{
  constructor(sprite,spec,heading){
    this.sprite=sprite;this.spec=spec;this.heading=heading||0;
    this.speed=0;this.vx=0;this.vy=0;this.angVel=0;this.wasHit=false;this.onImpact=null;
  }
  update(inp,dt){
    const s=this.spec,b=this.sprite.body,bl=b.blocked;
    const hitX=bl.left||bl.right,hitY=bl.up||bl.down,hit=hitX||hitY;
    if(hitX)this.vx=0;
    if(hitY)this.vy=0;
    if(hit&&!this.wasHit&&Math.abs(this.speed)>40){this.speed*=-0.3;if(this.onImpact)this.onImpact();}
    else if(hit)this.speed*=0.9;
    this.wasHit=hit;

    let sp=this.speed,braking=false;
    if(inp.gas){
      if(sp<0){sp+=s.brake*dt;braking=true;}
      else sp+=s.accel*(1-sp/s.max*0.6)*dt;
    }else if(inp.brake){
      if(sp>5){sp-=s.brake*dt;braking=true;}
      else sp-=s.reverse*dt;
    }else{
      const d=s.drag*dt;
      sp=Math.abs(sp)<=d?0:sp-Math.sign(sp)*d;
    }
    sp=Phaser.Math.Clamp(sp,-s.maxRev,s.max);

    const steer=(inp.right?1:0)-(inp.left?1:0);
    const f=Phaser.Math.Clamp(sp/120,-1,1);
    this.angVel+=(steer*s.turn*f-this.angVel)*Math.min(1,10*dt);
    this.heading+=this.angVel*dt;

    const g=1-Math.exp(-s.grip*dt);
    this.vx+=(Math.cos(this.heading)*sp-this.vx)*g;
    this.vy+=(Math.sin(this.heading)*sp-this.vy)*g;
    this.sprite.setVelocity(this.vx,this.vy);
    this.speed=sp;
    return braking;
  }
}

class VehicleController{
  constructor(scene,spec,x,y,heading){
    this.scene=scene;this.spec=spec;this.driven=false;this.braking=false;
    this.sprite=scene.physics.add.sprite(x,y,makeCarTexture(scene,spec)).setCollideWorldBounds(true);
    this.sprite.body.setCircle(20,20,0);
    this.sprite.body.setImmovable(true);
    this.phys=new VehiclePhysics(this.sprite,spec,heading);
    this.phys.onImpact=()=>scene.cameras.main.shake(120,0.004);
    const G=(tint,sx,sy,a)=>scene.add.image(x,y,'glow').setTint(tint).setBlendMode('ADD').setScale(sx,sy).setAlpha(a);
    this.under=G(spec.accent,2.2,1.4,0.35);
    this.head=G(0xdff8ff,2.6,1.3,0);
    this.tail=G(0xff2b4a,1.4,1.2,0.15);
    const sync=()=>this.sync();
    scene.events.on('postupdate',sync);
    scene.events.once('shutdown',()=>scene.events.off('postupdate',sync));
    this.sync();
  }
  setDriven(d){this.driven=d;this.sprite.body.setImmovable(!d);this.head.setAlpha(d?0.55:0);}
  stop(){const p=this.phys;p.speed=0;p.vx=0;p.vy=0;p.angVel=0;this.sprite.setVelocity(0,0);}
  update(inp,dt){this.braking=this.phys.update(inp||{},dt);}
  sync(){
    const s=this.sprite,h=this.phys.heading,c=Math.cos(h),n=Math.sin(h);
    s.rotation=h;s.setDepth(s.y+18);
    this.under.setPosition(s.x,s.y).setRotation(h).setDepth(s.y+16);
    this.head.setPosition(s.x+c*70,s.y+n*70).setRotation(h).setDepth(s.y+17);
    this.tail.setPosition(s.x-c*40,s.y-n*40).setRotation(h).setDepth(s.y+17).setAlpha(this.braking?0.85:0.15);
  }
}

class VehicleManager{
  constructor(scene,walls,pc){
    this.s=scene;this.walls=walls;this.pc=pc;
    this.cars=[];this.driving=null;this.near=null;this.lx=0;this.ly=0;
  }
  spawn(type,x,y,heading){
    const c=new VehicleController(this.s,VEHICLE_TYPES[type],x,y,heading);
    this.s.physics.add.collider(c.sprite,this.walls);
    this.s.physics.add.collider(this.pc.sprite,c.sprite);
    this.cars.forEach(o=>this.s.physics.add.collider(o.sprite,c.sprite));
    this.cars.push(c);
    return c;
  }
  update(vui,k,dt){
    const ek=!!(k&&k.E&&Phaser.Input.Keyboard.JustDown(k.E));
    this.cars.forEach(c=>{if(c!==this.driving)c.update(null,dt);});
    if(this.driving){
      const c=this.driving,cam=this.s.cameras.main,t=1-Math.exp(-3*dt);
      c.update(vui?vui.input(k):{},dt);
      this.lx+=(-c.phys.vx*0.35-this.lx)*t;
      this.ly+=(-c.phys.vy*0.35-this.ly)*t;
      cam.setFollowOffset(this.lx,this.ly);
      const z=this.s.zoomFn()*(1-Math.min(Math.abs(c.phys.speed)/c.spec.max,1)*0.18);
      cam.setZoom(cam.zoom+(z-cam.zoom)*t);
      if(vui)vui.take('enter');
      if((vui&&vui.take('exit'))||ek)this.exit();
    }else{
      const p=this.pc.sprite;let best=null,bd=80;
      this.cars.forEach(c=>{
        const d=Phaser.Math.Distance.Between(p.x,p.y+24,c.sprite.x,c.sprite.y);
        if(d<bd){bd=d;best=c;}
      });
      this.near=best;
      if(vui)vui.take('exit');
      if(best&&((vui&&vui.take('enter'))||ek))this.enter(best);
    }
    if(vui)vui.setMode(this.driving?'car':this.near?'near':'foot',this.driving);
  }
  enter(c){
    const ps=this.pc.sprite;
    this.driving=c;c.setDriven(true);
    ps.setVelocity(0,0);ps.body.enable=false;
    this.pc.vx=0;this.pc.vy=0;
    this.pc.anim.root.setVisible(false);
    this.lx=0;this.ly=0;
    this.s.cameras.main.startFollow(c.sprite,true,0.1,0.1);
  }
  exit(){
    const c=this.driving,h=c.phys.heading,cx=c.sprite.x,cy=c.sprite.y;
    const px=-Math.sin(h),py=Math.cos(h),fx=Math.cos(h),fy=Math.sin(h);
    const cand=[[px*42,py*42],[-px*42,-py*42],[-fx*60,-fy*60],[fx*60,fy*60],[px*70,py*70],[-px*70,-py*70]];
    for(const [ox,oy] of cand){
      const x=cx+ox,y=cy+oy-24;
      if(!this.free(x,y))continue;
      c.stop();c.setDriven(false);this.driving=null;
      const ps=this.pc.sprite;
      ps.body.enable=true;ps.body.reset(x,y);
      this.pc.anim.root.setVisible(true);
      this.pc.anim.setPosition(x,y+24);
      const cam=this.s.cameras.main;
      cam.startFollow(ps,true,0.12,0.12);cam.setFollowOffset(0,0);cam.setZoom(this.s.zoomFn());
      return true;
    }
    return false;
  }
  free(x,y){
    const R=Phaser.Geom.Rectangle,r=new R(x-11,y+16,22,14),wb=this.s.physics.world.bounds;
    if(r.x<wb.x||r.y<wb.y||r.right>wb.right||r.bottom>wb.bottom)return false;
    for(const w of this.walls.getChildren()){
      const b=w.body;
      if(Phaser.Geom.Intersects.RectangleToRectangle(r,new R(b.x,b.y,b.width,b.height)))return false;
    }
    for(const c of this.cars){
      if(Phaser.Math.Distance.Between(r.centerX,r.centerY,c.sprite.x,c.sprite.y)<34)return false;
    }
    return true;
  }
}

class VehicleUI{
  constructor(ui){
    this.ui=ui;this.mode='';
    this.held={left:false,right:false,gas:false,brake:false};this.flags={};
    const F='"Arial Black",Impact,sans-serif';
    const mk=(label,w,h,col,hold,name)=>{
      const r=ui.add.rectangle(0,0,w,h,0x000000,0.45).setStrokeStyle(3,col).setInteractive();
      const t=ui.add.text(0,0,label,{fontFamily:F,fontSize:'14px',color:'#ffffff'}).setOrigin(.5);
      const b={r,t,pid:null};
      r.on('pointerdown',p=>{
        if(hold){this.held[name]=true;b.pid=p.id;r.setFillStyle(col,0.35);}
        else this.flags[name]=true;
      });
      if(hold){
        const up=p=>{if(p.id===b.pid){b.pid=null;this.held[name]=false;r.setFillStyle(0x000000,0.45);}};
        ui.input.on('pointerup',up);ui.input.on('pointerupoutside',up);
      }
      b.set=(x,y)=>{r.setPosition(x,y);t.setPosition(x,y);};
      b.show=v=>{
        r.setVisible(v);t.setVisible(v);
        if(v)r.setInteractive();else r.disableInteractive();
        if(!v&&hold){b.pid=null;this.held[name]=false;r.setFillStyle(0x000000,0.45);}
      };
      return b;
    };
    this.enterB=mk('ENTER CAR',170,52,0x39ff88,false,'enter');
    this.exitB=mk('EXIT',84,38,0xffb000,false,'exit');
    this.leftB=mk('LEFT',80,80,0x00f0ff,true,'left');
    this.rightB=mk('RIGHT',80,80,0x00f0ff,true,'right');
    this.brakeB=mk('BRAKE',80,80,0xff2b4a,true,'brake');
    this.gasB=mk('GAS',90,110,0x39ff88,true,'gas');
    this.speedT=ui.add.text(0,0,'',{fontFamily:F,fontSize:'24px',color:'#ffffff'}).setOrigin(.5).setShadow(0,0,'#00f0ff',10,true,true);
    this.setMode('foot');
  }
  layout(w,h){
    this.enterB.set(w-110,h-200);
    this.exitB.set(w-56,84);
    this.leftB.set(52,h-70);
    this.rightB.set(140,h-70);
    this.brakeB.set(w-150,h-70);
    this.gasB.set(w-55,h-80);
    this.speedT.setPosition(w/2,h-150);
  }
  setMode(m,car){
    if(m!==this.mode){
      this.mode=m;
      const c=m==='car',u=this.ui;
      this.enterB.show(m==='near');
      this.exitB.show(c);
      [this.leftB,this.rightB,this.brakeB,this.gasB].forEach(b=>b.show(c));
      this.speedT.setVisible(c);
      [u.base,u.thumb,u.rt].forEach(o=>o&&o.setVisible(!c));
      if(u.rb){u.rb.setVisible(!c);if(c)u.rb.disableInteractive();else u.rb.setInteractive();}
      if(c){
        if(u.hint)u.hint.setVisible(false);
        u.pid=null;if(u.vec)u.vec.set(0,0);
        if(u.layout)u.layout();
      }
    }
    if(car)this.speedT.setText(Math.round(Math.abs(car.phys.speed)*0.45)+' km/h');
  }
  take(n){const v=!!this.flags[n];this.flags[n]=false;return v;}
  input(k){
    const h=this.held,K=k||{},d=x=>!!(x&&x.isDown);
    return{
      gas:h.gas||d(K.W)||d(K.UP),
      brake:h.brake||d(K.S)||d(K.DOWN),
      left:h.left||d(K.A)||d(K.LEFT),
      right:h.right||d(K.D)||d(K.RIGHT)
    };
  }
}

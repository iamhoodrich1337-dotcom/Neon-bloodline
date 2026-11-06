// NEON: BLOODLINE — SaveManager v1
// Хранит прогресс в localStorage. Все операции защищены try/catch
// (приватный режим Safari, переполнение хранилища, повреждённые данные).
// Формат: { v, t, mode:'foot'|'car', car, player:{x,y}, cars:[{type,x,y,h}], settings:{run} }

const SaveManager={
  KEY:'neon_bloodline_save',
  VERSION:1,
  _ok:null,
  available(){
    if(this._ok!==null)return this._ok;
    try{localStorage.setItem('__nb_test','1');localStorage.removeItem('__nb_test');this._ok=true;}
    catch(e){this._ok=false;}
    return this._ok;
  },
  load(){
    if(!this.available())return null;
    try{
      const raw=localStorage.getItem(this.KEY);
      if(!raw)return null;
      return this.migrate(JSON.parse(raw));
    }catch(e){console.warn('Save load failed',e);return null;}
  },
  // Обновление старых форматов. Пример на будущее:
  // if(d.v===1){ d.money=0; d.v=2; }
  migrate(d){
    if(!d||typeof d!=='object')return null;
    if(d.v===this.VERSION)return d;
    return null;
  },
  save(d){
    if(!this.available())return false;
    try{
      d.v=this.VERSION;d.t=Date.now();
      localStorage.setItem(this.KEY,JSON.stringify(d));
      return true;
    }catch(e){console.warn('Save failed',e);return false;}
  },
  has(){return !!this.load();},
  clear(){try{localStorage.removeItem(this.KEY);}catch(e){}}
};

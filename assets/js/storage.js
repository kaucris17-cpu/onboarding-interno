import { APP } from "./appConfig.js";

function key(name){
  return `${APP.storagePrefix}:${name}`;
}

export const Storage = {
  get(name, fallback){
    try{
      const raw = localStorage.getItem(key(name));
      if(raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    }catch{
      return fallback;
    }
  },
  set(name, value){
    localStorage.setItem(key(name), JSON.stringify(value));
  },
  remove(name){
    localStorage.removeItem(key(name));
  },
  nowISO(){
    return new Date().toISOString();
  }
};
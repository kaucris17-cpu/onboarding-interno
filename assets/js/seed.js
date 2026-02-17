import { Storage } from "./storage.js";
import { APP } from "./appConfig.js";
import { DataStore } from "./apiAdapter.js";

async function fetchJSON(path){
  // TODO(API): em produção, estes dados viriam de API / banco
  const res = await fetch(path, { cache: "no-store" });
  if(!res.ok) throw new Error(`Falha ao carregar ${path}`);
  return await res.json();
}

export async function ensureSeed(){
  const seededAt = Storage.get(APP.storageKeys.seeded, null);
  if(seededAt) return;

  const [users, contents, quizzes] = await Promise.all([
    fetchJSON("./data/users.json"),
    fetchJSON("./data/contents.json"),
    fetchJSON("./data/quizzes.json")
  ]);

  DataStore.users.saveAll(users);
  DataStore.contents.saveAll(contents);
  DataStore.quizzes.saveAll(quizzes);

  Storage.set(APP.storageKeys.progress, {
    completions: {},
    quizAttempts: {}
  });

  Storage.set(APP.storageKeys.chat, { threads: {} });

  Storage.set(APP.storageKeys.seeded, Storage.nowISO());
}
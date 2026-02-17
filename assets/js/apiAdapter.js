import { Storage } from "./storage.js";
import { APP } from "./appConfig.js";

/**
 * Camada de dados preparada para integração futura.
 * Hoje usa localStorage. Amanhã pode trocar para API + banco sem reescrever telas.
 *
 * TODO(API): substituir métodos por fetch/axios (sem obrigatoriedade) para endpoints reais.
 * Ex:
 *   const res = await fetch("/api/users");
 *   return await res.json();
 */
export const DataStore = {
  users: {
    list(){
      return Storage.get(APP.storageKeys.users, []);
    },
    getById(id){
      return this.list().find(u => u.id === id) || null;
    },
    getByEmail(email){
      return this.list().find(u => (u.email || "").toLowerCase() === (email || "").toLowerCase()) || null;
    },
    saveAll(users){
      Storage.set(APP.storageKeys.users, users);
      return users;
    },
    upsert(user){
      const users = this.list();
      const idx = users.findIndex(u => u.id === user.id);
      if(idx >= 0) users[idx] = user;
      else users.push(user);
      this.saveAll(users);
      return user;
    }
  },

  contents: {
    list(){
      return Storage.get(APP.storageKeys.contents, []);
    },
    getById(id){
      return this.list().find(c => c.id === id) || null;
    },
    saveAll(contents){
      Storage.set(APP.storageKeys.contents, contents);
      return contents;
    },
    upsert(content){
      const all = this.list();
      const idx = all.findIndex(c => c.id === content.id);
      if(idx >= 0) all[idx] = content;
      else all.push(content);
      this.saveAll(all);
      return content;
    },
    remove(id){
      const all = this.list().filter(c => c.id !== id);
      this.saveAll(all);
      return true;
    }
  },

  quizzes: {
    list(){
      return Storage.get(APP.storageKeys.quizzes, []);
    },
    getById(id){
      return this.list().find(q => q.id === id) || null;
    },
    saveAll(quizzes){
      Storage.set(APP.storageKeys.quizzes, quizzes);
      return quizzes;
    },
    upsert(quiz){
      const all = this.list();
      const idx = all.findIndex(q => q.id === quiz.id);
      if(idx >= 0) all[idx] = quiz;
      else all.push(quiz);
      this.saveAll(all);
      return quiz;
    },
    remove(id){
      const all = this.list().filter(q => q.id !== id);
      this.saveAll(all);
      return true;
    }
  },

  progress: {
    getAll(){
      return Storage.get(APP.storageKeys.progress, {
        completions: {},  // { userId: { contentId: { doneAt, secondsSpent } } }
        quizAttempts: {}  // { userId: { quizId: [ {score, total, percent, status, startedAt, finishedAt, secondsSpent} ] } }
      });
    },
    saveAll(progress){
      Storage.set(APP.storageKeys.progress, progress);
      return progress;
    },
    markContentDone(userId, contentId, payload){
      const p = this.getAll();
      if(!p.completions[userId]) p.completions[userId] = {};
      p.completions[userId][contentId] = {
        doneAt: payload?.doneAt || Storage.nowISO(),
        secondsSpent: payload?.secondsSpent || 0
      };
      this.saveAll(p);
      return p;
    },
    isContentDone(userId, contentId){
      const p = this.getAll();
      return !!(p.completions?.[userId]?.[contentId]);
    },
    addQuizAttempt(userId, quizId, attempt){
      const p = this.getAll();
      if(!p.quizAttempts[userId]) p.quizAttempts[userId] = {};
      if(!p.quizAttempts[userId][quizId]) p.quizAttempts[userId][quizId] = [];
      p.quizAttempts[userId][quizId].push(attempt);
      this.saveAll(p);
      return attempt;
    },
    listQuizAttempts(userId, quizId){
      const p = this.getAll();
      return p.quizAttempts?.[userId]?.[quizId] || [];
    }
  },

  session: {
    get(){
      return Storage.get(APP.storageKeys.session, null);
    },
    set(session){
      Storage.set(APP.storageKeys.session, session);
      return session;
    },
    clear(){
      Storage.remove(APP.storageKeys.session);
    }
  },

  chat: {
    getAll(){
      return Storage.get(APP.storageKeys.chat, { threads: {} }); // { userId: [{id, role, text, at}] }
    },
    saveAll(chat){
      Storage.set(APP.storageKeys.chat, chat);
      return chat;
    },
    list(userId){
      const all = this.getAll();
      return all.threads?.[userId] || [];
    },
    push(userId, msg){
      const all = this.getAll();
      if(!all.threads[userId]) all.threads[userId] = [];
      all.threads[userId].push(msg);
      this.saveAll(all);
      return msg;
    }
  }
};
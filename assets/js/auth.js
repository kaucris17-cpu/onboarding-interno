import { DataStore } from "./apiAdapter.js";
import { Storage } from "./storage.js";

function safeId(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export const Auth = {
  current(){
    const s = DataStore.session.get();
    if(!s?.userId) return null;
    return DataStore.users.getById(s.userId);
  },

  login(email, password){
    const user = DataStore.users.getByEmail(email);
    if(!user) return { ok:false, error:"Credenciais inválidas." };
    if(user.active === false) return { ok:false, error:"Usuário desativado." };
    if((user.password || "") !== (password || "")) return { ok:false, error:"Credenciais inválidas." };

    DataStore.session.set({
      userId: user.id,
      createdAt: Storage.nowISO()
    });

    return { ok:true, user };
  },

  logout(){
    DataStore.session.clear();
  },

  requestPasswordReset(email){
    const user = DataStore.users.getByEmail(email);
    if(!user) return { ok:false, error:"E-mail não encontrado." };

    // simulado: criar token e “enviar”
    const token = safeId("reset");
    const updated = { ...user, resetToken: token, resetRequestedAt: Storage.nowISO() };
    DataStore.users.upsert(updated);

    return { ok:true, token };
  },

  resetPassword(email, token, newPassword){
    const user = DataStore.users.getByEmail(email);
    if(!user) return { ok:false, error:"E-mail não encontrado." };
    if(!token || user.resetToken !== token) return { ok:false, error:"Token inválido." };

    const updated = {
      ...user,
      password: newPassword,
      resetToken: null,
      resetRequestedAt: null,
      passwordUpdatedAt: Storage.nowISO()
    };
    DataStore.users.upsert(updated);
    return { ok:true };
  },

  adminResetPassword(userId){
    const user = DataStore.users.getById(userId);
    if(!user) return { ok:false, error:"Usuário não encontrado." };
    const updated = { ...user, password: "123456", passwordUpdatedAt: Storage.nowISO() };
    DataStore.users.upsert(updated);
    return { ok:true, newPassword: "123456" };
  }
};
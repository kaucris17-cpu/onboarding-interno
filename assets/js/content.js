import { DataStore } from "./apiAdapter.js";

function norm(x){ return (x || "").toString().trim().toLowerCase(); }

function matchesOne(value, list){
  if(!list || list.length === 0) return true;
  const v = norm(value);
  return list.map(norm).includes(v);
}

function matchesTag(tags, q){
  if(!q) return true;
  const query = norm(q);
  const all = (tags || []).map(norm);
  return all.some(t => t.includes(query)) || all.join(" ").includes(query);
}

export const Content = {
  listAll(){
    return DataStore.contents.list().slice().sort((a,b) => (a.orderInTrack||0) - (b.orderInTrack||0));
  },

  /**
   * Trilha obrigatória para o cargo do usuário.
   * Regras:
   * - unidade e setor precisam bater (ou conteúdo setado como "Geral")
   * - cargo precisa estar em linkedRoles (ou vazio = global)
   * - obrigatório = true
   */
  listMandatoryTrackForUser(user){
    const all = this.listAll();
    return all.filter(c => {
      const unitOk = (norm(c.unit) === "geral") || norm(c.unit) === norm(user.unit);
      const sectorOk = (norm(c.sector) === "geral") || norm(c.sector) === norm(user.sector);
      const roleOk = (!c.linkedRoles || c.linkedRoles.length === 0) || matchesOne(user.jobTitle, c.linkedRoles);
      return unitOk && sectorOk && roleOk && c.mandatory === true && c.active !== false;
    }).sort((a,b) => (a.orderInTrack||0) - (b.orderInTrack||0));
  },

  /**
   * Biblioteca: conteúdos extras (inclui obrigatórios também, se necessário)
   * Permissão:
   * - admin/supervisor: tudo
   * - user: somente o que bate unidade/setor e cargo OU marcado como "Geral"
   */
  listLibraryForUser(user){
    const all = this.listAll().filter(c => c.active !== false);
    if(user.role === "admin" || user.role === "supervisor") return all;

    return all.filter(c => {
      const unitOk = (norm(c.unit) === "geral") || norm(c.unit) === norm(user.unit);
      const sectorOk = (norm(c.sector) === "geral") || norm(c.sector) === norm(user.sector);
      const roleOk = (!c.linkedRoles || c.linkedRoles.length === 0) || matchesOne(user.jobTitle, c.linkedRoles);
      return unitOk && sectorOk && roleOk;
    });
  },

  search(list, { type, tagQuery }){
    return (list || []).filter(c => {
      const typeOk = type ? norm(c.type) === norm(type) : true;
      const tagOk = matchesTag(c.tags, tagQuery);
      return typeOk && tagOk;
    });
  }
};
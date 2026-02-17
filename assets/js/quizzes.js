import { DataStore } from "./apiAdapter.js";
import { Storage } from "./storage.js";
import { Progress } from "./progress.js";

function norm(x){ return (x || "").toString().trim().toLowerCase(); }

function quizAppliesToUser(quiz, user){
  const unitOk = !quiz.unit || norm(quiz.unit) === "geral" || norm(quiz.unit) === norm(user.unit);
  const sectorOk = !quiz.sector || norm(quiz.sector) === "geral" || norm(quiz.sector) === norm(user.sector);
  const jobOk = !quiz.jobTitles || quiz.jobTitles.length === 0 || quiz.jobTitles.map(norm).includes(norm(user.jobTitle));
  return unitOk && sectorOk && jobOk && quiz.active !== false;
}

function dueByRecurrence(quiz, user){
  if(quiz.kind !== "periodic") return false;
  const attempts = DataStore.progress.listQuizAttempts(user.id, quiz.id);
  if(attempts.length === 0) return true;

  const last = attempts[attempts.length - 1];
  const lastAt = new Date(last.finishedAt || last.startedAt || Date.now()).getTime();
  const days = Number(quiz.recurrenceDays || 0);
  if(!days) return false;

  const nextDue = lastAt + days * 24 * 60 * 60 * 1000;
  return Date.now() >= nextDue;
}

export const Quizzes = {
  listAll(){
    return DataStore.quizzes.list().slice();
  },

  listFinalForUser(user){
    const all = this.listAll().filter(q => q.kind === "final" && quizAppliesToUser(q, user));
    return all;
  },

  listPeriodicForUser(user){
    const all = this.listAll().filter(q => q.kind === "periodic" && quizAppliesToUser(q, user));
    return all;
  },

  finalIsUnlocked(user){
    const { percent } = Progress.getTrackStats(user);
    return percent >= 100;
  },

  pendingEvaluations(user){
    const pending = [];

    // final (pendente se liberado e nunca fez tentativa apta)
    const finals = this.listFinalForUser(user);
    if(this.finalIsUnlocked(user)){
      for(const q of finals){
        const atts = DataStore.progress.listQuizAttempts(user.id, q.id);
        const hasApto = atts.some(a => a.status === "Apto");
        if(!hasApto) pending.push({ quiz:q, reason:"final_liberado" });
      }
    }

    // periodic (pendente por recorrência)
    const periodic = this.listPeriodicForUser(user);
    for(const q of periodic){
      if(dueByRecurrence(q, user)) pending.push({ quiz:q, reason:"periodica_vencida" });
    }

    return pending;
  },

  startAttempt(){
    return { startedAt: Storage.nowISO() };
  },

  finishAttempt({ userId, quizId, answers, startedAt }){
    const quiz = DataStore.quizzes.getById(quizId);
    if(!quiz) return { ok:false, error:"Avaliação não encontrada." };

    const start = new Date(startedAt || Date.now()).getTime();
    const end = Date.now();
    const secondsSpent = Math.max(0, Math.round((end - start)/1000));

    let score = 0;
    const total = quiz.questions.length;

    const normalizedAnswers = answers || {};
    for(const q of quiz.questions){
      const picked = normalizedAnswers[q.id];
      if(picked === q.correctIndex) score += 1;
    }

    const percent = total === 0 ? 0 : Math.round((score/total)*100);
    const min = Number(quiz.minScorePercent || 0);
    const status = percent >= min ? "Apto" : "Não apto";

    const attempt = {
      score,
      total,
      percent,
      status,
      startedAt: startedAt || Storage.nowISO(),
      finishedAt: Storage.nowISO(),
      secondsSpent
    };

    DataStore.progress.addQuizAttempt(userId, quizId, attempt);
    return { ok:true, attempt, quiz };
  }
};
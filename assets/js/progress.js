import { DataStore } from "./apiAdapter.js";
import { Content } from "./content.js";

export const Progress = {
  getTrackStats(user){
    const track = Content.listMandatoryTrackForUser(user);
    const total = track.length;
    const done = track.filter(c => DataStore.progress.isContentDone(user.id, c.id)).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { track, total, done, percent };
  },

  nextMandatory(user, limit=5){
    const track = Content.listMandatoryTrackForUser(user);
    const pending = track.filter(c => !DataStore.progress.isContentDone(user.id, c.id));
    return pending.slice(0, limit);
  },

  markDone(userId, contentId, secondsSpent=0){
    return DataStore.progress.markContentDone(userId, contentId, { secondsSpent });
  },

  isDone(userId, contentId){
    return DataStore.progress.isContentDone(userId, contentId);
  }
};
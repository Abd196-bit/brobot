import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "./config.js";

function voteToRecord(messageId, vote) {
  return {
    messageId,
    theme: vote.theme,
    suggestedBy: vote.suggestedBy,
    createdAt: vote.createdAt,
    startDate: vote.startsAtLabel,
    endDate: vote.endsAtLabel,
    startsAt: vote.startsAt,
    endsAt: vote.endsAt,
    aye: [...vote.aye],
    nay: [...vote.nay],
    noOpinion: [...vote.noOpinion],
    updatedAt: new Date().toISOString()
  };
}

function getDatabase() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey
      })
    });
  }

  return getFirestore();
}

export async function saveVote(messageId, vote) {
  const database = getDatabase();
  await database.collection("votes").doc(messageId).set(voteToRecord(messageId, vote));
}

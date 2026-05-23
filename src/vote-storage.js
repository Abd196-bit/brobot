import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { config } from "./config.js";

function voteToRecord(messageId, vote) {
  return {
    messageId,
    theme: vote.theme,
    suggestedById: vote.suggestedById,
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

function voteFromRecord(record) {
  return {
    theme: record.theme,
    suggestedById: record.suggestedById,
    suggestedBy: record.suggestedBy,
    createdAt: record.createdAt,
    startsAt: record.startsAt,
    startsAtLabel: record.startDate,
    endsAt: record.endsAt,
    endsAtLabel: record.endDate,
    aye: new Set(record.aye ?? []),
    nay: new Set(record.nay ?? []),
    noOpinion: new Set(record.noOpinion ?? [])
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

export async function loadVote(messageId) {
  const database = getDatabase();
  const snapshot = await database.collection("votes").doc(messageId).get();

  if (!snapshot.exists) {
    return null;
  }

  return voteFromRecord(snapshot.data());
}

export async function findThemeSuggestionByUser(userId) {
  const database = getDatabase();
  const snapshot = await database
    .collection("votes")
    .where("suggestedById", "==", userId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];
  return {
    messageId: document.id,
    ...document.data()
  };
}

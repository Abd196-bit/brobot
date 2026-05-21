import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDirectory = path.join(process.cwd(), "data");
const votesFile = path.join(dataDirectory, "votes.txt");

function voteToRecord(messageId, vote) {
  return {
    messageId,
    theme: vote.theme,
    suggestedBy: vote.suggestedBy,
    createdAt: vote.createdAt,
    startDate: vote.startsAtLabel ?? "Now",
    endDate: vote.endsAtLabel ?? "No end date",
    startsAt: vote.startsAt,
    endsAt: vote.endsAt,
    aye: [...vote.aye],
    nay: [...vote.nay],
    noOpinion: [...vote.noOpinion]
  };
}

async function readVoteRecords() {
  try {
    const file = await readFile(votesFile, "utf8");
    return JSON.parse(file);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

export async function saveVote(messageId, vote) {
  await mkdir(dataDirectory, { recursive: true });

  const records = await readVoteRecords();
  records[messageId] = voteToRecord(messageId, vote);

  await writeFile(votesFile, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

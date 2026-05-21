import { readFile } from "node:fs/promises";
import path from "node:path";

const votePeriodFile = path.join(process.cwd(), "vote-period.txt");

export function parseVoteTime(value) {
  if (!value) {
    return null;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function formatVoteTime(date) {
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

export async function getVotePeriod() {
  const file = await readFile(votePeriodFile, "utf8");
  const values = Object.fromEntries(
    file
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [
          line.slice(0, separatorIndex).trim().toLowerCase(),
          line.slice(separatorIndex + 1).trim()
        ];
      })
  );

  const startsAt = parseVoteTime(values.from);
  const endsAt = parseVoteTime(values.to);

  if (!startsAt || !endsAt) {
    throw new Error("vote-period.txt must include valid from= and to= values.");
  }

  if (startsAt >= endsAt) {
    throw new Error("vote-period.txt to= value must be after from= value.");
  }

  return {
    startsAt: startsAt.getTime(),
    startsAtLabel: formatVoteTime(startsAt),
    endsAt: endsAt.getTime(),
    endsAtLabel: formatVoteTime(endsAt)
  };
}

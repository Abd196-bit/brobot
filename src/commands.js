import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder
} from "discord.js";
import { config } from "./config.js";
import { formatVoteTime, getVotePeriod } from "./vote-period.js";
import { saveVote } from "./vote-storage.js";

export const voteState = new Map();

const voteButtonPrefix = "bros-jam-vote";

function createVoteEmbed(vote) {
  const lines = [`Suggested by ${vote.suggestedBy} • ${vote.createdAt}`];

  if (vote.startsAt || vote.endsAt) {
    lines.push("");
    lines.push(`Voting opens: ${vote.startsAtLabel ?? "Now"}`);
    lines.push(`Voting closes: ${vote.endsAtLabel ?? "No close time"}`);
  }

  return new EmbedBuilder()
    .setColor(0x2f3136)
    .setTitle(vote.theme)
    .setDescription(lines.join("\n"));
}

function createVoteComponents(vote) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${voteButtonPrefix}:aye`)
        .setEmoji("👍")
        .setLabel(`Aye! ${vote.aye.size}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`${voteButtonPrefix}:nay`)
        .setEmoji("👎")
        .setLabel(`Nay! ${vote.nay.size}`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`${voteButtonPrefix}:no-opinion`)
        .setEmoji("✋")
        .setLabel(`No opinion. ${vote.noOpinion.size}`)
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function createVoteMessage(vote) {
  return {
    embeds: [createVoteEmbed(vote)],
    components: createVoteComponents(vote),
    allowedMentions: { parse: [] }
  };
}

export async function handleVoteButton(interaction) {
  if (!interaction.customId.startsWith(`${voteButtonPrefix}:`)) {
    return false;
  }

  const [, choice] = interaction.customId.split(":");
  const vote = voteState.get(interaction.message.id);

  if (!vote) {
    await interaction.reply({
      content: "This Bros Jam vote is no longer active.",
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (!["aye", "nay", "no-opinion"].includes(choice)) {
    await interaction.reply({
      content: "That vote button is not valid.",
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const now = Date.now();

  if (vote.startsAt && now < vote.startsAt) {
    await interaction.reply({
      content: `Voting is not open yet. It opens at ${vote.startsAtLabel}.`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (vote.endsAt && now > vote.endsAt) {
    await interaction.reply({
      content: `Voting is closed. It ended at ${vote.endsAtLabel}.`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  vote.aye.delete(interaction.user.id);
  vote.nay.delete(interaction.user.id);
  vote.noOpinion.delete(interaction.user.id);

  if (choice === "no-opinion") {
    vote.noOpinion.add(interaction.user.id);
  } else {
    vote[choice].add(interaction.user.id);
  }

  await interaction.update(createVoteMessage(vote));
  await saveVote(interaction.message.id, vote);
  return true;
}

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Check whether the bot is online."),
    async execute(interaction) {
      const latency = Date.now() - interaction.createdTimestamp;
      await interaction.reply(`Pong! Latency: ${latency}ms`);
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("help")
      .setDescription("Show available bot commands."),
    async execute(interaction) {
      await interaction.reply({
        content: [
          "**Available commands**",
          "`/ping` - Check whether the bot is online.",
          "`/vote theme:<theme>` - Suggest a Bros Jam theme using the period in vote-period.txt.",
          "`/help` - Show this command list."
        ].join("\n"),
        flags: MessageFlags.Ephemeral
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("vote")
      .setDescription("Start a vote.")
      .addStringOption((option) =>
        option
          .setName("theme")
          .setDescription("Theme to vote on.")
          .setRequired(true)
      ),
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const theme = interaction.options.getString("theme", true);
      let votePeriod;

      try {
        votePeriod = await getVotePeriod();
      } catch (error) {
        await interaction.editReply(error.message);
        return;
      }

      const suggestedBy =
        interaction.member?.displayName ??
        interaction.user.globalName ??
        interaction.user.username;
      const vote = {
        theme,
        suggestedBy,
        createdAt: formatVoteTime(new Date()),
        ...votePeriod,
        aye: new Set(),
        nay: new Set(),
        noOpinion: new Set()
      };

      let voteChannel;

      try {
        voteChannel = await interaction.client.channels.fetch(config.voteChannelId);
      } catch (error) {
        if (error.code === 50001) {
          await interaction.editReply(
            `I cannot access <#${config.voteChannelId}>. Give the bot View Channel and Send Messages permissions there, or set VOTE_CHANNEL_ID to a channel this bot can see.`
          );
          return;
        }

        throw error;
      }

      if (!voteChannel?.isTextBased()) {
        await interaction.editReply("The configured vote channel is not a text channel.");
        return;
      }

      const message = await voteChannel.send(createVoteMessage(vote));
      voteState.set(message.id, vote);
      await saveVote(message.id, vote);
      await interaction.editReply(`Posted the Bros Jam vote in ${voteChannel}.`);
    }
  }
];

export const commandData = commands.map((command) => command.data.toJSON());
export const commandMap = new Map(commands.map((command) => [command.data.name, command]));

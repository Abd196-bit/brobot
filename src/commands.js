import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";
import { config } from "./config.js";
import { formatVoteTime, getVotePeriod } from "./vote-period.js";
import { findThemeSuggestionByUser, loadVote, saveVote } from "./vote-storage.js";

export const voteState = new Map();

const voteButtonPrefix = "bros-jam-vote";

const tutorialTopics = {
  overview: {
    title: "Bros Jam tutorial",
    description: [
      "Bros Jam is a small game jam: pick a theme, build something around it, then share what you made.",
      "",
      "**1. Suggest a theme**",
      "Use `/vote theme:<theme>` to suggest one theme. Each user can suggest one theme.",
      "",
      "**2. Vote on themes**",
      "Click `Aye!`, `Nay!`, or `No opinion.` on theme posts. You can change your vote any time while voting is open.",
      "",
      "**3. Build your entry**",
      "When the jam starts, make a game, prototype, tool, or experiment inspired by the chosen theme.",
      "",
      "**4. Submit and share**",
      "Post your finished entry with a playable link, screenshots, and a short description."
    ].join("\n")
  },
  voting: {
    title: "Theme voting tutorial",
    description: [
      "Use `/vote theme:<theme>` to suggest a Bros Jam theme.",
      "",
      "Rules:",
      "- Each Discord user can suggest one theme.",
      "- Voting only counts during the period set in `vote-period.txt`.",
      "- Clicking a vote button moves your vote instead of adding duplicate votes.",
      "- `Aye!` means you like the theme, `Nay!` means you do not, and `No opinion.` means you are neutral."
    ].join("\n")
  },
  building: {
    title: "Building for the jam",
    description: [
      "Keep your scope small enough to finish.",
      "",
      "A solid jam plan:",
      "- Pick one core mechanic.",
      "- Make a playable version early.",
      "- Add art, sound, polish, and extra features after the core loop works.",
      "- Test the final build before submitting it.",
      "",
      "The goal is a finished playable entry, not a perfect one."
    ].join("\n")
  },
  submitting: {
    title: "Submitting your jam entry",
    description: [
      "When your entry is ready, share it in the jam channel.",
      "",
      "Include:",
      "- Entry title",
      "- Playable link or download link",
      "- Short description",
      "- Controls",
      "- Team members, if any",
      "- Screenshots or a short clip, if you have them"
    ].join("\n")
  }
};

function createTutorialEmbed(topic) {
  const tutorial = tutorialTopics[topic] ?? tutorialTopics.overview;

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(tutorial.title)
    .setDescription(tutorial.description);
}

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
  let vote = voteState.get(interaction.message.id);

  if (!vote) {
    vote = await loadVote(interaction.message.id);

    if (vote) {
      voteState.set(interaction.message.id, vote);
    }
  }

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
          "`/tutorial topic:<topic>` - Get a quick Bros Jam tutorial.",
          "`/clear message:<amount>` - Delete up to 100 recent messages from this channel. Admins only.",
          "`/help` - Show this command list."
        ].join("\n"),
        flags: MessageFlags.Ephemeral
      });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("clear")
      .setDescription("Delete recent messages from this channel. Admins only.")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addIntegerOption((option) =>
        option
          .setName("message")
          .setDescription("Number of recent messages to delete.")
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
      ),
    async execute(interaction) {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: "Only admins can use `/clear`.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (!interaction.appPermissions?.has(PermissionFlagsBits.ManageMessages)) {
        await interaction.reply({
          content: "I need the Manage Messages permission in this channel to clear messages.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (!interaction.channel || typeof interaction.channel.bulkDelete !== "function") {
        await interaction.reply({
          content: "`/clear` can only be used in a server text channel.",
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const amount = interaction.options.getInteger("message", true);
      const deletedMessages = await interaction.channel.bulkDelete(amount, true);
      const skipped = amount - deletedMessages.size;
      const skippedText = skipped > 0
        ? ` ${skipped} message(s) were skipped because Discord only bulk-deletes recent messages.`
        : "";

      await interaction.editReply(
        `Deleted ${deletedMessages.size} message(s) from this channel.${skippedText}`
      );
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName("tutorial")
      .setDescription("Get a Bros Jam tutorial.")
      .addStringOption((option) =>
        option
          .setName("topic")
          .setDescription("Tutorial topic to show.")
          .setRequired(false)
          .addChoices(
            { name: "Overview", value: "overview" },
            { name: "Theme voting", value: "voting" },
            { name: "Building", value: "building" },
            { name: "Submitting", value: "submitting" }
          )
      ),
    async execute(interaction) {
      const topic = interaction.options.getString("topic") ?? "overview";

      await interaction.reply({
        embeds: [createTutorialEmbed(topic)],
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
      const existingSuggestion = await findThemeSuggestionByUser(interaction.user.id);

      if (existingSuggestion) {
        await interaction.editReply(
          `You already suggested **${existingSuggestion.theme}**. Each user can suggest only one theme.`
        );
        return;
      }

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
        suggestedById: interaction.user.id,
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

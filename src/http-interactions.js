import { InteractionType, verifyKey } from "discord-interactions";
import { Events, MessageFlags, PermissionsBitField } from "discord.js";
import { commandMap, handleVoteButton } from "./commands.js";
import { config } from "./config.js";

const discordApiBase = "https://discord.com/api/v10";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForClientReady(client, timeoutMs = 30_000) {
  if (client.isReady()) {
    return Promise.resolve();
  }

  return Promise.race([
    new Promise((resolve) => client.once(Events.ClientReady, resolve)),
    wait(timeoutMs).then(() => {
      throw new Error("Timed out waiting for Discord gateway connection.");
    })
  ]);
}

function normalizeResponseData(data) {
  if (typeof data === "string") {
    return { content: data };
  }

  return {
    ...data,
    embeds: data.embeds?.map((embed) => embed.toJSON?.() ?? embed),
    components: data.components?.map((component) => component.toJSON?.() ?? component)
  };
}

function createFirstResponseController() {
  let resolveFirstResponse;
  const firstResponse = new Promise((resolve) => {
    resolveFirstResponse = resolve;
  });

  return {
    firstResponse,
    resolveFirstResponse
  };
}

function createHttpUser(rawUser) {
  return {
    id: rawUser.id,
    username: rawUser.username,
    globalName: rawUser.global_name,
    tag: rawUser.discriminator && rawUser.discriminator !== "0"
      ? `${rawUser.username}#${rawUser.discriminator}`
      : rawUser.username,
    createdAt: new Date(Number((BigInt(rawUser.id) >> 22n) + 1420070400000n)),
    displayAvatarURL({ size = 256 } = {}) {
      if (!rawUser.avatar) {
        const defaultAvatar = Number(rawUser.discriminator ?? 0) % 5;
        return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar}.png`;
      }

      return `https://cdn.discordapp.com/avatars/${rawUser.id}/${rawUser.avatar}.png?size=${size}`;
    }
  };
}

function createOptions(data) {
  const optionMap = new Map((data.options ?? []).map((option) => [option.name, option]));

  return {
    get(name, required = false) {
      const option = optionMap.get(name);

      if (!option && required) {
        throw new Error(`Missing required option: ${name}`);
      }

      return option ?? null;
    },
    getString(name, required = false) {
      const option = this.get(name, required);
      return option?.value ?? null;
    },
    getInteger(name, required = false) {
      const option = this.get(name, required);
      return option?.value ?? null;
    },
    getUser(name, required = false) {
      const option = this.get(name, required);
      const rawUser = data.resolved?.users?.[option?.value];
      return rawUser ? createHttpUser(rawUser) : null;
    },
    getMember(name, required = false) {
      const option = this.get(name, required);
      const rawMember = data.resolved?.members?.[option?.value];
      const rawUser = data.resolved?.users?.[option?.value];

      if (!rawMember && required) {
        throw new Error(`Missing required member: ${name}`);
      }

      return rawMember ? {
        id: option.value,
        displayName: rawMember.nick ?? rawUser?.global_name ?? rawUser?.username,
        joinedAt: rawMember.joined_at ? new Date(rawMember.joined_at) : null,
        user: rawUser ? createHttpUser(rawUser) : null
      } : null;
    }
  };
}

async function sendWebhookMessage(interaction, method, path, data) {
  const response = await fetch(
    `${discordApiBase}/webhooks/${config.clientId}/${interaction.token}${path}`,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalizeResponseData(data))
    }
  );

  if (!response.ok) {
    throw new Error(`Discord webhook request failed: ${response.status} ${await response.text()}`);
  }

  return response;
}

function createHttpInteraction(payload, client, responseController) {
  const rawUser = payload.member?.user ?? payload.user;
  let initialResponseSent = false;
  let deferred = false;

  async function sendInitial(type, data = {}) {
    if (initialResponseSent) {
      return false;
    }

    initialResponseSent = true;
    responseController.resolveFirstResponse({
      type,
      data: normalizeResponseData(data)
    });
    return true;
  }

  return {
    id: payload.id,
    token: payload.token,
    commandName: payload.data?.name,
    customId: payload.data?.custom_id,
    createdTimestamp: Date.now(),
    client,
    guild: client.guilds.cache.get(payload.guild_id),
    guildId: payload.guild_id,
    channel: client.channels.cache.get(payload.channel_id),
    channelId: payload.channel_id,
    user: createHttpUser(rawUser),
    member: payload.member ? {
      id: rawUser.id,
      displayName: payload.member.nick ?? rawUser.global_name ?? rawUser.username,
      joinedAt: payload.member.joined_at ? new Date(payload.member.joined_at) : null,
      user: createHttpUser(rawUser)
    } : null,
    message: payload.message,
    options: createOptions(payload.data ?? {}),
    memberPermissions: payload.member?.permissions
      ? new PermissionsBitField(BigInt(payload.member.permissions))
      : null,
    appPermissions: payload.app_permissions
      ? new PermissionsBitField(BigInt(payload.app_permissions))
      : null,
    replied: false,
    get deferred() {
      return deferred;
    },
    isButton() {
      return payload.type === InteractionType.MESSAGE_COMPONENT;
    },
    isChatInputCommand() {
      return payload.type === InteractionType.APPLICATION_COMMAND;
    },
    async deferReply(data = {}) {
      deferred = true;
      this.replied = true;
      await sendInitial(5, data);
    },
    async reply(data) {
      this.replied = true;

      if (deferred || initialResponseSent) {
        await this.editReply(data);
        return;
      }

      await sendInitial(4, data);
    },
    async editReply(data) {
      this.replied = true;
      await sendWebhookMessage(this, "PATCH", "/messages/@original", data);
    },
    async followUp(data) {
      await sendWebhookMessage(this, "POST", "", data);
    },
    async update(data) {
      this.replied = true;

      if (!initialResponseSent) {
        await sendInitial(7, data);
        return;
      }

      await sendWebhookMessage(this, "PATCH", `/messages/${this.message.id}`, data);
    },
    async forceDefer() {
      if (!initialResponseSent) {
        deferred = true;
        this.replied = true;
        await sendInitial(5, { flags: MessageFlags.Ephemeral });
      }
    }
  };
}

function shouldWaitForGateway(commandName) {
  return !["ping", "help", "coinflip", "roll", "tutorial", "joinmusic"].includes(commandName);
}

export async function handleDiscordInteraction(payload, client) {
  if (payload.type === InteractionType.PING) {
    return { type: 1 };
  }

  const responseController = createFirstResponseController();
  const interaction = createHttpInteraction(payload, client, responseController);

  const execution = (async () => {
    if (interaction.isButton()) {
      await waitForClientReady(client);
      await handleVoteButton(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) {
      await interaction.reply({
        content: "Unsupported interaction type.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const command = commandMap.get(interaction.commandName);

    if (!command) {
      await interaction.reply({
        content: "Unknown command.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!client.isReady() && shouldWaitForGateway(interaction.commandName)) {
      await interaction.forceDefer();
      await waitForClientReady(client);
    }

    await command.execute(interaction);
  })();

  execution.catch(async (error) => {
    console.error("HTTP interaction error:", error);

    const response = {
      content: "Something went wrong while running that command.",
      flags: MessageFlags.Ephemeral
    };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(response);
      } else {
        await interaction.reply(response);
      }
    } catch (replyError) {
      console.error("Failed to send HTTP interaction error response:", replyError);
    }
  });

  const timeoutResponse = wait(2_500).then(async () => {
    await interaction.forceDefer();
    return responseController.firstResponse;
  });

  return Promise.race([responseController.firstResponse, timeoutResponse]);
}

export function verifyDiscordInteractionRequest(request, rawBody) {
  if (!config.publicKey) {
    throw new Error("Missing DISCORD_PUBLIC_KEY for HTTP interactions.");
  }

  const signature = request.headers["x-signature-ed25519"];
  const timestamp = request.headers["x-signature-timestamp"];

  return verifyKey(rawBody, signature, timestamp, config.publicKey);
}

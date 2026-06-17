import http from "node:http";
import { handleVoteButton, commandMap } from "./commands.js";

// Mock interaction object so your existing commands.js functions still work without breaking
function createMockInteraction(reqBody) {
  return {
    commandName: reqBody.commandName,
    customId: reqBody.customId,
    options: {
      get: (key) => reqBody.options?.[key] || null,
      getString: (key) => reqBody.options?.[key] || null,
      getInteger: (key) => reqBody.options?.[key] || null,
      getMember: (key) => reqBody.options?.[key] || null,
    },
    user: { id: reqBody.userId, username: reqBody.username },
    member: { id: reqBody.userId },
    guild: { id: reqBody.guildId },
    isButton: () => !!reqBody.customId,
    isChatInputCommand: () => !!reqBody.commandName,
    deferred: false,
    replied: false,
    reply: async (data) => { return data; },
    followUp: async (data) => { return data; }
  };
}

const welcomeMessages = [
  "hi {user}, hope you brought pizza.",
  "yo {user}, the server just got better.",
  "welcome {user}, excellent choice showing up here.",
  "hey {user}, your timing is suspiciously perfect.",
  "hi {user}, grab a seat and pretend you know what's going on."
];

const server = http.createServer(async (request, response) => {
  // 1. Health check route for Render monitoring
  if (request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }

  // 2. Endpoint for Welcome Messages module
  if (request.url === "/api/welcome" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const data = JSON.parse(body);

    const message = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    const cleanMessage = message.replace("{user}", `<@${data.userId}>`);

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ content: cleanMessage }));
    return;
  }

  // 3. Endpoint for BotGhost Slash Commands & Interactive Buttons
  if (request.url === "/api/interaction" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    const reqData = JSON.parse(body);

    const mockInteraction = createMockInteraction(reqData);
    let executionResult = { content: "Action executed successfully." };

    try {
      if (mockInteraction.isButton()) {
        // Run your existing button handler logic
        await handleVoteButton(mockInteraction);
      } else if (mockInteraction.isChatInputCommand()) {
        const command = commandMap.get(mockInteraction.commandName);
        if (command) {
          // Run your existing command logic (Firebase saves occur inside command.execute)
          await command.execute(mockInteraction);
        } else {
          executionResult = { content: "Unknown command on local engine." };
        }
      }
    } catch (error) {
      console.error("Backend processing error:", error);
      executionResult = { content: "Something went wrong inside the JS backend processing script." };
    }

    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(executionResult));
    return;
  }

  // Default Fallback Route
  response.writeHead(404, { "Content-Type": "text/plain" });
  response.end("Route not found.");
});

const port = process.env.PORT ?? 3000;
server.listen(port, () => {
  console.log(`Bro Bot API Engine active on port ${port}`);
});

require("dotenv").config();

const { Client, GatewayIntentBits } = require("@jubbio/core");
const play = require("play-dl");

// TimeoutNegativeWarning'i gizle (@jubbio/voice internal)
const originalEmit = process.emit.bind(process);
process.emit = function(event, ...args) {
  if (event === "warning" && args[0]?.name === "TimeoutNegativeWarning") return false;
  return originalEmit(event, ...args);
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

(async () => {
  try {
    const clientId = await play.getFreeClientID();
    await play.setToken({ soundcloud: { client_id: clientId } });
    console.log("✅ SoundCloud client_id alındı");
  } catch (err) {
    console.error("❌ SoundCloud client_id alınamadı:", err.message);
  }
})();

const fs = require("fs");
client.commands = new Map();
client.voiceStates = new Map();

const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(client, message, args);
  } catch (err) {
    console.error("❌ Komut hatası:", err.message);
    message.reply("❌ Hata oluştu.");
  }
});

client.once("ready", async () => {
  console.log(`✅ Bot hazır! Kullanıcı: ${client.user.username}`);

  try {
    for (const guild of client.guilds.values()) {
      const voiceStates = await client.rest.request("GET", `/bot/guilds/${guild.id}/voice-states`).catch(() => null);
      if (!voiceStates) continue;
      const list = Array.isArray(voiceStates) ? voiceStates : (voiceStates.data || []);
      for (const vs of list) {
        const userId = vs.userId || vs.user_id;
        const channelId = vs.channelId || vs.channel_id;
        if (userId && channelId) client.voiceStates.set(userId, channelId);
      }
    }
    console.log(`✅ Ses durumları yüklendi (${client.voiceStates.size} kullanıcı)`);
  } catch (err) {
    console.error("⚠️ Ses durumları yüklenemedi:", err.message);
  }
});

client.on("voiceStateUpdate", (oldState, newState) => {
  const userId = newState?.userId || newState?.user_id;
  const channelId = newState?.channelId || newState?.channel_id;
  if (!userId) return;
  if (channelId) {
    client.voiceStates.set(userId, channelId);
  } else {
    client.voiceStates.delete(userId);
  }
});

client.on("disconnect", () => {
  console.log("⚠️ Bağlantı kesildi, yeniden bağlanıyor...");
});

client.on("error", (err) => {
  console.error("❌ Bot hatası:", err.message);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Beklenmeyen hata:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ İşlenmemiş promise hatası:", err?.message || err);
});

client.login(process.env.BOT_TOKEN);

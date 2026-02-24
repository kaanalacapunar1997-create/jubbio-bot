require("dotenv").config();

const { Client, GatewayIntentBits } = require("@jubbio/core");
const play = require("play-dl");

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
const path = require("path");
client.commands = new Map();
client.voiceStates = new Map();

// #1 fix: path traversal — sadece basit .js dosyalarını yükle
const commandFiles = fs.readdirSync("./commands").filter(f => /^[^/\\]+\.js$/.test(f));
for (const file of commandFiles) {
  const safePath = path.resolve(__dirname, "commands", file);
  if (!safePath.startsWith(path.resolve(__dirname, "commands"))) continue;
  const command = require(safePath);
  if (command.name) client.commands.set(command.name, command);
}

// Jubbio gateway duplicate event koruması
const processedMessages = new Set();

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  // Aynı mesaj ID'si tekrar gelirse işleme
  if (message.id && processedMessages.has(message.id)) return;
  if (message.id) {
    processedMessages.add(message.id);
    setTimeout(() => processedMessages.delete(message.id), 10000);
  }

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(client, message, args);
  } catch (err) {
    // #2 fix: tam hata nesnesi logla
    console.error("❌ Komut hatası:", err);
    // #3 fix: await ekle
    await message.reply("❌ Hata oluştu.").catch(() => {});
  }
});

client.once("ready", async () => {
  console.log(`✅ Bot hazır! Kullanıcı: ${client.user.username}`);

  try {
    // #4 fix: optional chaining ile null güvenliği
    const guilds = client.guilds?.values ? client.guilds.values() : [];
    for (const guild of guilds) {
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

client.on("debug", (msg) => {
  console.log("[DEBUG]", msg);
});

client.on("error", (err) => {
  console.error("❌ Bot hatası:", err.message);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Beklenmeyen hata:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ İşlenmemiş promise hatası:", err?.message || err);
});

client.login(process.env.BOT_TOKEN);

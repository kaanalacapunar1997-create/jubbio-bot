require("dotenv").config();
const { Client, GatewayIntentBits } = require("@jubbio/core");
const RSSParser = require("rss-parser");

// #20 fix: hardcoded fallback kaldırıldı, env zorunlu
const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID;
if (!ANNOUNCE_CHANNEL_ID) {
  console.error("❌ ANNOUNCE_CHANNEL_ID environment variable eksik!");
  process.exit(1);
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

const YOUTUBE_CHANNELS = [
  { id: "UCiK2XqGgeptbWfLJ0Eb777Q", name: "CyberRulzTv" }
];

const rss = new RSSParser();
const lastVideoIds = {};

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

async function checkChannel(channel) {
  try {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
    const feed = await rss.parseURL(feedUrl);

    if (!feed.items || feed.items.length === 0) return;

    const latest = feed.items[0];

    // #17 fix: `yt:video:VIDEO_ID` formatından gerçek video ID çıkar
    const videoId = latest.id?.split(":").pop() || latest.link;

    if (!videoId) {
      console.warn(`[${channel.name}] Video ID alinamadi.`);
      return;
    }

    if (lastVideoIds[channel.id] === undefined) {
      lastVideoIds[channel.id] = videoId;
      console.log(`✅ [${channel.name}] İlk kontrol: ${latest.title}`);
      return;
    }

    if (videoId !== lastVideoIds[channel.id]) {
      lastVideoIds[channel.id] = videoId;

      await client.rest.request(
        "POST",
        `/bot/channels/${ANNOUNCE_CHANNEL_ID}/messages`,
        { content: `🎥 **${channel.name} yeni video yükledi!**\n**${latest.title}**\n${latest.link}` }
      );

      console.log(`📢 [${channel.name}] Duyuru gönderildi: ${latest.title}`);
    }
  } catch (err) {
    console.error(`❌ [${channel.name}] kontrol hatası:`, err.message);
  }
}

async function checkAll() {
  await Promise.all(YOUTUBE_CHANNELS.map(channel => checkChannel(channel)));
}

// #18 fix: boş messageCreate listener kaldırıldı

client.once("ready", () => {
  console.log(`✅ Duyuru botu hazır: ${client.user.username}`);
  console.log(`📡 ${YOUTUBE_CHANNELS.length} kanal takip ediliyor`);
  checkAll();
  // #19 fix: interval referansı saklanıyor
  const intervalId = setInterval(checkAll, CHECK_INTERVAL_MS);

  process.on("SIGTERM", () => {
    clearInterval(intervalId);
    process.exit(0);
  });
  process.on("SIGINT", () => {
    clearInterval(intervalId);
    process.exit(0);
  });
});

client.on("error", (err) => {
  console.error("❌ Bot hatası:", err.message);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Beklenmeyen hata:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ İşlenmemiş hata:", err?.message || err);
});

client.login(process.env.BOT_TOKEN);

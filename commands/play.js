const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} = require("@jubbio/voice");
const play = require("play-dl");
const { spawn } = require("child_process");

module.exports = {
  name: "play",

  async execute(client, message, args) {

    if (!args[0]) {
      return message.reply("❌ YouTube linki veya .mp3 linki gir.");
    }

    const url = args[0];

    // #5 fix: hardcoded kanal ID kaldırıldı — kullanıcı ses kanalında değilse hata ver
    const userChannelId = client.voiceStates.get(message.author.id)
      || message.member?.voice?.channelId;

    if (!userChannelId) {
      return message.reply("❌ Önce bir ses kanalına gir.");
    }

    if (!client.music) client.music = {};

    if (!client.music[message.guildId]) {
      client.music[message.guildId] = {
        connection: null,
        player: null
      };
    }

    const musicData = client.music[message.guildId];

    if (!musicData.connection || musicData.connection.state?.status === "destroyed") {
      musicData.connection = joinVoiceChannel({
        channelId: userChannelId,
        guildId: message.guildId,
        adapterCreator: client.voice?.adapters?.get(message.guildId)
      });
      musicData.player = null;
    }

    if (!musicData.player) {
      musicData.player = createAudioPlayer();
      musicData.connection.subscribe(musicData.player);
    }

    let resource;

    // #10 fix: SSRF — sadece http/https URL'lerine izin ver
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return message.reply("❌ Geçersiz link. Yalnızca http/https linkleri desteklenir.");
    }

    if (url.endsWith(".mp3")) {
      resource = createAudioResource(url);
      message.reply("🎵 MP3 çalıyor!");
    } else {
      const validated = play.yt_validate(url);

      // #6 fix: playlist uyarısı
      if (validated === "playlist") {
        return message.reply("❌ Playlist desteklenmiyor. Tek video linki gir.");
      }

      if (validated !== "video") {
        return message.reply("❌ Geçersiz link. YouTube veya .mp3 linki gir.");
      }

      try {
        const ytMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const videoUrl = ytMatch
          ? `https://www.youtube.com/watch?v=${ytMatch[1]}`
          : url;

        // #7 fix: titleProc hata yönetimi — error event + stderr dinleniyor
        const title = await new Promise((resolve) => {
          const titleProc = spawn("yt-dlp", ["--get-title", "--no-playlist", videoUrl]);
          let out = "";
          titleProc.stdout.on("data", d => { out += d.toString(); });
          titleProc.stderr.on("data", () => {});
          titleProc.on("error", () => resolve("Bilinmeyen"));
          titleProc.on("close", () => resolve(out.trim() || "Bilinmeyen"));
        });

        // #8 fix: değişken shadowing — iç değişken `audioUrl` olarak yeniden adlandırıldı
        const audioUrl = await new Promise((resolve, reject) => {
          const proc = spawn("yt-dlp", [
            "-f", "140/bestaudio[protocol!=m3u8][protocol!=m3u8_native]",
            "--no-playlist",
            "--get-url",
            videoUrl
          ]);
          let out = "";
          const timeout = setTimeout(() => {
            proc.kill();
            reject(new Error("Zaman aşımı: yt-dlp 30s içinde yanıt vermedi"));
          }, 30000);
          proc.stdout.on("data", d => { out += d.toString(); });
          proc.stderr.on("data", () => {});
          proc.on("error", (err) => { clearTimeout(timeout); reject(err); });
          proc.on("close", code => {
            clearTimeout(timeout);
            const resolvedUrl = out.trim().split("\n")[0];
            if (resolvedUrl) resolve(resolvedUrl);
            else reject(new Error("URL alınamadı"));
          });
        });

        resource = createAudioResource(audioUrl);
        message.reply(`🎵 Çalıyor: **${title}**`);
      } catch (err) {
        console.error("YouTube hata:", err);
        return message.reply("❌ YouTube videosu yüklenemedi.");
      }
    }

    musicData.player.play(resource);

    // #9 fix: listener leak — önceki listener'ları temizle
    musicData.player.removeAllListeners(AudioPlayerStatus.Idle);
    musicData.player.once(AudioPlayerStatus.Idle, () => {
      console.log("🎵 Şarkı bitti.");
    });
  }
};

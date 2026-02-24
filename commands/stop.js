module.exports = {
  name: "stop",

  async execute(client, message) {

    const musicData = client.music?.[message.guildId];

    if (!musicData || !musicData.player) {
      return message.reply("❌ Çalan müzik yok.");
    }

    // #11 fix: player zaten durmuşsa gereksiz stop çağrısından kaçın
    try {
      musicData.player.stop();
    } catch (err) {
      console.error("Stop hatası:", err.message);
    }

    await message.reply("⏹️ Müzik durduruldu.");
  }
};

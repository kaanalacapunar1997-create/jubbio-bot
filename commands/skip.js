module.exports = {
  name: "skip",

  async execute(client, message) {

    const musicData = client.music?.[message.guildId];
    if (!musicData || !musicData.player) return message.reply("❌ Çalan müzik yok.");

    // #12 not: Kuyruk sistemi olmadığından skip = durdur
    try {
      musicData.player.stop();
    } catch (err) {
      console.error("Skip hatası:", err.message);
    }

    await message.reply("⏭️ Şarkı geçildi.");
  }
};

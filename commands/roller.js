module.exports = {
  name: "roller",

  async execute(client, message) {

    const guildId = message.guildId;

    try {
      const response = await client.rest.request(
        "GET",
        `/bot/guilds/${guildId}/roles`
      );

      const roles = Array.isArray(response)
        ? response
        : response.data || response.roles || [];

      if (roles.length === 0) {
        return message.reply("Sunucuda hiç rol bulunamadı.");
      }

      let list = roles
        .filter(r => r.name !== "@everyone" && r.name !== "all")
        .map(r => `• ${r.name}`)
        .join("\n");

      // #15 fix: 2000 karakter limitini aşarsa kırp
      if (list.length > 1800) {
        list = list.slice(0, 1800) + "\n...";
      }

      await message.reply(`**Sunucu Rolleri:**\n${list}`);

    } catch (err) {
      console.error("ROL HATA:", err);
      await message.reply("❌ Roller alınırken hata oluştu.");
    }
  }
};

module.exports = {
  name: "seskanal",

  async execute(client, message, args) {
    if (!message.member?.permissions?.has("Administrator")) {
      return message.reply("❌ Bu komutu kullanmak için Yönetici yetkisi gerekiyor.");
    }

    if (!args[0]) {
      const current = client.defaultVoiceChannels?.get(message.guildId);
      return message.reply(current
        ? `📢 Varsayılan ses kanalı: \`${current}\``
        : "❌ Henüz bir ses kanalı ayarlanmadı. Kullanım: `!seskanal <kanal_id>`"
      );
    }

    if (!client.defaultVoiceChannels) client.defaultVoiceChannels = new Map();
    client.defaultVoiceChannels.set(message.guildId, args[0]);
    await message.reply(`✅ Varsayılan ses kanalı \`${args[0]}\` olarak ayarlandı.`);
  }
};

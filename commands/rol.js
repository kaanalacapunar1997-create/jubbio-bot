module.exports = {
  name: "rol",

  async execute(client, message, args) {

    if (args.length < 2) {
      return message.reply("Kullanım: !rol @kullanıcı <rol adı>");
    }

    const userMention = args[0];

    // #13 fix: mention formatını doğrula
    if (!/^<@!?\d+>$/.test(userMention)) {
      return message.reply("❌ Geçerli bir kullanıcı mention'ı gir. Örnek: !rol @kullanıcı Çırak");
    }

    const userId = userMention.replace(/[<@!>]/g, "");
    const roleName = args.slice(1).join(" ").toLowerCase();

    try {
      const response = await client.rest.request(
        "GET",
        `/bot/guilds/${message.guildId}/roles`
      );

      const roles = Array.isArray(response)
        ? response
        : response.data || response.roles || [];

      // #14 fix: regex'te karakter sınıfı içindeki | kaldırıldı, düzgün unicode emoji regex
      const stripEmoji = str => str
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
        .replace(/[\u{2600}-\u{27BF}]/gu, "")
        .replace(/\uFE0F/gu, "")
        .replace(/\u200D/gu, "")
        .trim()
        .toLowerCase();

      const role = roles.find(r =>
        stripEmoji(r.name) === stripEmoji(roleName) ||
        r.name.toLowerCase().includes(roleName)
      );

      if (!role) {
        return message.reply(`❌ "${args.slice(1).join(" ")}" adında bir rol bulunamadı.`);
      }

      await client.rest.request(
        "PUT",
        `/bot/guilds/${message.guildId}/members/${userId}/roles/${role.id}`
      );

      await message.reply(`✅ <@${userId}> kullanıcısına **${role.name}** rolü verildi.`);

    } catch (err) {
      console.error("ROL HATASI:", err);
      await message.reply("❌ Rol verilemedi.");
    }
  }
};

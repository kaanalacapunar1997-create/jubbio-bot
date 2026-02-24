module.exports = {
  name: "yardim",

  async execute(client, message) {

    const helpMessage = `
**🎵 Müzik Komutları**

!play <youtube linki> — YouTube videosu çalar
!play <mp3 linki> — MP3 çalar
!pause — Müziği duraklatır
!resume — Müziği devam ettirir
!skip — Şarkıyı geçer
!stop — Müziği tamamen durdurur
!leave — Ses kanalından çıkar

**👑 Rol Komutları**

!roller — Sunucudaki rolleri listeler
!rol @kullanıcı <rol adı> — Kullanıcıya rol verir

**⚙️ Diğer**

!ping — Bot gecikmesini gösterir
!yardim — Bu menüyü gösterir
`;

    message.reply(helpMessage);
  }
};

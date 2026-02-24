module.exports = {
  name: "ping",

  async execute(client, message) {
    const before = Date.now();
    const msg = await message.reply("🏓 Pong!");
    const latency = Date.now() - before;
    await msg.edit(`🏓 Pong! Gecikme: **${latency}ms**`).catch(() => {});
  }
};

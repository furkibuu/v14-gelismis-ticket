const client = require("..")
const { ActivityType } = require("discord.js");


client.on("clientReady", () => {
    console.log(`${client.user.globalName} olarak giriş yapıldı!`);
  client.user.setActivity({
    name: `Fairs Development`,
    type: ActivityType.Watching,
  });
});



require('dotenv').config({ path: '.env' });
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const { readdirSync } = require("fs");
const IncludedIntents = Object.values(GatewayIntentBits).reduce((acc, val) => acc | val, 0);
const client = new Client({
  intents: IncludedIntents,
});
module.exports = client;
client.setMaxListeners(0); 
client.slashCommands = new Collection();

readdirSync('./handlers').forEach(handler => {
  require(`./handlers/${handler}`)(client);
});


client.login(process.env.Token)
  .then(() => {
    console.log("✅ Token geçerli, bot başlatıldı.");
  })
  .catch((err) => {
    console.error("❌ Bot token hatalı veya bağlantı kurulamadı:", err);
  });


client.on('ready', () => {
  console.log(`${client.user.tag} aktif!`);
});

 client.on("error", (error) => logError(client, "❌ Bot Hatası", error));
        client.on("warn", (warning) => logError(client, "⚠️ Uyarı!", warning));
        process.on("unhandledRejection", (reason, promise) => logError(client, "⚠️ Yakalanmamış Promise Hatasi!", reason));
        process.on("uncaughtException", (error) => logError(client, "❌ Beklenmeyen Hata!", error));
        process.on("uncaughtExceptionMonitor", (error) => logError(client, "❗️ Beklenmeyen Hata Monitörü!", error));
        function logError(client, title, error) {
            console.error(error);
        
        }


        
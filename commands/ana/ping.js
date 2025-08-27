const { ApplicationCommandType, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Botun pingini gösterir. ',
    type: ApplicationCommandType.ChatInput,
    cooldown: 3000,
    run: async (client, interaction) => {
        

        let start = Date.now();
        

        
       var pingmesaj = `🏓\`Botun pingi\`: **${client.ws.ping}ms**\n 🗨️\`Mesaj gecikmesi\`: **${Date.now() - start}ms**`

        let ping = new EmbedBuilder()
            .setAuthor({ name:  "Botun geçikmesi", iconURL: client.user.avatarURL() })
            .setColor("Random")
            .setDescription(pingmesaj)
            .setThumbnail(`https://media.tenor.com/HnrxKZN0-iIAAAAM/discord-ping.gif`)
            .setTimestamp()
            .setFooter({text: `Bot geçikme değeleri`, iconURL: interaction.user.avatarURL() });
         await interaction.deferReply()
        interaction.editReply({ embeds: [ping] });
    }
};

const { EmbedBuilder, Collection, PermissionsBitField , StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuOptionBuilder} = require('discord.js');
const ms = require('ms');
const client = require('..');
const cooldown = new Collection();

client.on('interactionCreate', async interaction => {
    const lang = interaction.locale === "tr" ? "tr" : "en";

    
    if (interaction.isAutocomplete()) {
        const slashCommand = client.slashCommands.get(interaction.commandName);
        if (slashCommand && slashCommand.autocomplete) {
            const choices = [];
            await slashCommand.autocomplete(interaction, choices);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const slashCommand = client.slashCommands.get(interaction.commandName);
    if (!slashCommand) return client.slashCommands.delete(interaction.commandName);

    try {
        
        if (slashCommand.ownerOnly && !process.env.OWNERID.split(',').includes(interaction.user.id)) {
            return interaction.reply({
                content: lang === "tr" ? `> ❌ Bu komut sadece geliştiricilere özeldir.` : `> ❌ This command is developer-only.`,
                ephemeral: true
            });
        }

     
        if (slashCommand.vote && !process.env.OWNERID.split(',').includes(interaction.user.id)) {
           
            const voted = await client.hasVoted(interaction.user.id); 
            if (!voted) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Red')
                            .setDescription(lang === "tr"
                                ? `> 🔒 Bu komutu kullanmak için önce [oy vermelisin](https://top.gg/bot/${client.user.id}/vote)`
                                : `> 🔒 You must [vote](https://top.gg/bot/${client.user.id}/vote) to use this command.`)
                    ],
                    ephemeral: true
                });
            }
        }

        if (slashCommand.cooldown) {
            const key = `slash-${slashCommand.name}-${interaction.user.id}`;
            const timeLeft = cooldown.get(key);
            if (timeLeft && Date.now() < timeLeft) {
                const remaining = ms(timeLeft - Date.now(), { long: true });
                return interaction.reply({
                    content: lang === "tr"
                        ? `> 🕐 Bu komutu tekrar kullanmak için \`${remaining}\` beklemelisin.`
                        : `> 🕐 Please wait \`${remaining}\` before using this command again.`,
                    ephemeral: true
                });
            } else {
                cooldown.set(key, Date.now() + slashCommand.cooldown);
                setTimeout(() => cooldown.delete(key), slashCommand.cooldown);
            }
        }

        
        if (slashCommand.userPerms || slashCommand.botPerms) {
            const missingUserPerms = !interaction.member.permissions.has(PermissionsBitField.resolve(slashCommand.userPerms || []));
            const missingBotPerms = !interaction.guild.members.me.permissions.has(PermissionsBitField.resolve(slashCommand.botPerms || []));

            if (missingUserPerms) {
                const perms = Array.isArray(slashCommand.userPerms) ? slashCommand.userPerms.join(', ') : slashCommand.userPerms;
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Red')
                            .setDescription(lang === "tr"
                                ? `🚫 ${interaction.user}, bu komutu kullanmak için \`${perms}\` yetkisine sahip olmalısın.`
                                : `🚫 ${interaction.user}, you need \`${perms}\` permission(s) to use this command.`)
                    ],
                    ephemeral: true
                });
            }

            if (missingBotPerms) {
                const perms = Array.isArray(slashCommand.botPerms) ? slashCommand.botPerms.join(', ') : slashCommand.botPerms;
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Red')
                            .setDescription(lang === "tr"
                                ? `🚫 ${interaction.user}, bu komutu çalıştırmak için benim \`${perms}\` yetkisine ihtiyacım var.`
                                : `🚫 ${interaction.user}, I need \`${perms}\` permission(s) to run this command.`)
                    ],
                    ephemeral: true
                });
            }
        }

        await slashCommand.run(client, interaction);

    } catch (err) {
        console.error(err);
        return interaction.reply({
            content: lang === "en" ? "An error occurred!" : "Bir hata oluştu!",
            ephemeral: true
        });
    }
});



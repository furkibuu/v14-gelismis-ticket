const client = require("..");
const {
    Events,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChannelType,
    PermissionsBitField,
    AttachmentBuilder
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");


const db = new Database("tickets.db");

db.prepare(`
    CREATE TABLE IF NOT EXISTS tickets (
        channelId TEXT PRIMARY KEY,
        userId TEXT,
        yetkiliId TEXT,
        category TEXT,
        createdAt INTEGER
    )
`).run();

const YETKILI_ROL_ID = process.env.YETKILI_ROL_ID;
const LOG_KANAL_ID = process.env.LOG_KANAL_ID;
const CATEGORY_ID = process.env.CATEGORY_ID;

const ticketData = new Map();


client.on(Events.InteractionCreate, async interaction => {

    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
        await interaction.deferReply({ ephemeral: true });

        const value = interaction.values[0];
        const guild = interaction.guild;
        const member = interaction.member;

        const channelName = `ticket-${member.user.username}-${value}`;
        const existingChannel = guild.channels.cache.find(
            ch => ch.name === channelName && ch.type === ChannelType.GuildText
        );
        if (existingChannel) {
            return interaction.editReply({
                content: `❌ Zaten bir ticket'in var: ${existingChannel}`
            });
        }

        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID || null,
            permissionOverwrites: [
                { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                {
                    id: member.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }
            ]
        });

        const yetkiliRol = guild.roles.cache.get(YETKILI_ROL_ID);
        const yetkililer = yetkiliRol?.members.map(m => m.user) || [];
        const atanan = yetkililer[Math.floor(Math.random() * yetkililer.length)];

        if (!atanan) {
            return interaction.editReply({
                content: "❌ Atanacak yetkili bulunamadı!"
            });
        }

        await channel.permissionOverwrites.create(atanan.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true
        });

        ticketData.set(channel.id, { user: member.id, yetkili: atanan.id });


        db.prepare(
            `INSERT OR REPLACE INTO tickets (channelId, userId, yetkiliId, category, createdAt) VALUES (?, ?, ?, ?, ?)`
        ).run(channel.id, member.id, atanan.id, value, Date.now());

        try {
            await atanan.send(`🎫 Yeni ticket sana atandı: ${channel.url}`);
        } catch {
            const logChannel = guild.channels.cache.get(LOG_KANAL_ID);
            if (logChannel) logChannel.send(`⚠️ ${atanan} DM kapalı. Ticket ataması: ${channel}`);
        }

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("🎫 Ticket Açıldı")
            .setDescription(
                `Merhaba ${member},\n\n**${value}** kategorisi için ticket açtın.\nAtanan yetkili: <@${atanan.id}>`
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("ticket_close").setLabel("🔒 Kapat").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("ticket_transfer").setLabel("🔄 Devret").setStyle(ButtonStyle.Secondary)
        );

        await channel.send({
            content: `<@${member.id}> <@${atanan.id}>`,
            embeds: [embed],
            components: [row]
        });

        return interaction.editReply({
            content: `✅ Ticket'in başarıyla açıldı: ${channel}`
        });
    }


    if (interaction.isButton() && interaction.customId === "ticket_close") {
        const data = ticketData.get(interaction.channel.id) || db.prepare(`SELECT * FROM tickets WHERE channelId = ?`).get(interaction.channel.id);
        if (!data) return;

        if (![data.userId, data.yetkiliId].includes(interaction.user.id)) {
            return interaction.reply({ content: "❌ Bu ticket'i kapatma yetkin yok.", ephemeral: true });
        }

        await interaction.reply("⏳ Ticket kapatılıyor...");

        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        const logText = sorted.map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content}`).join("\n");

        if (!fs.existsSync("./logs")) fs.mkdirSync("./logs");
        const filePath = path.join("./logs", `${interaction.channel.name}.txt`);
        fs.writeFileSync(filePath, logText);

        const logChannel = interaction.guild.channels.cache.get(LOG_KANAL_ID);
        if (logChannel) {
            const attachment = new AttachmentBuilder(filePath);
            logChannel.send({ content: `🗑 Ticket silindi: ${interaction.channel.name}`, files: [attachment] });
        }

        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
            ticketData.delete(interaction.channel.id);
            db.prepare(`DELETE FROM tickets WHERE channelId = ?`).run(interaction.channel.id);
        }, 3000);
    }

    
    if (interaction.isButton() && interaction.customId === "ticket_transfer") {
       const data = ticketData.get(interaction.channel.id) 
          || db.prepare("SELECT * FROM tickets WHERE channelId = ?").get(interaction.channel.id);
        if (!data) return;

        if (interaction.user.id !== data.yetkiliId) {
            return interaction.reply({ content: "❌ Bu ticket'i sadece atanan yetkili devredebilir.", ephemeral: true });
        }

        const yetkiliRol = interaction.guild.roles.cache.get(YETKILI_ROL_ID);
        const options = yetkiliRol.members.map(m =>
            new StringSelectMenuOptionBuilder().setLabel(m.user.username).setValue(m.id)
        );

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("transfer_select")
                .setPlaceholder("Yeni yetkili seç...")
                .addOptions(options)
        );

        await interaction.reply({
            content: "🔄 Ticket'i devretmek için yeni yetkiliyi seçin:",
            components: [menu],
            ephemeral: true
        });
    }


    if (interaction.isStringSelectMenu() && interaction.customId === "transfer_select") {
        const data = ticketData.get(interaction.channel.id) || db.prepare(`SELECT * FROM tickets WHERE channelId = ?`).get(interaction.channel.id);
        if (!data) return;

        const newYetkiliId = interaction.values[0];
        const newMember = interaction.guild.members.cache.get(newYetkiliId);

        await interaction.channel.permissionOverwrites.delete(data.yetkiliId);
        await interaction.channel.permissionOverwrites.create(newYetkiliId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true
        });

        ticketData.set(interaction.channel.id, { ...data, yetkiliId: newYetkiliId });
        db.prepare(`UPDATE tickets SET yetkiliId = ? WHERE channelId = ?`).run(newYetkiliId, interaction.channel.id);

        await interaction.update({
            content: `✅ Ticket başarıyla <@${newYetkiliId}> kişisine devredildi.`,
            components: []
        });

        try {
            await newMember.send(`🎫 Sana bir ticket devredildi: ${interaction.channel.url}`);
        } catch {
            const logChannel = interaction.guild.channels.cache.get(LOG_KANAL_ID);
            if (logChannel) logChannel.send(`⚠️ ${newMember} DM kapalı. Ticket devri: ${interaction.channel}`);
        }
    }
});


client.on(Events.MessageCreate, async message => {
    if (message.content === "!ticket") {
        if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ Bu komutu kullanmak için yönetici yetkisine sahip olmalısın.");
        }
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("ticket_select")
                .setPlaceholder("🎫 Bir ticket kategorisi seçin")
                .addOptions([
                    { label: "Destek", description: "Yardım almak için ticket aç", value: "destek" },
                    { label: "Şikayet", description: "Bir kullanıcıyı şikayet et", value: "sikayet" },
                    { label: "Satın Alma", description: "Bot satın alma işlemleri için", value: "satin_alma" }
                ])
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
          .setCustomId("ticket_rules")
            .setLabel("📜 Ticket  Kurallar")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false)

        );

        const embed = new EmbedBuilder()
            .setColor("Blue")
            .setAuthor({name:`🎫 Ticket Sistemi`, iconURL: message.guild.iconURL()})
            .setDescription("• Aşağıdaki menüden bir kategori seçerek ticket açabilirsiniz. \n\n• Yetkililer en kısa sürede sizinle ilgilenecektir.")
            .setTimestamp()
            .addFields(
                { name: "Kategoriler", value: "• Destek\n• Şikayet\n• Satın Alma" }
            )
            .setFooter({text: `Sunucumuzda boşa ticket açmak ban sebebidir`, iconURL: message.guild.iconURL()});

     
            

        await message.channel.send({ embeds: [embed], components: [row, row2] });
    }
});

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isButton() && interaction.customId === "ticket_rules") {
        const embed = new EmbedBuilder()
            .setColor("Orange")
            .setTitle("📜 Ticket Kuralları")
            .setDescription("Lütfen ticket açmadan önce aşağıdaki kuralları okuyunuz:")
            .addFields(
                { name: "1. Gereksiz Ticket Açmak", value: "Sunucuda gereksiz yere ticket açmak yasaktır. Bu tür davranışlar ban ile sonuçlanabilir." },
                { name: "2. Saygılı Olun", value: "Yetkililere ve diğer kullanıcılara karşı her zaman saygılı olun." },
                { name: "3. Doğru Kategori Seçimi", value: "Ticket açarken doğru kategoriyi seçtiğinizden emin olun." },
                { name: "4. Spam Yapmayın", value: "Ticket içinde spam yapmak yasaktır." }
            )
            .setFooter({ text: "Kurallara uymayan kullanıcılar cezalandırılabilir.", iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
});



db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
        guildId TEXT PRIMARY KEY,
        yetkiliRolId TEXT,
        logKanalId TEXT,
        categoryId TEXT
    )
`).run();
const settingsData = new Map();
client.on(Events.GuildCreate, guild => {
    const existing = db.prepare("SELECT * FROM settings WHERE guildId = ?").get(guild.id);
    if (!existing) {
        db.prepare("INSERT INTO settings (guildId, yetkiliRolId, logKanalId, categoryId) VALUES (?, ?, ?, ?)")
          .run(guild.id, YETKILI_ROL_ID || process.env.YETKILI_ROL_ID, LOG_KANAL_ID || process.env.LOG_KANAL_ID, CATEGORY_ID || process.env.CATEGORY_ID);
    }
});
client.on(Events.GuildDelete, guild => {
    db.prepare("DELETE FROM settings WHERE guildId = ?").run(guild.id);
});
client.on(Events.GuildMemberRemove, member => {
    const data = ticketData.get(member.id);
    if (data) {
        const channel = member.guild.channels.cache.get(data.channelId);
        if (channel) {
            channel.send(`⚠️ ${member.user.tag} sunucudan ayrıldı, ticket kapatılıyor...`);
            setTimeout(() => {
                channel.delete().catch(() => {});
                ticketData.delete(member.id);
                db.prepare("DELETE FROM tickets WHERE channelId = ?").run(data.channelId);
            }, 5000);
        }
    }
});

client.on("clientReady", () => {
    const guilds = client.guilds.cache.map(g => g.id);
    const placeholders = guilds.map(() => "?").join(",");
    const existing = db.prepare(`SELECT guildId FROM settings WHERE guildId IN (${placeholders})`).all(...guilds).map(r => r.guildId);
    const toInsert = guilds.filter(id => !existing.includes(id));
    const insertStmt = db.prepare("INSERT INTO settings (guildId, yetkiliRolId, logKanalId, categoryId) VALUES (?, ?, ?, ?)");
    for (const id of toInsert) {
        insertStmt.run(id, YETKILI_ROL_ID || process.env.YETKILI_ROL_ID, LOG_KANAL_ID || process.env.LOG_KANAL_ID, CATEGORY_ID || process.env.CATEGORY_ID);
    }
    console.log(`✅ Ticket sistemi hazır ve ${guilds.length} sunucuda etkin.`)
    console.log(`✅ Database bağlantısı başarılı.`)
    console.log(`✅ Ticket sistemi için gerekli tablolar oluşturuldu.`)
    console.log(`✅ Toplamda ${db.prepare("SELECT COUNT(*) AS count FROM tickets").get().count} ticket verisi mevcut.`)
    console.log(`✅ Toplamda ${db.prepare("SELECT COUNT(*) AS count FROM settings").get().count} sunucu ayar verisi mevcut.`)
});


const fs = require('fs');
const {Routes, REST, PermissionsBitField} = require("discord.js");
const BOTID = process.env.ClientId;
const TOKEN = process.env.Token;


const rest = new REST({version : "10"}).setToken(TOKEN);

module.exports = (client) => {
	const slashCommands = []; 

	fs.readdirSync('./commands/').forEach(async dir => {
		const files = fs.readdirSync(`./commands/${dir}/`).filter(file => file.endsWith('.js'));

		for(const file of files) {
				const slashCommand = require(`../commands/${dir}/${file}`);

				let description = slashCommand.description;
				if (typeof description === 'object') {
					description = description['en'];
					if (typeof description !== 'string') {
						const values = Object.values(slashCommand.description);
						description = values.find(v => typeof v === 'string') || 'No description';
					}
				}

				slashCommands.push({
					name: slashCommand.name,
					description: description,
					descriptionLocalizations: (typeof slashCommand.description === 'object') ? Object.fromEntries(
						Object.entries(slashCommand.description).filter(([key, value]) => typeof value === 'string')
					) : undefined,
					type: slashCommand.type,
					options: slashCommand.options ? slashCommand.options : null,
					default_permission: slashCommand.default_permission ? slashCommand.default_permission : null,
					default_member_permissions: slashCommand.default_member_permissions ? PermissionsBitField.resolve(slashCommand.default_member_permissions).toString() : null
				});
			
		if(slashCommand.name) {
						client.slashCommands.set(slashCommand.name, slashCommand)
						console.log(`✅ ${slashCommand.name} komutu yüklendi!`);
				} else {
                        console.log(`❌ ${file} komutu yüklenemedi!`);
				}
		}
		
	});
	console.log(`✅ Toplamda ${client.slashCommands.size} komut yüklendi!`);

	(async () => {
			try {
				await rest.put(
					Routes.applicationCommands(BOTID), 
					{ body: slashCommands }
				);
				console.log('Slash Commands • Connect')
			} catch (error) {
				console.log(error);
			}
	})();
};

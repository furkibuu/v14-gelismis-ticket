const {readdirSync} = require('fs');
const path = require("path")


module.exports = (client) => {
    readdirSync('./events/').filter((file) => file.endsWith('.js')).forEach((event) => {
      	require(`../events/${event}`);
	
    })
	
	console.log(`✅ ${readdirSync(path.join(__dirname, "../events/")).length} event yüklendi!`);
};
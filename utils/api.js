const request = require('request-promise');
const Eris = require('eris');

const config = require('../config.json');

const bot = new Eris(`Bot ${config.botToken}`, {
    restMode: true
});

bot.on('ready', async () => {
    await bot.editStatus('online', {
        name: 'discordtemplates.me',
        type: 0
    });
});

bot.connect();

async function fetchUser(id) {
    try {
        return await bot.getRESTUser(id);
    } catch (err) {
        if (err.httpStatus === 404) return false;
        console.log(err.stack);
    }
}

async function fetchTemplate(id) {
    try {
        return await request({
            method: 'GET',
            uri: `https://discordapp.com/api/v9/guilds/templates/${id}`,
            headers: {
                'User-Agent': 'DiscordBot (custom, 1.0.0)'
            },
            json: true
        });
    } catch (err) {
        if (err.statusCode === 404) return false;
        if (err.statusCode === 400) return false;
        console.error(err.stack);
    }
}

module.exports = {
    fetchUser,
    fetchTemplate,
};

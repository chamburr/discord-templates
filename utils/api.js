const request = require('request-promise');
const Eris = require('eris');
const config = require('../config.json');

const bot = new Eris(`Bot ${config.botToken}`, {
    restMode: true
});

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
            uri: `https://discordapp.com/api/v6/guilds/templates/${id}`,
            headers: {
                'User-Agent': 'DiscordBot (custom, 1.0.0)'
            },
            json: true
        });
    } catch (err) {
        if (err.statusCode === 404) return false;
        console.error(err.stack);
    }
}

async function fetchFile(url) {
    try {
        return await request({
            method: 'GET',
            uri: url,
            headers: {
                'User-Agent': 'DiscordBot (custom, 1.0.0)'
            }
        });
    } catch (err) {
        if (err.statusCode === 404) return false;
        console.error(err.stack);
    }
}

module.exports = {
    fetchUser,
    fetchTemplate,
    fetchFile
};

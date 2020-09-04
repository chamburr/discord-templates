const request = require('request-promise');

const Discord = require('discord.js');
const client = new Discord.Client();

const config = require('../config.json');

client.login(config.botToken);

client.on('ready', () => {
    client.editStatus('online', 'discordtemplates.me');
    console.log(`Logged in as ${client.user.tag}.`);
});

async function fetchUser(id) {
    try {
        let user = new Discord.User(client, {id: id});
        await user.fetch();
        return user;
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

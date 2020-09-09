const os = require('os');
const moment = require('moment');
require('moment-duration-format');
const package = require('../../../package.json');

exports.run = async (bot, message) => {
    await message.channel.createMessage({
        embed: {
            title: `${bot.user.username} Statistics`,
            fields: [
                {
                    name: 'Owner',
                    value: 'CHamburr#2591',
                    inline: true
                },
                {
                    name: 'Bot Version',
                    value: package.version,
                    inline: true
                },
                {
                    name: 'Uptime',
                    value: moment.duration(bot.uptime).format('M[m] W[w] d[d] h[hr] m[m] s[s]'),
                    inline: true
                },
                {
                    name: 'Servers',
                    value: bot.guilds.size,
                    inline: true
                },
                {
                    name: 'Users',
                    value: bot.users.size,
                    inline: true
                },
                {
                    name: 'CPU Usage',
                    value: `${Math.round((os.loadavg()[0] / os.cpus().length) * 1000) / 10}%`,
                    inline: true
                },
                {
                    name: 'RAM Usage',
                    value: `${Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 10) / 10}MiB`,
                    inline: true
                },
                {
                    name: 'Node Version',
                    value: process.version.slice(1),
                    inline: true
                },
                {
                    name: 'Eris Version',
                    value: package.dependencies.eris.slice(1),
                    inline: true
                }
            ],
            thumbnail: {
                url: bot.user.avatarURL
            },
            color: bot.config.colors.primary
        }
    });
};

exports.help = {
    name: 'stats',
    aliases: [],
    usage: 'stats',
    description: 'See super cool stats about me.',
    permLevel: 10
};

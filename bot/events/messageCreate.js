const permission = require('../utils/permission.js');

module.exports = async (bot, message) => {
    if (!message) return;
    if (message.channel.type === 1) return;

    let command;
    let args;
    let prefixes = [`<@${bot.user.id}>`, `<@!${bot.user.id}>`, bot.config.prefix];

    for (let prefix of prefixes) {
        if (message.content.startsWith(prefix)) {
            args = message.content.slice(prefix.length).trim().split(' ');
            command = args.shift().toLowerCase();
            break;
        }
    }

    if (!command) return;

    let cmd = bot.getCommand(command);

    if (!cmd) return;

    let permLevel = 0;
    let permOrder = permission.slice(0).sort((a, b) => (a.level < b.level ? 1 : -1));

    while (permOrder.length) {
        let currentLevel = permOrder.shift();
        if (currentLevel.check(message)) {
            permLevel = currentLevel.level;
            break;
        }
    }

    if (permLevel < cmd.help.permLevel) {
        await message.channel.createMessage({
            embed: {
                title: 'Permission Denied',
                description: 'You do not have permission to use this command.',
                color: 0xff0000
            }
        });
        return;
    }

    message = {
        permLevel: permLevel,
        ...message
    };

    cmd.run(bot, message, args);
};

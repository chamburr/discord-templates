exports.run = async (bot, message, args) => {
    let code = args.join(' ');

    if (!code) {
        await message.channel.createMessage({
            embed: {
                description: 'Please supply something to evaluate.',
                color: bot.config.colors.error
            }
        });
        return;
    }

    try {
        let evaled = eval(code);

        if (typeof evaled !== 'string') {
            evaled = require('util').inspect(evaled);
        }

        evaled = evaled.replace(/`/g, '`' + String.fromCharCode(8203));

        await message.channel.createMessage({
            embed: {
                description: '```js\n' + evaled.substr(0, 2000) + '```',
                color: bot.config.colors.primary
            }
        });
    } catch (err) {
        await message.channel.createMessage({
            embed: {
                description: '```' + err.toString().substr(0, 2000) + '```',
                color: bot.config.colors.error
            }
        });
    }
};

exports.help = {
    name: 'eval',
    aliases: [],
    usage: 'eval <code>',
    description: 'Evaluate code.',
    permLevel: 10
};

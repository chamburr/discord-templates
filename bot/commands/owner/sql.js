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
        let statement = bot.db.prepare(code);
        let data = [];

        try {
            data = statement.all();
        } catch (err) {
            statement.run();
        }

        if (data.length === 0) {
            message.channel.createMessage({
                embed: {
                    description: 'No results to fetch.',
                    color: bot.config.colors.primary
                }
            });
            return;
        }

        await message.channel.createMessage({
            embed: {
                description: '```' + JSON.stringify(data).substr(0, 2000) + '```',
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
    name: 'sql',
    aliases: [],
    usage: 'sql <code>',
    description: 'Evaluate SQL.',
    permLevel: 10
};

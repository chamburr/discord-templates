exports.run = async (bot, message) => {
    await message.channel.createMessage({
        embed: {
            description: 'Restarting bot...',
            color: bot.config.colors.primary
        }
    });

    bot.disconnect({
        reconnect: false
    });
};

exports.help = {
    name: 'restart',
    aliases: [],
    usage: 'restart',
    description: 'Restart the bot.',
    permLevel: 10
};

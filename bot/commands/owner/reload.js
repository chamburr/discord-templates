exports.run = async (bot, message) => {
    await message.channel.createMessage({
        embed: {
            description: 'Reloading bot...',
            color: bot.config.colors.primary
        }
    });

    bot.loadCommands();
    bot.loadEvents();
};

exports.help = {
    name: 'reload',
    aliases: [],
    usage: 'reload',
    description: 'Reload the bot.',
    permLevel: 10
};

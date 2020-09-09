module.exports = async (bot, guild) => {
    await bot.createMessage(bot.config.channels.botJoinLeave, {
        embed: {
            title: 'Server Join',
            description: `${guild.name} (${guild.id})`,
            footer: {
                text: `${bot.guilds.size} servers`
            },
            color: 0x00ff00,
            timestamp: new Date().toISOString()
        }
    });
};

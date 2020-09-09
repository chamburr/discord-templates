module.exports = async (bot, guild) => {
    await bot.createMessage(bot.config.channels.botJoinLeave, {
        embed: {
            title: 'Server Leave',
            description: `${guild.name} (${guild.id})`,
            footer: {
                text: `${bot.guilds.size} servers`
            },
            color: 0xff0000,
            timestamp: new Date().toISOString()
        }
    });
};

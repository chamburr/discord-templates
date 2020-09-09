module.exports = async (bot, guild, member) => {
    if (guild.id !== bot.config.guildId) return;

    await bot.createMessage(bot.config.channels.joinLeave, {
        embed: {
            title: 'Member Leave',
            description: `${member.user.username}#${member.user.discriminator} (${member.user.id})`,
            footer: {
                text: `${guild.members.size} members`
            },
            color: 0xff0000,
            timestamp: new Date().toISOString()
        }
    });
};

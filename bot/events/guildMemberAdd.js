module.exports = async (bot, guild, member) => {
    let promotes = bot.getPromotes();
    promotes = promotes.map(element => element.guild);

    let id = member.user.id;

    if (promotes.includes(guild.id)) {
        setTimeout(() => {
            if (guild.members.get(id)) {
                bot.addTask(id, 'server', 2);
            }
        }, 600000);
    }

    if (guild.id !== bot.config.guildId) return;

    await bot.createMessage(bot.config.channels.joinLeave, {
        embed: {
            title: 'Member Join',
            description: `${member.user.username}#${member.user.discriminator} (${member.user.id})`,
            footer: {
                text: `${guild.members.size} members`
            },
            color: 0x00ff00,
            timestamp: new Date().toISOString()
        }
    });
};

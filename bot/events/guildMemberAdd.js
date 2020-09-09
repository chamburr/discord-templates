module.exports = async (bot, guild, member) => {
    let promotes = bot.getPromotes();
    promotes = promotes.map(element => element.guild);

    let id = member.user.id;

    if (promotes.includes(guild.id)) {
        setTimeout(() => {
            if (guild.members.get(id)) {
                bot.addTask(id, 'server', 5);
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

    let channel = await member.user.getDMChannel();

    await channel.createMessage(
        `Hey ${member.user.username}!\n\n` +
        'If you are reading this message, it\'s because you\'ve logged in on our website: <https://discordtemplates.me>\n\n' +
        'You\'ve probably just created a Discord server using one of our templates. Congratulations, your journey to creating a successful ' +
        'and engaged community here begins! It may not be easy, but don\'t freak - we\'ve just added you to our official Discord ' +
        'server because we thought that we could help!\n\n' +
        'Here are some quick tips for your server:\n' +
        '- Be unique! Look for a topic that doesn\'t exist in other servers yet.\n' +
        '- Be specific! It will be much easier for your members to join the conversation.\n' +
        '- Think about why you would want to join a server. Always remember this!\n\n' +
        'When you are ready, be sure to share your server in <#753092518001901650>! Also, we have specially designed a bot for you ' +
        'to quickly and easily grow your community! It\'s simple. Just invite it to your server and type `$info` to get started! ' +
        'Invite link: <https://discord.com/api/oauth2/authorize?client_id=696170556969582632&permissions=8&scope=bot>\n\n' +
        'For a complete guide, check out <#696179394070184016>. Have fun :)'
    );
};

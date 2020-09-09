exports.run = async (bot, message) => {
    await message.channel.createMessage({
        embed: {
            title: 'Invite Link',
            description: 'https://discord.com/api/oauth2/authorize?client_id=696170556969582632&permissions=8&scope=bot',
            color: bot.config.colors.primary
        }
    });
};

exports.help = {
    name: 'invite',
    aliases: ['support'],
    usage: 'invite',
    description: 'Get the link to invite bot.',
    permLevel: 0
};

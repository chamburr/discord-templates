exports.run = async (bot, message) => {
    await message.channel.createMessage({
        embed: {
            title: 'About Discord Templates',
            description:
                'Discord Templates - Discover a huge variety of Discord server templates for all purposes. ' +
                'For more information on Discord Templates, please visit our website: https://discordtemplates.me',
            fields: [
//              {
//                  name: 'About this bot',
//                  value:
//                      'After creating your server with a template, you will definitely want to share and grow your server! ' +
//                      'This bot is created exactly to help you do so. It will enable you to build a huge and successful community - ' +
//                      'like what our other users already have! :)',
//                  inline: false
//              },
//              {
//                  name: 'How do I use this bot?',
//                  value:
//                      `First, type \`${bot.config.prefix}tasks\` to view the tasks and complete them. ` +
//                      `Then, use \`${bot.config.prefix}profile\` to check your profile and balance. ` +
//                      `Finally, when you have enough credits, do \`${bot.config.prefix}shop\` and redeem it for members!`,
//                  inline: false
//              },
                {
                    name: 'About this bot',
                    value:
                        'This bot is currently a work in progress. In the near future, you will be able to use templates from ' +
                        'the website in an existing server - without creating a new one! Who knows? The possbilities are endless...',
                    inline: false
                },
                {
                    name: 'Need further help?',
                    value: 'Join our official server here: https://discord.gg/HXHfYQB',
                    inline: false
                }
            ],
            color: bot.config.colors.primary
        }
    });
};

exports.help = {
    name: 'info',
    aliases: ['about', 'support'],
    usage: 'info',
    description: 'Learn more about this bot.',
    permLevel: 0
};

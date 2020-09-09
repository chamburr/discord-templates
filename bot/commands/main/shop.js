exports.run = async (bot, message) => {
    let user = bot.getUser(message.author.id);

    let embed = {
        title: 'Shop',
        description:
            `Here's the shop! Current balance: ${user.credit} credits\n` +
            `Use \`${bot.config.prefix}tasks\` to see how to get more credits!`,
        fields: [
            {
                name: 'Grow your server (3h) - 10 credits',
                value:
                    'Get a small boost of members in this server! Valid for 3 hours.\n' +
                    `Use \`${bot.config.prefix}buy 1\` to buy and activate it.`,
                inline: false
            },
            {
                name: 'Grow your server (6h) - 20 credits',
                value:
                    'Get a medium boost of members in this server! Valid for 6 hours.\n' +
                    `Use \`${bot.config.prefix}buy 2\` to buy and activate it.`,
                inline: false
            },
            {
                name: 'Grow your server (12h) - 40 credits',
                value:
                    'Get a large boost of members in this server! Valid for 12 hours.\n' +
                    `Use \`${bot.config.prefix}buy 3\` to buy and activate it.`,
                inline: false
            },
            {
                name: 'Grow your server (24h) - 80 credits',
                value:
                    'Get a huge boost of members in this server! Valid for 24 hours.\n' +
                    `Use \`${bot.config.prefix}buy 4\` to buy and activate it.`,
                inline: false
            }
        ],
        color: bot.config.colors.primary
    };

    await message.channel.createMessage({ embed: embed });
};

exports.help = {
    name: 'shop',
    aliases: ['store'],
    usage: 'shop',
    description: 'View the shop to buy things!',
    permLevel: 0
};

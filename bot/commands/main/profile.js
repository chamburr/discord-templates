exports.run = async (bot, message) => {
    let user = bot.getUser(message.author.id);
    let tasks = bot.getTasks(message.author.id);

    tasks = tasks
        .sort((a, b) => b.created - a.created).slice(0, 5)
        .map(element => `- Joined a server ($${element.reward}).`);

    if (tasks.length === 0) tasks.push('*None*');

    let embed = {
        title: 'Profile',
        description: `Here's your profile. Use \`${bot.config.prefix}tasks\` to see how to get more credit!`,
        fields: [
            {
                name: 'Username',
                value: `${message.author.username}#${message.author.discriminator}`,
                inline: true
            },
            {
                name: 'Balance',
                value: `$${user.credit}`,
                inline: true
            },
            {
                name: 'Recent activity',
                value: tasks.join('\n'),
                inline: false
            }
        ],
        color: bot.config.colors.primary
    };

    await message.channel.createMessage({ embed: embed });
};

exports.help = {
    name: 'profile',
    aliases: ['p', 'balance', 'bal'],
    usage: 'profile',
    description: 'See your profile and balance.',
    permLevel: 0
};

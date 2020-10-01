exports.run = async (bot, message) => {
    let embed = {
        title: 'Tasks',
        description:
            `Complete these tasks to receive some credit. You can exchange them for server growth in \`${bot.config.prefix}shop\`! ` +
            `For more information, type \`${bot.config.prefix}info\`.`,
        fields: [],
        color: bot.config.colors.primary
    };

    let promotes = bot.getPromotes();

    promotes = promotes
        .filter(element => {
            let guild = bot.guilds.get(element.guild);
            return guild && !guild.members.get(message.author.id);
        })
        .map(element => `https://discord.gg/${element.invite}`)
        .slice(0, 10);

    embed.fields.push({
        name: 'Join a server - 5 credits',
        value: 'Join these servers and stay for at least 10 minutes. You will receive 2 credits for each!\n' + promotes.join('\n'),
        inline: false
    });

    //embed.fields.push({
    //    name: 'Donate - 50 credits per $1',
    //    value: 'You can donate to us on PayPal for credits! Please DM CHamburr#2591 if you wish to do so.',
    //    inline: false
    //});

    embed.fields.push({
        name: 'More coming soon...',
        value: 'More ways to earn credit will be coming soon! Tell us if you have a suggestion.',
        inline: false
    });

    await message.channel.createMessage({ embed: embed });
};

exports.help = {
    name: 'tasks',
    aliases: ['task'],
    usage: 'tasks',
    description: 'See the tasks.',
    permLevel: 0
};

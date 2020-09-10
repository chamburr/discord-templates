exports.run = async (bot, message, args) => {
    let user = bot.getUser(message.author.id);

    let id = args[0];

    let credit = 0;
    let duration = 0;

    if (id === '1') {
        credit = 10;
        duration = 3600000 * 12;
    }
    else if (id === '2') {
        credit = 25;
        duration = 3600000 * 24;
    }
    else if (id === '3') {
        credit = 50;
        duration = 3600000 * 24 * 3;
    }
    else if (id === '4') {
        credit = 100;
        duration = 3600000 * 24 * 7;
    }

    if (credit === 0) {
        await message.channel.createMessage({
            embed: {
                title: 'Invalid ID',
                description: `Use \`${bot.config.prefix}shop\` to see the list of items.`,
                color: bot.config.colors.error
            }
        });
        return;
    }

    if (user.credit < credit) {
        await message.channel.createMessage({
            embed: {
                title: 'Insufficient Credits',
                description: `You need more credits to buy this! Use \`${bot.config.prefix}tasks\` to see how to get credits.`,
                color: bot.config.colors.error
            }
        });
        return;
    }

    let promotes = bot.getPromotes();
    promotes = promotes.map(element => element.guild);

    if (promotes.includes(message.channel.guild.id)) {
        await message.channel.createMessage({
            embed: {
                title: 'Already Boosted',
                description: 'Please wait until the current boost expires to get a new one.',
                color: bot.config.colors.error
            }
        });
        return;
    }

    let invite;

    try {
        invite = await message.channel.createInvite({
            maxAge: 0,
            maxUses: 0,
            unique: true
        });
        invite = invite.code;
    } catch (err) {
        await message.channel.createMessage({
            embed: {
                title: 'Missing Permissions',
                description: 'Please give me permissions to create an invite in this channel.',
                color: bot.config.colors.error
            }
        });
        return;
    }

    bot.addCredit(message.author.id, -credit);
    bot.addPromote(message.channel.guild.id, invite, duration);

    await message.channel.createMessage({
        embed: {
            title: 'Success',
            description: 'Cool! Now watch your server grow :D',
            color: bot.config.colors.primary
        }
    });
};

exports.help = {
    name: 'buy',
    aliases: [],
    usage: 'buy <id>',
    description: 'Buy something from the shop.',
    permLevel: 0
};

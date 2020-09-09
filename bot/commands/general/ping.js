exports.run = async (bot, message) => {
    await message.channel.createMessage({
        embed: {
            title: 'Pong!',
            description: `My current latency is ${Math.round(message.channel.guild.shard.latency * 10) / 10}ms.`,
            color: bot.config.colors.primary
        }
    });
};

exports.help = {
    name: 'ping',
    aliases: [],
    usage: 'ping',
    description: 'Pong! Get my latency.',
    permLevel: 0
};

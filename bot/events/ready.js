module.exports = async bot => {
    console.log(`${bot.user.username}#${bot.user.discriminator} is online!`);

    await bot.editStatus('online', {
        name: `discordtemplates.me | ${bot.config.prefix}help`,
        type: 0
    });

    await bot.createMessage(bot.config.channels.botEvent, {
        embed: {
            title: 'Bot Ready',
            color: 0x00ff00,
            timestamp: new Date().toISOString()
        }
    });
};

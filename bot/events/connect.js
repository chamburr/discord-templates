module.exports = async bot => {
    await bot.createMessage(bot.config.channels.botEvent, {
        embed: {
            title: 'Shard Connected',
            color: 0x00ff00,
            timestamp: new Date().toISOString()
        }
    });
};

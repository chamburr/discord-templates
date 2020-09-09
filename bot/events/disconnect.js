module.exports = async bot => {
    await bot.createMessage(bot.config.channels.botEvent, {
        embed: {
            title: 'Shard Disconnected',
            color: 0xff0000,
            timestamp: new Date().toISOString()
        }
    });
};

const config = require('../../config.json');

module.exports = [
    {
        level: 0,
        check: () => {
            return true;
        }
    },
    {
        level: 9,
        check: message => {
            return config.admins.includes(message.author.id);
        }
    },
    {
        level: 10,
        check: message => {
            return config.owners.includes(message.author.id);
        }
    }
];

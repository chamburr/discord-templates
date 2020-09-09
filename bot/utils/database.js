module.exports = async bot => {
    bot.db
        .prepare(
            `CREATE TABLE IF NOT EXISTS user
            (
                id      text    NOT NULL PRIMARY KEY,
                credit  integer NOT NULL,
                created integer NOT NULL
            )`
        )
        .run();

    bot.db
        .prepare(
            `CREATE TABLE IF NOT EXISTS task
            (
                user    text    NOT NULL,
                type    text    NOT NULL,
                reward  integer NOT NULL,
                created integer NOT NULL
            )`
        )
        .run();

    bot.db
        .prepare(
            `CREATE TABLE IF NOT EXISTS promote
            (
                guild   text    NOT NULL,
                invite  text    NOT NULL,
                expiry  integer NOT NULL,
                created integer NOT NULL
            )`
        )
        .run();

    bot.getUser = id => {
        let user = bot.db.prepare('SELECT * FROM user WHERE id=?').get(id);
        if (!user) {
            bot.db.prepare('INSERT INTO user VALUES (?, ?, ?)').run(id, 6, Date.now());
            return bot.getUser(id);
        }
        return user;
    };

    bot.addCredit = (id, amount) => {
        let user = bot.getUser(id);
        let credit = user.credit + amount;
        bot.db.prepare('UPDATE user SET credit=? WHERE id=?').run(credit, id);
    };

    bot.addTask = (id, task, amount) => {
        bot.addCredit(id, amount);
        bot.db.prepare('INSERT INTO task VALUES (?, ?, ?, ?)').run(id, task, amount, Date.now());
    };

    bot.getTasks = id => {
        return bot.db.prepare('SELECT * FROM task WHERE user=?').all(id);
    };

    bot.shuffle = arr => {
        let index = arr.length;
        let temp, rand;

        while (0 !== index) {
            rand = Math.floor(Math.random() * index);
            index -= 1;
            temp = arr[index];
            arr[index] = arr[rand];
            arr[rand] = temp;
        }

        return arr;
    };


    bot.getPromotes = offset => {
        if (!offset) offset = 0;
        let results = bot.db.prepare('SELECT * FROM promote WHERE expiry>?').all(Date.now() + offset);

        let index = results.length;
        let temp, rand;

        while (0 !== index) {
            rand = Math.floor(Math.random() * index);
            index -= 1;
            temp = results[index];
            results[index] = results[rand];
            results[rand] = temp;
        }

        return results;
    };

    bot.addPromote = (id, invite, duration) => {
        bot.db.prepare('INSERT INTO promote VALUES (?, ?, ?, ?)').run(id, invite, Date.now() + duration, Date.now());
    };
};

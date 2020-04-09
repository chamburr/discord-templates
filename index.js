const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const timeout = require('connect-timeout');
const BetterSqlite3 = require('better-sqlite3');
const Discord = require('discord.js');
const DiscordOauth2 = require('discord-oauth2');

const config = require('./config.json');

const db = new BetterSqlite3('data.db');
db.prepare(`CREATE TABLE IF NOT EXISTS user
            (
                id            text    NOT NULL PRIMARY KEY,
                username      text    NOT NULL,
                avatar        text    NOT NULL,
                discriminator text    NOT NULL,
                joined        text    NOT NULL,
                banned        integer NOT NULL
            )`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS template
            (
                id          text    NOT NULL PRIMARY KEY,
                name        text    NOT NULL,
                description text    NOT NULL,
                usage       integer NOT NULL,
                creator     text    NOT NULL,
                guild       text    NOT NULL,
                icon        text    NOT NULL,
                created     text    NOT NULL,
                updated     text    NOT NULL,
                tag1        text    NOT NULL,
                tag2        text,
                added       text    NOT NULL,
                approved    integer NOT NULL
            )`).run();

const loginHook = new Discord.WebhookClient(config.loginHookId, config.loginHookToken);
const actionHook = new Discord.WebhookClient(config.actionHookId, config.actionHookToken);
const auditHook = new Discord.WebhookClient(config.auditHookId, config.auditHookToken);

const api = require('./utils/api.js');
const errors = require('./utils/error_handler.js');
const jwt = require('./utils/jwt.js');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateTemplates() {
    let templates = db.prepare('SELECT * FROM template').all();
    for (let element of templates) {
        let template = await api.fetchTemplate(element.id);
        if (template === false) {
            db.prepare('DELETE FROM template WHERE id=?').run(element.id);
            await sleep(3000);
            continue;
        }
        if (template == null) {
            await sleep(3000);
            continue;
        }
        if (element.name !== template.name || element.description !== template.description || element.usage !== template.usage_count || element.icon !== template.serialized_source_guild.icon_hash || element.updated !== (new Date(template.updated_at)).getTime().toString()) {
            db.prepare('UPDATE template SET name=?, description=?, usage=?, icon=?, updated=? WHERE id=?')
                .run(template.name, template.description, template.usage_count, template.serialized_source_guild.icon_hash, (new Date(template.updated_at)).getTime().toString(), element.id);
        }
        await sleep(3000);
    }
    updateTemplates();
}

async function updateUsers() {
    let users = db.prepare('SELECT * FROM user').all();
    for (let element of users) {
        let user = await api.fetchUser(element.id);
        if (user === false) {
            db.prepare('DELETE FROM user WHERE id=?').run(element.id);
            await sleep(3000);
            continue;
        }
        if (user.username == null) {
            await sleep(3000);
            continue;
        }
        if (element.username !== user.username || element.avatar !== user.avatar || element.discriminator !== user.discriminator) {
            db.prepare('UPDATE user SET username=?, avatar=?, discriminator=? WHERE id=?')
                .run(user.username, user.avatar, user.discriminator, element.id);
        }
        await sleep(3000);
    }
    updateUsers();
}

updateTemplates();
updateUsers();

const oauth = new DiscordOauth2();

async function authUser(req, res, next) {
    let auth = req.cookies.auth;
    if (auth != null) {
        let token = jwt.verifyToken(auth);
        if (token != null) {
            try {
                res.locals.user = await oauth.getUser(token);
                res.locals.user.admin = config.admin.includes(res.locals.user.id);
            } catch (err) {
            }
        }
    }
    next();
}

async function checkLogin(req, res, next) {
    const redirectUri = `https://discordapp.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=identify`;
    if (res.locals.user == null) {
        res.redirect(redirectUri);
        return;
    }
    next();
}

async function checkAdmin(req, res, next) {
    if (!res.locals.user.admin) return errors.sendError403();
    next();
}

async function checkBan(req, res, next) {
    if (db.prepare('SELECT * FROM user WHERE id=?').get(res.locals.user.id).banned === 1) {
        return errors.sendError(req, res, 'You have been banned.');
    }
    next();
}


async function checkTemplate(req, res, next) {
    let template = db.prepare('SELECT * FROM template WHERE guild=?').get(req.params.id);
    if (template == null) return errors.sendError404(req, res);
    if (template.approved === 0 && (!res.locals.user || !res.locals.user.admin)) {
        return errors.sendError(req, res, 'This template is waiting to be approved.');
    }
    let template2 = await api.fetchTemplate(template.id);
    if (template2 === false) return errors.sendError(req, res, 'This template was deleted.');
    res.locals.template = {
        tags: [template.tag1, template.tag2],
        ...template2
    };
    next();
}

require('express-async-errors');

const app = express();
app.locals.moment = require('moment');
app.set('x-powered-by', false);
app.set('view engine', 'ejs');
app.use(timeout(12000));
app.use('/static', express.static('static'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(authUser);

app.get('/login', checkLogin, async (req, res) => {
    res.redirect('/');
});

app.get('/callback', async (req, res) => {
    if (req.query.code == null) return errors.sendError400(req, res);
    try {
        let auth = await oauth.tokenRequest({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            code: req.query.code,
            scope: 'identify',
            grantType: 'authorization_code',
            redirectUri: config.redirectUri
        });
        let user = await oauth.getUser(auth.access_token);
        await loginHook.send({
            embeds: [{
                title: 'User Logged In',
                color: 0x00FF00,
                description: `${user.username}#${user.discriminator} (${user.id})`,
                timestamp: Date.now()
            }]
        });
        db.prepare('INSERT OR IGNORE INTO user VALUES (?, ?, ?, ?, ?, ?)')
            .run(user.id, user.username, user.avatar, user.discriminator, Date.now().toString(), 0);
        let token = jwt.signToken(auth.access_token);
        res.cookie('auth', token, {
            maxAge: 604800000
        }).redirect('/');
    } catch (err) {
        errors.sendError401(req, res);
    }
});

app.get('/logout', checkLogin, async (req, res) => {
    await loginHook.send({
        embeds: [{
            title: 'User Logged Out',
            color: 0xFF0000,
            description: `${res.locals.user.username}#${res.locals.user.discriminator} (${res.locals.user.id})`,
            timestamp: Date.now()
        }]
    });
    res.clearCookie('auth').redirect('/');
});

app.get('/admin', checkLogin, checkAdmin, async (req, res) => {
    let data = {
        user: res.locals.user,
        stats: {
            templates: db.prepare('SELECT COUNT(*) as count FROM template WHERE approved=1').get().count,
            users: db.prepare('SELECT COUNT(*) as count FROM user').get().count,
            requests: db.prepare('SELECT COUNT(*) as count FROM template WHERE approved=0').get().count
        },
        requests: db.prepare('SELECT * FROM template WHERE approved=0').all()
    };
    res.render('admin', data);
});

app.post('/admin/review', checkLogin, checkAdmin, async (req, res) => {
    if (req.body.code == null) return errors.sendError400(req, res);
    if (req.body.message == null || req.body.message.length > 1024) return errors.sendError400(req, res);
    if (req.body.action !== 'approve' && req.body.action !== 'deny') return errors.sendError400(req, res);
    if (db.prepare('SELECT * FROM template WHERE id=? AND approved=0').get(req.body.code) == null) {
        return errors.sendError(req, res, 'The template could not be found.');
    }
    if (req.body.action === 'approve') {
        let template = await api.fetchTemplate(req.body.code);
        if (template === false) return errors.sendError(req, res, 'Unknown server template.');
        if (template == null) return errors.sendError500(req, res);
        await auditHook.send({
            embeds: [{
                title: 'Template Approved',
                color: 0x00FF00,
                fields: [
                    {
                        name: 'Template',
                        value: `${config.baseUri}/templates/${template.source_guild_id}`,
                        inline: false
                    },
                    {
                        name: 'Moderator',
                        value: `${res.locals.user.username}#${res.locals.user.discriminator} (${res.locals.user.id})`,
                        inline: false
                    },
                    {
                        name: 'Message',
                        value: req.body.message,
                        inline: false
                    }
                ],
                timestamp: Date.now()
            }]
        });
        db.prepare('UPDATE template SET approved=1 WHERE id=?').run(req.body.code);
    } else {
        await auditHook.send({
            embeds: [{
                title: 'Template Denied',
                color: 0xFF0000,
                fields: [
                    {
                        name: 'Template',
                        value: `https://discord.new/${req.body.code}`,
                        inline: false
                    },
                    {
                        name: 'Moderator',
                        value: `${res.locals.user.username}#${res.locals.user.discriminator}`,
                        inline: false
                    },
                    {
                        name: 'Message',
                        value: req.body.message,
                        inline: false
                    }
                ],
                timestamp: Date.now()
            }]
        });
        db.prepare('DELETE FROM template WHERE id=? AND approved=0').run(req.body.code);
    }
    res.redirect('/admin');
});

app.get('/robots.txt', async (req, res) => {
    res.send(`User-agent: *
Disallow: /login
Disallow: /logout
Disallow: /admin`);
});

app.get('/', async (req, res) => {
    let data = {
        user: res.locals.user,
        top: db.prepare('SELECT * FROM template WHERE approved=1 ORDER BY usage DESC LIMIT 20').all(),
        recent: db.prepare('SELECT * FROM template WHERE approved=1 ORDER BY added LIMIT 8').all(),
        community: db.prepare('SELECT * FROM template WHERE (tag1=? OR tag2=?) AND approved=1 ORDER BY usage DESC LIMIT 12').all('community', 'community'),
        gaming: db.prepare('SELECT * FROM template WHERE (tag1=? OR tag2=?) AND approved=1 ORDER BY usage DESC LIMIT 12').all('gaming', 'gaming'),
    };
    res.render('index', data);
});

app.get('/discord', async (req, res) => {
    res.redirect('https://discord.gg/HXHfYQB');
});

app.get('/about', async (req, res) => {
    let data = {
        user: res.locals.user
    };
    res.render('about', data);
});

app.get('/partners', async (req, res) => {
    let data = {
        user: res.locals.user
    };
    res.render('partners', data);
});

app.get('/terms', async (req, res) => {
    let data = {
        user: res.locals.user
    };
    res.render('terms', data);
});

app.get('/privacy', async (req, res) => {
    let data = {
        user: res.locals.user
    };
    res.render('privacy', data);
});

app.get('/search', async (req, res) => {
    if (req.query.q == null) return errors.sendError400(req, res);
    let page = 0;
    if (req.query.page != null) {
        page = parseInt(req.query.page);
        if (isNaN(page) || page < 1) return errors.sendError400(req, res);
        page -= 1;
    }
    let templates = db.prepare('SELECT * FROM template WHERE name LIKE ? AND approved=1 ORDER BY LENGTH(name), usage DESC LIMIT 20 OFFSET ?')
        .all(`%${req.query.q}%`, page * 20);
    let data = {
        user: res.locals.user,
        templates: templates,
        query: req.query.q,
        page: page + 1
    };
    res.render('search', data);
});

app.get('/tags/:id', async (req, res) => {
    if (!config.tag.find(element => element.toLowerCase() === req.params.id)) return errors.sendError400(req, res);
    let page = 0;
    if (req.query.page != null) {
        page = parseInt(req.query.page);
        if (isNaN(page) || page < 1) return errors.sendError400(req, res);
        page -= 1;
    }
    let templates = db.prepare('SELECT * FROM template WHERE (tag1=? OR tag2=?) AND approved=1 ORDER BY usage DESC LIMIT 20 OFFSET ?')
        .all(req.params.id, req.params.id, page * 20);
    let data = {
        user: res.locals.user,
        templates: templates,
        tag: req.params.id,
        page: page + 1
    };
    res.render('tag', data);
});

app.get('/templates/new', checkLogin, checkBan, async (req, res) => {
    let data = {
        user: res.locals.user
    };
    if (req.query.code != null) {
        data.template = await api.fetchTemplate(req.query.code);
        if (data.template === false) return errors.sendError(req, res, 'Unknown server template.');
        if (data.template == null) return errors.sendError500(req, res);
        if (data.template.creator_id !== res.locals.user.id) return errors.sendError(req, res, 'You can only add your own template.');
        if (db.prepare('SELECT * FROM template WHERE id=?').get(req.query.code) != null) return errors.sendError(req, res, 'This template was already added.');
    }
    res.render('new_template', data);
});

app.post('/templates/new', checkLogin, checkBan, async (req, res) => {
    if (req.body.code == null) return errors.sendError400(req, res);
    if (req.body.tag1 == null || !config.tag.includes(req.body.tag1)) return errors.sendError400(req, res);
    if (req.body.tag2 !== 'None' && !config.tag.includes(req.body.tag2)) return errors.sendError400(req, res);
    if (req.body.tag1 === req.body.tag2) return errors.sendError(req, res, 'The tags cannot be the same.');
    if (db.prepare('SELECT * FROM template WHERE id=?').get(req.body.code) != null) return errors.sendError(req, res, 'This template was already added.');
    let template = await api.fetchTemplate(req.body.code);
    if (template === false) return errors.sendError(req, res, 'Unknown server template.');
    if (template == null) return errors.sendError500(req, res);
    if (template.creator_id !== res.locals.user.id) return errors.sendError(req, res, 'You can only add your own template.');
    await actionHook.send({
        embeds: [{
            title: 'Template Submitted',
            color: 0x00FF00,
            fields: [
                {
                    name: 'Template',
                    value: `https://discord.new/${req.body.code}`,
                    inline: false
                },
                {
                    name: 'User',
                    value: `${res.locals.user.username}#${res.locals.user.discriminator} (${res.locals.user.id})`,
                    inline: false
                }
            ],
            timestamp: Date.now()
        }]
    });
    req.body.tag1 = req.body.tag1.toLowerCase();
    if (req.body.tag2 === 'None') req.body.tag2 = null;
    else req.body.tag2 = req.body.tag2.toLowerCase();
    db.prepare('INSERT INTO template VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(template.code, template.name, template.description, template.usage_count, template.creator_id, template.source_guild_id, template.serialized_source_guild.icon_hash, (new Date(template.created_at)).getTime().toString(), (new Date(template.updated_at)).getTime().toString(), req.body.tag1, req.body.tag2, Date.now().toString(), 0);
    return errors.sendCustom(req, res, 'OK', 'Template Submitted', 'While we review your template, we encourage you to join our Discord server for updates.', 'Join Discord', '/discord')
});

app.get('/templates/:id', checkTemplate, async (req, res) => {
    let data = {
        user: res.locals.user,
        template: res.locals.template
    };
    res.render('template', data);
});

app.get('/templates/:id/use', checkTemplate, async (req, res) => {
    res.redirect('https://discord.new/' + res.locals.template.code);
});

app.get('/templates/:id/edit', checkLogin, checkTemplate, async (req, res) => {
    if (res.locals.user.id !== res.locals.template.creator_id && res.locals.user.admin === false) return errors.sendError403(req, res);
    let data = {
        user: res.locals.user,
        template: res.locals.template,
    };
    res.render('edit_template', data);
});

app.post('/templates/:id/edit', checkLogin, checkTemplate, async (req, res) => {
    if (res.locals.user.id !== res.locals.template.creator_id && res.locals.user.admin === false) return errors.sendError403(req, res);
    if (req.body.tag1 == null || !config.tag.includes(req.body.tag1)) return errors.sendError400(req, res);
    if (req.body.tag2 !== 'None' && !config.tag.includes(req.body.tag2)) return errors.sendError400(req, res);
    if (req.body.tag1 === req.body.tag2) return errors.sendError(req, res, 'The tags cannot be the same.');
    await actionHook.send({
        embeds: [{
            title: 'Template Edited',
            color: 0xFFD700,
            fields: [
                {
                    name: 'Template',
                    value: `${config.baseUri}/templates/${req.body.code}`,
                    inline: false
                },
                {
                    name: 'User',
                    value: `${res.locals.user.username}#${res.locals.user.discriminator} (${res.locals.user.id})`,
                    inline: false
                }
            ],
            timestamp: Date.now()
        }]
    });
    req.body.tag1 = req.body.tag1.toLowerCase();
    if (req.body.tag2 === 'None') req.body.tag2 = null;
    else req.body.tag2 = req.body.tag2.toLowerCase();
    db.prepare('UPDATE template SET tag1=?, tag2=? WHERE id=?').run(req.body.tag1, req.body.tag2, res.locals.template.code);
    errors.sendCustom(req, res, 'OK', 'Template Edited', 'The template was edited successfully.', 'View Template', '/templates/' + req.params.id);
});

app.post('/templates/:id/delete', checkLogin, checkTemplate, async (req, res) => {
    if (res.locals.user.id !== res.locals.template.creator_id && res.locals.user.admin === false) return errors.sendError403(req, res);
    await actionHook.send({
        embeds: [{
            title: 'Template Deleted',
            color: 0xFF0000,
            fields: [
                {
                    name: 'Template',
                    value: `https://discord.new/${req.body.code}`,
                    inline: false
                },
                {
                    name: 'User',
                    value: `${res.locals.user.username}#${res.locals.user.discriminator} (${res.locals.user.id})`,
                    inline: false
                }
            ],
            timestamp: Date.now()
        }]
    });
    db.prepare('DELETE FROM template WHERE id=?').run(res.locals.template.code);
    errors.sendCustom(req, res, 'OK', 'Template Deleted', 'The template was deleted successfully.');
});

app.get('/users/:id', async (req, res) => {
    let user = db.prepare('SELECT * FROM user WHERE id=?').get(req.params.id);
    if (user == null) return errors.sendError404(req, res);
    let data = {
        user: res.locals.user,
        profile: user,
        templates: db.prepare('SELECT * FROM template WHERE creator=? AND approved=1 ORDER BY usage DESC').all(req.params.id),
    };
    res.render('user', data);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    if (req.timedout) {
        errors.sendError503(req, res);
    } else {
        errors.sendError500(req, res);
    }
});

app.use((req, res, next) => {
    errors.sendError404(req, res);
});

app.listen(8080, () => {
    console.log(`App listening on port ${8080}.`);
});

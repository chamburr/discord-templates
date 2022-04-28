const BetterSqlite3 = require('better-sqlite3');
const Discord = require('discord.js');
const DiscordOauth2 = require('discord-oauth2');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express');
const request = require('request-promise');
const sitemap = require('express-sitemap');
const timeout = require('connect-timeout');

const config = require('./config.json');
const api = require('./utils/api.js');
const errors = require('./utils/error_handler.js');
const jwt = require('./utils/jwt.js');

let db = new BetterSqlite3('data.db');
db.prepare(`CREATE TABLE IF NOT EXISTS user
    (
        id            text    NOT NULL PRIMARY KEY,
        username      text    NOT NULL,
        avatar        text    NOT NULL,
        discriminator text    NOT NULL,
        joined        text    NOT NULL
    )`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS template
    (
        id          text    NOT NULL PRIMARY KEY,
        name        text    NOT NULL,
        description text    NOT NULL,
        usage       integer NOT NULL,
        creator     text    NOT NULL,
        guild       text    NOT NULL,
        tag1        text    NOT NULL,
        tag2        text,
        added       text    NOT NULL
    )`).run();

let loginHook = new Discord.WebhookClient(config.loginHookId, config.loginHookToken);
let actionHook = new Discord.WebhookClient(config.actionHookId, config.actionHookToken);

let tags = ['Community', 'Gaming', 'Roleplay', 'Friends', 'Art', 'Anime', 'Music', 'Meme', 'Economy', 'Coding',
    'Learning', 'Support'];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateTemplates() {
    let templates = db.prepare('SELECT * FROM template').all();

    if (templates.length === 0) await sleep(15000);

    for (let element of templates) {
        let template = await api.fetchTemplate(element.id);

        if (!template) {
            if (template === false) {
                db.prepare('DELETE FROM template WHERE id=?').run(element.id);
            }

            await sleep(15000);
            continue;
        }

        if (element.name !== template.name ||
            element.description !== template.description ||
            element.usage !== template.usage_count) {

            if (template.description == null) template.description = '';

            db.prepare('UPDATE template SET name=?, description=?, usage=? WHERE id=?')
                .run(template.name, template.description, template.usage_count, element.id);
        }

        await sleep(15000);
    }

    updateTemplates();
}

updateTemplates();

let oauth = new DiscordOauth2();

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

async function getOauthUri(scope, path) {
    if (!scope) scope = ['identify'];

    let url = 'https://discord.com/api/oauth2/authorize?';
    url += `client_id=${config.clientId}`;
    url += '&response_type=code';
    url += '&prompt=none';
    url += `&redirect_uri=${encodeURIComponent(config.redirectUri)}`;
    url += `&scope=${scope.join('%20')}`;
    url += `&state=${encodeURIComponent(path)}`;

    if (scope.includes('guilds.join')) url += ':true';
    else url += ':false';

    return url;
}

async function checkLogin(req, res, next) {
    let url = await getOauthUri(null, req.originalUrl.split()[0]);

    if (res.locals.user == null) {
        res.redirect(url);
        return;
    }

    next();
}

async function checkTemplate(req, res, next) {
    let template = db.prepare('SELECT * FROM template WHERE guild=?').get(req.params.id);

    if (template == null) return errors.sendError404(req, res);

    let template2 = await api.fetchTemplate(template.id);
    if (template2 === false) return errors.sendError(req, res, 'This template was deleted.');
    if (template2 == null) return errors.sendError500(req, res);

    res.locals.template = {
        tags: [template.tag1, template.tag2],
        ...template2
    };

    next();
}

require('express-async-errors');

let app = express();
app.locals.moment = require('moment');
app.set('x-powered-by', false);
app.set('view engine', 'ejs');
app.use(timeout(12000));
app.use(express.static('static'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(authUser);

app.get('/login', checkLogin, async (req, res) => {
    res.header('X-Robots-Tag', 'noindex');
    res.redirect('/');
});

app.get('/callback', async (req, res) => {
    if (req.query.code == null) return errors.sendError400(req, res);

    let path = '/';
    let joinGuild = false;

    if (req.query.state != null) {
        let state = decodeURIComponent(req.query.state).split(':');
        if (state.length >= 1) path = state[0];
        if (state.length >= 2 && state[1] === 'true') joinGuild = true;
    }

    if (!path.startsWith('/')) path = '/';

    async function authUser(code, scope) {
        let auth = await oauth.tokenRequest({
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            code: code,
            scope: scope,
            grantType: 'authorization_code',
            redirectUri: config.redirectUri
        });

        let user = await oauth.getUser(auth.access_token);

        if (scope.includes('guilds.join')) {
            await oauth.addMember({
                accessToken: auth.access_token,
                botToken: config.botToken,
                guildId: config.guildId,
                userId: user.id
            });
        }

        return {
            token: auth.access_token,
            ...user
        };
    }

    let user;

    try {
        if (joinGuild) {
            user = await authUser(req.query.code, ['identify', 'guilds.join']);
        } else {
            user = await authUser(req.query.code, ['identify']);
        }
    } catch (err) {
        errors.sendError401(req, res);
        return;
    }

    await loginHook.send({
        embeds: [{
            title: 'User Logged In',
            color: 0x00FF00,
            description: `${user.username}#${user.discriminator} (${user.id})`,
            timestamp: Date.now()
        }]
    });

    if (user.avatar == null) user.avatar = '';

    db.prepare('INSERT OR IGNORE INTO user VALUES (?, ?, ?, ?, ?)')
        .run(user.id, user.username, user.avatar, user.discriminator, Date.now().toString());
    db.prepare('UPDATE user SET username=?, avatar=?, discriminator=? WHERE id=?')
        .run(user.username, user.avatar, user.discriminator, user.id);

    let token = jwt.signToken(user.token);

    res.cookie('auth', token, {
        maxAge: 604800000
    }).redirect(path);
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

app.get('/', async (req, res) => {
    let data = {
        user: res.locals.user,
        top: db.prepare('SELECT * FROM template ORDER BY usage DESC LIMIT 6').all(),
        recent: db.prepare('SELECT * FROM template ORDER BY added DESC LIMIT 6').all(),
        community: db.prepare('SELECT * FROM template WHERE (tag1=? OR tag2=?) ORDER BY RANDOM() DESC LIMIT 6')
            .all('community', 'community'),
        gaming: db.prepare('SELECT * FROM template WHERE (tag1=? OR tag2=?) ORDER BY RANDOM() DESC LIMIT 6')
            .all('gaming', 'gaming'),
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
    let page = 0;
    let templates = [];
    let query = '';

    if (req.query.q != null) {
        query = req.query.q;

        if (req.query.page != null) {
            page = parseInt(req.query.page);
            if (isNaN(page) || page < 1) return errors.sendError400(req, res);

            page -= 1;
        }

        templates = db
            .prepare('SELECT * FROM template WHERE name LIKE ? ORDER BY LENGTH(name), usage DESC LIMIT 12 OFFSET ?')
            .all(`%${query}%`, page * 12);
    }

    let data = {
        user: res.locals.user,
        templates: templates,
        query: query,
        page: page + 1
    };

    res.render('search', data);
});

app.get('/tags/:id', async (req, res) => {
    if (!tags.find(element => element.toLowerCase() === req.params.id)) return errors.sendError404(req, res);

    let page = 0;

    if (req.query.page != null) {
        page = parseInt(req.query.page);
        if (isNaN(page) || page < 1) return errors.sendError400(req, res);

        page -= 1;
    }

    let templates = db
        .prepare('SELECT * FROM template WHERE (tag1=? OR tag2=?) ORDER BY usage DESC LIMIT 12 OFFSET ?')
        .all(req.params.id, req.params.id, page * 12);

    let data = {
        user: res.locals.user,
        templates: templates,
        tag: req.params.id,
        page: page + 1
    };

    res.render('tag', data);
});

app.get('/templates/new', checkLogin, async (req, res) => {
    let data = {
        user: res.locals.user
    };

    if (req.query.code != null) {
        data.template = await api.fetchTemplate(req.query.code);

        if (data.template === false) return errors.sendError(req, res, 'Unknown server template.');
        if (data.template == null) return errors.sendError500(req, res);

        if (res.locals.user.admin === false && data.template.creator_id !== res.locals.user.id) {
            return errors.sendError(req, res, 'You can only add your own template.');
        }

        if (db.prepare('SELECT * FROM template WHERE id=?').get(req.query.code) != null) {
            return errors.sendError(req, res, 'This template was already added.');
        }
    }

    res.render('new_template', data);
});

app.post('/templates/new', checkLogin, async (req, res) => {
    if (req.body.code == null) return errors.sendError400(req, res);

    if (req.body.tag1 == null || !tags.includes(req.body.tag1)) return errors.sendError400(req, res);
    if (req.body.tag2 !== 'None' && !tags.includes(req.body.tag2)) return errors.sendError400(req, res);
    if (req.body.tag1 === req.body.tag2) return errors.sendError(req, res, 'The tags cannot be the same.');

    if (db.prepare('SELECT * FROM template WHERE id=?').get(req.body.code) != null) {
        return errors.sendError(req, res, 'This template was already added.');
    }

    let template = await api.fetchTemplate(req.body.code);

    if (template === false) return errors.sendError(req, res, 'Unknown server template.');
    if (template == null) return errors.sendError500(req, res);

    if (res.locals.user.admin === false && template.creator_id !== res.locals.user.id) {
        return errors.sendError(req, res, 'You can only add your own template.');
    }

    await actionHook.send({
        embeds: [{
            title: 'Template Added',
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

    if (template.description == null) template.description = '';

    db.prepare('INSERT INTO template VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(template.code, template.name, template.description, template.usage_count, template.creator_id,
            template.source_guild_id, req.body.tag1, req.body.tag2, Date.now().toString());

    return errors
        .sendCustom(req, res, 'OK', 'Template Added', 'The template was added successfully. Thanks!',
            'Join Discord', '/discord');
});

app.get('/templates/:id', checkTemplate, async (req, res) => {
    let data = {
        user: res.locals.user,
        template: res.locals.template,
        redirectUri: await getOauthUri(['identify', 'guilds.join'], req.originalUrl.split()[0] + '/use')
    };

    res.render('template', data);
});

app.get('/templates/:id/use', checkLogin, checkTemplate, async (req, res) => {
    res.redirect('https://discord.new/' + res.locals.template.code);
});

app.get('/templates/:id/edit', checkLogin, checkTemplate, async (req, res) => {
    if (res.locals.user.id !== res.locals.template.creator_id && res.locals.user.admin === false) {
        return errors.sendError403(req, res);
    }

    let data = {
        user: res.locals.user,
        template: res.locals.template,
    };

    res.render('edit_template', data);
});

app.post('/templates/:id/edit', checkLogin, checkTemplate, async (req, res) => {
    if (res.locals.user.id !== res.locals.template.creator_id && res.locals.user.admin === false) {
        return errors.sendError403(req, res);
    }

    if (req.body.tag1 == null || !tags.includes(req.body.tag1)) return errors.sendError400(req, res);
    if (req.body.tag2 !== 'None' && !tags.includes(req.body.tag2)) return errors.sendError400(req, res);
    if (req.body.tag1 === req.body.tag2) return errors.sendError(req, res, 'The tags cannot be the same.');

    await actionHook.send({
        embeds: [{
            title: 'Template Edited',
            color: 0xFFD700,
            fields: [
                {
                    name: 'Template',
                    value: `${config.baseUri}/templates/${req.params.id}`,
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

    db.prepare('UPDATE template SET tag1=?, tag2=? WHERE id=?')
        .run(req.body.tag1, req.body.tag2, res.locals.template.code);

    errors
        .sendCustom(req, res, 'OK', 'Template Edited', 'The template was edited successfully.',
            'View Template', '/templates/' + req.params.id);
});

app.post('/templates/:id/delete', checkLogin, checkTemplate, async (req, res) => {
    if (res.locals.user.id !== res.locals.template.creator_id && res.locals.user.admin === false) {
        return errors.sendError403(req, res);
    }

    await actionHook.send({
        embeds: [{
            title: 'Template Deleted',
            color: 0xFF0000,
            fields: [
                {
                    name: 'Template',
                    value: `https://discord.new/${res.locals.template.code}`,
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
    let templates = db.prepare('SELECT * FROM template WHERE creator=? ORDER BY usage DESC').all(req.params.id);
    if (user == null || templates.length === 0) return errors.sendError404(req, res);

    let data = {
        user: res.locals.user,
        profile: user,
        templates: templates,
    };

    res.render('user', data);
});

let map;

function generateSitemap() {
    let templates = db.prepare('SELECT guild FROM template').all();
    let users = db.prepare('SELECT id FROM user WHERE id IN (SELECT creator FROM template)').all();

    map = sitemap({
        http: 'https',
        url: 'discordtemplates.me',
        sitemapSubmission: '/sitemap.xml',
        generate: app,
        hideByRegex: [/:id/],
        route: {
            '/login': {
                disallow: true
            },
            '/logout': {
                disallow: true
            },
            '/callback': {
                disallow: true
            },
            '/admin': {
                disallow: true
            },
            '/discord': {
                disallow: true
            },
            '/templates/new': {
                disallow: true
            }
        }
    });

    map.map = {
        ...map.map,
        ...(() => {
            let obj = {};
            tags.forEach(element => {
                obj['/tags/' + element.toLowerCase()] = ['get'];
            });
            return obj;
        })(),
        ...(() => {
            let obj = {};
            templates.forEach(element => {
                obj['/templates/' + element.guild] = ['get'];
            });
            return obj;
        })(),
        ...(() => {
            let obj = {};
            users.forEach(element => {
                obj['/users/' + element.id] = ['get'];
            });
            return obj;
        })()
    };
}

generateSitemap();
setInterval(() => generateSitemap(), 60000);

app.get('/sitemap.xml', async (req, res) => {
    map.XMLtoWeb(res);
});

app.get('/robots.txt', async (req, res) => {
    map.TXTtoWeb(res);
});

app.get('/ads.txt', async (req, res) => {
    let body = await request('https://api.nitropay.com/v1/ads-854.txt');
    body += `\n\n# Viewdeos
viewdeos.com, 6268eb6ac8e4ca7c0137fe94, DIRECT
ad-generation.jp, 12474, RESELLER, 7f4ea9029ac04e53
adapex.io, s1632, DIRECT
adiiix.com, pub-AA7DA8849D8379630883367B8A7643DA, DIRECT
admanmedia.com, 43, RESELLER
admanmedia.com, 726, RESELLER
advertising.com, 12287, DIRECT
advertising.com, 23089, RESELLER
advertising.com, 28246, RESELLER
advertising.com, 7574, RESELLER
adyoulike.com, b4bf4fdd9b0b915f746f6747ff432bde, RESELLER, 4ad745ead2958bf7
aniview.com, 57173f460757bb6c428b465b, RESELLER, 78b21b97965ec3f8
aol.com, 58905, RESELLER, e1a5b5b6e3255540
appnexus.com, 10490, RESELLER, f5ab79cb980f11d1
appnexus.com, 12637, RESELLER, f5ab79cb980f11d1
appnexus.com, 1356, RESELLER, f5ab79cb980f11d1
appnexus.com, 1908, RESELLER, f5ab79cb980f11d1
appnexus.com, 3663, RESELLER, f5ab79cb980f11d1
appnexus.com, 3703, RESELLER, f5ab79cb980f11d1
appnexus.com, 4052, RESELLER, f5ab79cb980f11d1
appnexus.com, 7847, DIRECT, f5ab79cb980f11d1
appnexus.com, 7847, RESELLER, f5ab79cb980f11d1
appnexus.com, 8233, RESELLER, f5ab79cb980f11d1
appnexus.com, 9382, RESELLER, f5ab79cb980f11d1
aps.amazon.com, 1ad7261b-91ea-4b6f-b9e9-b83522205b75, DIRECT
aralego.com, pub-AA7DA8849D8379630883367B8A7643DA, DIRECT
axonix.com, 57264, RESELLER
beachfront.com, 14205, DIRECT, e2541279e8e2ca4d
chocolateplatform.com, 13790, DIRECT
contextweb.com, 560288, RESELLER, 89ff185a4c4e857c
contextweb.com, 561998, RESELLER, 89ff185a4c4e857c
contextweb.com, 562060, DIRECT, 89ff185a4c4e857c
contextweb.com, 562541, RESELLER, 89ff185a4c4e857c
conversantmedia.com, 100195, DIRECT, 03113cd04947736d
districtm.io, 100962, RESELLER, 3fd707be9c4527c3
districtm.io, 101760, RESELLER, 3fd707be9c4527c3
emxdgt.com, 2009, RESELLER, 1e1d41537f7cad7f
emxdgt.com, 68, DIRECT, 1e1d41537f7cad7f
freewheel.tv, 1163521, RESELLER
freewheel.tv, 1164257, RESELLER
freewheel.tv, 20393, RESELLER
freewheel.tv, 24377, RESELLER
google.com, pub-1062972861553303, RESELLER, f08c47fec0942fa0
google.com, pub-3565385483761681, RESELLER, f08c47fec0942fa0
google.com, pub-3769010358500643, RESELLER, f08c47fec0942fa0
google.com, pub-5717092533913515, RESELLER, f08c47fec0942fa0
google.com, pub-6346866704322274, RESELLER, f08c47fec0942fa0
google.com, pub-7171208642811509, DIRECT, f08c47fec0942fa0
gumgum.com, 14141, RESELLER, ffdef49475d318a9
indexexchange.com, 184311, DIRECT, 50b1c356f2c5c8fc
indexexchange.com, 187063, DIRECT, 50b1c356f2c5c8fc
indexexchange.com, 192410, RESELLER, 50b1c356f2c5c8fc
lijit.com, 375328, RESELLER, fafdf38b16bf6b2b
lijit.com, 376385, RESELLER, fafdf38b16bf6b2b
lijit.com, 376385-eb, RESELLER, fafdf38b16bf6b2b
lkqd.net, 770, DIRECT, 59c49fa9598a0117
loopme.com, 5679, RESELLER, 6c8d5f95897a5a3b
onetag.com, 71eac8c50a03810, DIRECT
openx.com, 537144083, RESELLER, 6a698e2ec38604c6
openx.com, 537149888, RESELLER, 6a698e2ec38604c6
openx.com, 540191398, RESELLER, 6a698e2ec38604c6
openx.com, 540251318, RESELLER, 6a698e2ec38604c6
openx.com, 540323914, RESELLER, 6a698e2ec38604c6
pubmatic.com, 148803, DIRECT, 5d62403b186f2ace
pubmatic.com, 154037, RESELLER, 5d62403b186f2ace
pubmatic.com, 156325, RESELLER, 5d62403b186f2ace
pubmatic.com, 156377, RESELLER, 5d62403b186f2ace
pubmatic.com, 156439, RESELLER, 5d62403b186f2ace
pubmatic.com, 156538, RESELLER, 5d62403b186f2ace
pubmatic.com, 157150, RESELLER, 5d62403b186f2ace
pubmatic.com, 157246, DIRECT, 5d62403b186f2ace
pubmatic.com, 157904, RESELLER, 5d62403b186f2ace
pubmatic.com, 160006, RESELLER, 5d62403b186f2ace
pubmatic.com, 160096, RESELLER, 5d62403b186f2ace
pubmatic.com, 160114, RESELLER, 5d62403b186f2ace
pubmatic.com, 160993, RESELLER, 5d62403b186f2ace
pubmatic.com, 161335, RESELLER, 5d62403b186f2ace
pubmatic.com, 161598, RESELLER, 5d62403b186f2ace
pubmatic.com, 81564, RESELLER, 5d62403b186f2ace
pubnative.net, 1006576, RESELLER, d641df8625486a7b
rhythmone.com, 1022945102, DIRECT, a670c89d4a324e47
rhythmone.com, 144927031, DIRECT, a670c89d4a324e47
rhythmone.com, 1654642120, RESELLER, a670c89d4a324e47
rhythmone.com, 2147483647, RESELLER, a670c89d4a324e47
rhythmone.com, 2564526802, RESELLER, a670c89d4a324e47
rhythmone.com, 3350674472, DIRECT, a670c89d4a324e47
rhythmone.com, 3880497124, RESELLER, a670c89d4a324e47
richaudience.com, 1ru8dKmJJV, DIRECT
rubiconproject.com, 11006, RESELLER, 0bfd66d529a55807
rubiconproject.com, 13510, RESELLER, 0bfd66d529a55807
rubiconproject.com, 13918, RESELLER, 0bfd66d529a55807
rubiconproject.com, 16114, RESELLER, 0bfd66d529a55807
rubiconproject.com, 18020, RESELLER, 0bfd66d529a55807
rubiconproject.com, 18132, DIRECT, 0bfd66d529a55807
sharethrough.com, 7144eb80, RESELLER
smaato.com, 1100044045, RESELLER, 07bcf65f187117b4
smaato.com, 1100044650, RESELLER, 07bcf65f187117b4
smartadserver.com, 4071, RESELLER
smartadserver.com, 4125, RESELLER, 060d053dcf45cbf3
smartadserver.com, 4274, RESELLER
sonobi.com, 88a5b885c6, DIRECT, d1a215d9eb5aee9e
sovrn.com, 375328, RESELLER, fafdf38b16bf6b2b
sovrn.com, 376385, RESELLER, fafdf38b16bf6b2b
supply.colossusssp.com, 326, DIRECT, 6c5b49d96ec1b458
synacor.com, 82171, RESELLER, e108f11b2cdf7d5b
themediagrid.com, jtqkmp, RESELLER, 35d5010d7789b49d
ucfunnel.com, pub-AA7DA8849D8379630883367B8A7643DA, DIRECT
vdopia.com, 13790, DIRECT
video.unrulymedia.com, 144927031, DIRECT
video.unrulymedia.com, 2147483647, RESELLER, a670c89d4a324e47
video.unrulymedia.com, 3350674472, DIRECT
xad.com, 958, RESELLER, 81cbf0a75a5e0e9a
xandr.com, 7847, DIRECT, f5ab79cb980f11d1
xandr.com, 7847, RESELLER, f5ab79cb980f11d1
yahoo.com, 55029, RESELLER, e1a5b5b6e3255540
yahoo.com, 55317, RESELLER, e1a5b5b6e3255540
yahoo.com, 58905, RESELLER, e1a5b5b6e3255540
yahoo.com, 59194, RESELLER, e1a5b5b6e3255540
yahoo.com, 59244, RESELLER, e1a5b5b6e3255540
yahoo.com, 59608, RESELLER, e1a5b5b6e3255540`

    res.header('Content-Type', 'text/plain');
    res.send(body);
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
    console.log(`App listening on port 8080.`);
});

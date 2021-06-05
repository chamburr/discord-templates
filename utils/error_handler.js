function sendError400(req, res) {
    let data = {
        user: res.locals.user,
        heading: '400',
        title: 'Bad Request',
        description: 'The request you made is invalid.'
    };

    res.status(400).render('error', data);
}

function sendError401(req, res) {
    let data = {
        user: res.locals.user,
        heading: '401',
        title: 'Unauthorised',
        description: 'You are not authorized to access this page.'
    };

    res.status(401).render('error', data);
}

function sendError403(req, res) {
    let data = {
        user: res.locals.user,
        heading: '403',
        title: 'Forbidden',
        description: 'You do not have permission to access this page.'
    };

    res.status(403).render('error', data);
}

function sendError404(req, res) {
    let data = {
        user: res.locals.user,
        heading: '404',
        title: 'Page Not Found',
        description: 'The page you are looking for does not exist.'
    };

    res.status(404).render('error', data);
}

function sendError500(req, res) {
    let data = {
        user: res.locals.user,
        heading: '500',
        title: 'Internal Server Error',
        description: 'The server encountered an internal error.'
    };

    res.status(500).render('error', data);
}

function sendError503(req, res) {
    let data = {
        user: res.locals.user,
        heading: '503',
        title: 'Service Unavailable',
        description: 'The server cannot handle your request at this time.'
    };

    res.status(503).render('error', data);
}

function sendError(req, res, description) {
    let data = {
        user: res.locals.user,
        heading: 'ERR',
        title: 'An Error Occurred',
        description: description
    };

    res.render('error', data);
}

function sendCustom(req, res, heading, title, description, buttonText, buttonLink) {
    let data = {
        user: res.locals.user,
        heading: heading,
        title: title,
        description: description,
        buttonText: buttonText,
        buttonLink: buttonLink
    };

    res.render('error', data);
}

module.exports = {
    sendError400,
    sendError401,
    sendError403,
    sendError404,
    sendError500,
    sendError503,
    sendError,
    sendCustom
};

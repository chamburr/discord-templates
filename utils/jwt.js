const jwt = require('jsonwebtoken');

const config = require('../config.json');

function signToken(token) {
    return jwt.sign({
        token: token,
        iat: Date.now()
    }, config.jwtToken);
}

function verifyToken(token) {
    try {
        return jwt.verify(token, config.jwtToken).token;
    } catch (err) {
        return null;
    }
}

module.exports = {
    signToken,
    verifyToken
};

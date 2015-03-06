var passport = require('passport'),
    GitHubStrategy = require('passport-github').Strategy,
    config = require('./config');

passport.serializeUser(function(user, done) {
    var sessionUser = {username: user.username, displayName: user.displayName, avatar_url: user._json.avatar_url, github_id: user.id}
    done(null, sessionUser);
});

passport.deserializeUser(function(sessionUser, done) {
    done(null, sessionUser);
});

passport.use(new GitHubStrategy({
        clientID: config.get('GITHUB_CLIENT_ID'),
        clientSecret: config.get('GITHUB_CLIENT_SECRET'),
        callbackURL: config.get('GITHUB_CALLBACK')
    }, function(accessToken, refreshToken, profile, done) {
        return done(null, profile);
    })
);

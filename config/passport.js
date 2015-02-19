var passport = require('passport'),
    GitHubStrategy = require('passport-github').Strategy,
    config = require('./config');

passport.serializeUser(function(user, done) {
    var sessionUser = {name: user.displayName, avatar: user._json.avatar_url, github_id: user.id}
    done(null, sessionUser);
});

passport.deserializeUser(function(sessionUser, done) {
    done(null, sessionUser);
});

passport.use(new GitHubStrategy({
        clientID: config.github_clientID,
        clientSecret: config.github_clientSecret,
        callbackURL: config.github_callback
    }, function(accessToken, refreshToken, profile, done) {
        // create persistent store user if not found in db
        return done(null, profile);
    })
);

module.exports = function (req, res, next) {
    if (req.isAuthenticated()) 
        return next();
    res.redirect('/login')
};

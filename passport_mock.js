var User = require('./models').User;
var FeedManager = require('getstream-node').FeedManager;

module.exports = {
  initialize: function(sessionUserObject) {
    return function(req, res, next) {
        var passport = this;

        User.findOne({username: 'Andrew'}, function(err, found){
            if (err) console.log(err);

            found.github_id = 639382;
            found.displayName = 'Andrew';

            passport._key = 'passport';
            passport._userProperty = 'user';

            passport.serializeUser = function(user, done) {
              return done(null, user);
            };
            passport.deserializeUser = function(user, req, done) {
              return done(null, user);
            };

            req._passport = {
              instance: passport
            };

            req._passport.session = {
              user: found
            };

            next();
        });
    };
  }
};

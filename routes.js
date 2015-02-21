var express = require('express'),
    passport = require('passport'),
    ensureAuthenticated = require('./config/passport'),
    models = require('./models'),
    fixtures = require('./fixtures');

var router = express.Router(),
    User = models.user;

router.get('/', function(req, res){
    res.render('trending', {location: 'trending',user: req.user, stuff: [1, 2]});
});

router.get('/account', ensureAuthenticated, function(req, res){
    res.render('account', {user: req.user});
});

router.get('/login', function(req, res){
    if (req.isAuthenticated())
        return res.redirect('/');
    res.render('login', {user: req.user});
});

router.get('/auth/github', passport.authenticate('github'));

router.get('/auth/github/callback', 
    passport.authenticate('github', {failureRedirect: '/login'}),
    function(req, res) {
        User.findOne({displayName: req.user.displayName}, function(err, foundUser){
            if (!foundUser){
                User.create({displayName: req.user.displayName, avatar_url: req.user._json.avatar_url},
                function(err, newUser){
                    if (err){
                        return console.log(err);
                    }
                });
            }
            return res.redirect('/');
        });
    }
);

router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

router.get('/fixtures', function(req, res){
    fixtures();

    res.send('fixtures ok');
});

module.exports = router;

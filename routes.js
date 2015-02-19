var express = require('express'),
    passport = require('passport'),
    ensureAuthenticated = require('./config/passport');

var router = express.Router();

router.get('/', function(req, res){
    res.render('index', {user: req.user});
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
        res.redirect('/');
    }
);

router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

module.exports = router;

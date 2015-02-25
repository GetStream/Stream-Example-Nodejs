var config = require('./config/config'),
    express = require('express'),
    passport = require('passport'),
    ensureAuthenticated = require('./config/passport'),
    models = require('./models'),
    fixtures = require('./fixtures'),
    _ = require('underscore');

var stream = require('getstream');
var client = stream.connect(config.stream_key, config.stream_secret, config.stream_app_id);

var router = express.Router(),
    User = models.user,
    Item = models.item,
    Pin = models.pin;


router.get('/', function(req, res){
    Item.find({}).populate('user').lean().exec(function(err, popular){
        if (err)
            return console.log(err);
        if (!req.isAuthenticated())
            return res.render('trending', {location: 'trending',user: req.user, stuff: popular});

        User.findOne({username: req.user.username}).select('_id').lean().exec(function(err, user){
            Pin.find({user: user._id}).select('item -_id').lean().exec(function(err, pinned_items){
                var pinned_items_ids = _.pluck(pinned_items, 'item');

                _.each(popular, function(item){
                    if (pinned_items_ids.indexOf(item._id) >= 0){
                        item.pinned = true;
                    }
                });

                return res.render('trending', {location: 'trending', user: req.user, stuff: popular});
            })
        });
    });
});

router.get('/people', ensureAuthenticated, function(req, res){
    User.find({}).nor([{username: req.user.username}, {_id: 1}]).exec(function(err, people){
        return res.render('people', {location: 'people', user: req.user, people: people, path: req.url, show_feed: false});
    })
});

router.get('/account', ensureAuthenticated, function(req, res){
    res.render('account', {user: req.user});
});

router.get('/login', function(req, res){
    if (req.isAuthenticated())
        return res.redirect('/');

    res.render('login', {location: 'people', user: req.user});
});

router.get('/auth/github', passport.authenticate('github'));

router.get('/auth/github/callback', 
    passport.authenticate('github', {failureRedirect: '/login'}),
    function(req, res) {
        User.findOne({username: req.user.username}, function(err, foundUser){
            if (!foundUser){
                User.create({username: req.user.username, avatar_url: req.user._json.avatar_url},
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

router.post('/follow', ensureAuthenticated, function(req, res){
    User.findOne({username: req.user.username}, function(err, foundUser){
        var flatFeed = client.feed('flat', foundUser._id);
        var aggregatedFeed = client.feed('aggregated', foundUser._id);
        var data = {user: foundUser._id, target: req.body.target};

        Follow.findOne(data, function(err, foundFollow){
            if (foundFollow){
                flatFeed.unfollow('user', req.body.target)
                aggregatedFeed.unfollow('user', req.body.target)

                foundFollow.remove();
            }
            else {
                Follow.create(data, function(err, insertedFollow){
                    flatFeed.follow('user', req.body.target)
                    aggregatedFeed.follow('user', req.body.target)
                });
            }

            res.set('Content-Type', 'application/json');
            return res.send({'pin': {'id': req.body.item}});
        });
    });
});

router.post('/pin', ensureAuthenticated, function(req, res){
    User.findOne({username: req.user.username}, function(err, foundUser){
        var user = client.feed('user', foundUser._id);
        var data = {user: foundUser._id, item: req.body.item};

        Pin.findOne(data, function(err, foundPin){
            if (foundPin){
                user.removeActivity({foreignId: 'pin:' + foundPin._id});
                foundPin.remove();
            }
            else {
                Pin.create(data, function(err, insertedPin){
                    var activity = {
                                    'actor': 'user:' + foundUser._id,
                                    'verb': 'pin',
                                    'object': 'pin:' + req.body.item,
                                    'foreign_id': 'pin:' + insertedPin._id
                                    };

                    user.addActivity(activity, function(error, response, body) {
                        if (error){
                            console.log(error)
                        }
                    });
                });
            }

            res.set('Content-Type', 'application/json');
            return res.send({'pin': {'id': req.body.item}});
        })
    });
});

module.exports = router;

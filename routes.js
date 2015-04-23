var config = require('./config/config'),
    express = require('express'),
    models = require('./models'),
    passport = require('passport'),
    _ = require('underscore'),
    async = require('async'),
    stream_node = require('getstream-node'),
    fs = require('fs'),
    bodyParser     = require('body-parser'),
    methodOverride = require('method-override');

var router = express.Router(),
    User = models.User,
    Item = models.Item,
    Pin = models.Pin,
    Follow = models.Follow;

var FeedManager = stream_node.FeedManager;
var StreamMongoose = stream_node.mongoose;
var StreamBackend = new StreamMongoose.Backend();

var ensureAuthenticated = function(req, res, next){
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

var did_i_pin_it = function(items, pins){
    var pinned_items_ids = _.map(pins, function(pin) { return pin.item.toHexString() });
    _.each(items, function(item){
        if (pinned_items_ids.indexOf(item._id.toHexString()) !== -1){
            item.pinned = true;
        }
    });
};

var did_i_follow = function(users, followers){
    var followed_users_ids = _.map(followers, function(item) { return item.target.toHexString() });
    _.each(users, function(user){
        if (followed_users_ids.indexOf(user._id.toHexString()) !== -1) {
            user.followed = true
        }
    });
};

router.use(function (req, res, next) {
    res.locals = {
        StreamConfigs: stream_node.settings,
        NotificationFeed: FeedManager.getNotificationFeed(req.user._id)
    };
    next();
});

router.use(function (error, req, res, next) {
    if (!error) {
        next();
    } else {
        console.error(error.stack);
        res.send(500);
    }
});

router.use(function(req, res, next){
    if (!req.isAuthenticated()) {

      return next();

    } else if(!req.user.id) {

        User.findOne({username: req.user.username}).lean().exec(function(err, user){
            if (err) return next(err);

            notificationFeed = FeedManager.getNotificationFeed(user._id);

            req.user.id = user._id;
            req.user.token = notificationFeed.token;
            req.user.APP_ID = FeedManager.settings.apiAppId;
            req.user.APP_KEY = FeedManager.settings.apiKey;

            notificationFeed.get({limit: 0}, function(err, response, body){
                if (typeof body !== 'undefined') req.user.unseen = body.unseen;
                next();
            });
        });

    } else {
        next();
    }
});


/*******************************
    Support DELETE from forms
*******************************/

router.use(bodyParser.urlencoded())
router.use(methodOverride(function(req, res){
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    var method = req.body._method
    delete req.body._method
    return method
  }
}))

router.get('/', function(req, res, next){
    Item.find({}).populate('user').lean().exec(function(err, popular){
        if (err)
            return next(err);

        if (req.isAuthenticated()){
            Pin.find({user: req.user.id}).lean().exec(function(err, pinned_items){
                did_i_pin_it(popular, pinned_items);
                return res.render('trending', {location: 'trending', user: req.user, stuff: popular});
            });
        } else
            return res.render('trending', {location: 'trending', user: req.user, stuff: popular});
    });
});

/******************
  Flat Feed
******************/

router.get('/flat', ensureAuthenticated, function(req, res, next){
    var flatFeed = FeedManager.getNewsFeeds(req.user.id)['flat'];

    flatFeed.get({}, function(err, response, body){
        if (err) return next(err);

        var activities = body.results;
        StreamBackend.serializeActivities(activities);

        StreamBackend.enrichActivities(activities,
          function(err, enrichedActivities){
            return res.render('feed', {location: 'feed', user: req.user, activities: enrichedActivities, path: req.url});
          }
        );
        
    });
});

/******************
  Aggregated Feed
******************/

router.get('/aggregated_feed', ensureAuthenticated, function(req, res, next){
    var aggregatedFeed = FeedManager.getNewsFeeds(req.user.id)['aggregated'];

    aggregatedFeed.get({}, function(err, response, body){
        if (err) return next(err);

        var activities = body.results;
        
        StreamBackend.serializeActivities(activities);

        StreamBackend.enrichAggregatedActivities(activities, function(err, enrichedActivities){
            return res.render('aggregated_feed', {location: 'aggregated_feed', user: req.user, activities: enrichedActivities, path: req.url});
        });
    });
});

/******************
  Notification Feed
******************/

router.get('/notification_feed/', ensureAuthenticated, function(req, res){
    var notificationFeed = FeedManager.getNotificationFeed(req.user.id);

    notificationFeed.get({mark_read:true, mark_seen: true}, function(err, response, body){
        if (err) return next(err);

        activities = body.results;
        StreamBackend.serializeActivities(activities);

        if (activities.length == 0) {
            return res.send('');
        } else {
            req.user.unseen = 0;

            StreamBackend.enrichActivities(activities[0].activities,
              function(err, enrichedActivities){
                return res.render('notification_follow', {lastFollower: enrichedActivities[0], count: enrichedActivities.length, layout: false});
              }
            );
        }
    });
});

/******************
  People
******************/

router.get('/people', ensureAuthenticated, function(req, res){
    User.find({}).lean().exec(function(err, people){
        Follow.find({user: req.user.id}).exec(function(err, follows){
            if (err) return next(err);
            did_i_follow(people, follows);
            return res.render('people', {location: 'people', user: req.user, people: people, path: req.url, show_feed: false});
        });
    })
});

/******************
  User Profile
******************/

router.get('/profile', ensureAuthenticated, function(req, res, next){
    var userFeed = FeedManager.getUserFeed(req.user.id);

    userFeed.get({}, function(err, response, body){
        if (err) return next(err);
        var activities = body.results;
        StreamBackend.enrichActivities(activities,
          function(err, enrichedActivities){
            return res.render('profile', {location: 'profile', user: req.user, profile_user: req.user, activities: enrichedActivities, path: req.url, show_feed: true});
          }
        );
    });
});

router.get('/profile/:user', ensureAuthenticated, function(req, res){
    User.findOne({username: req.params.user}, function(err, foundUser){
        if (err) return next(err);

        if (!foundUser) return res.send('User ' + req.params.user + ' not found.')

        var flatFeed = FeedManager.getNewsFeeds(req.user.id)['flat'];

        flatFeed.get({}, function(err, response, body){
            if (err) return next(err);

            var activities = response.body.results;
            StreamBackend.serializeActivities(activities);

            StreamBackend.enrichActivities(activities,
              function(err, enrichedActivities){
                return res.render('profile', {location: 'profile', user: req.user, profile_user: foundUser, activities: enrichedActivities, path: req.url, show_feed: true});
              }
            );
            
        });
    });
});

/******************
  Account
******************/

router.get('/account', ensureAuthenticated, function(req, res){
    res.render('account', {user: req.user});
});

/******************
  Auth
******************/

router.get('/login', function(req, res){
    if (req.isAuthenticated())
        return res.redirect('/');

    res.render('login', {location: 'people', user: req.user});
});

router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

router.get('/auth/github', passport.authenticate('github'));

router.get('/auth/github/callback', 
    passport.authenticate('github', {failureRedirect: '/login'}),
    function(req, res) {
        User.findOne({username: req.user.username}, function(err, foundUser){
            if (!foundUser){
                User.create({username: req.user.username, avatar_url: req.user._json.avatar_url}, function(err, newUser){
                    if (err)
                        return next(err);
                    
                    return res.redirect('/');
                });
            } else
                return res.redirect('/');
        });
    }
);

/******************
  Follow
******************/

router.post('/follow', ensureAuthenticated, function(req, res, next){
    User.findOne({_id: req.body.target}, function(err, target) {
        if (target) {
            var followData = {user: req.user, target: req.body.target};
            var follow = new Follow(followData);
            follow.save(function(err) {
                if (err) next(err);
                res.set('Content-Type', 'application/json');
                return res.send({'follow': {'id': req.body.target}});
            });
        } else {
            res.status(404).send('Not found');
        }
    });
});

router.delete('/follow', ensureAuthenticated, function(req, res) {
    Follow.findOne({user: req.user, target: req.body.target}, function(err, follow) {
        if (follow) {
            follow.remove(function(err) {
                if (err) next(err);
                res.set('Content-Type', 'application/json');
                return res.send({'follow': {'id': req.body.target}});
            });
        } else {
            res.status(404).send('Not found');
        }
    });
});

/******************
  Pin
******************/

router.post('/pin', ensureAuthenticated, function(req, res, next){
    Item.findOne({_id: req.body.item}, function(err, item){
        if (item) {
            var pinData = {user: req.user, item: item};
            var pin = new Pin(pinData);
            pin.save(function(err) {
                if (err) next(err);
                res.set('Content-Type', 'application/json');
                return res.send({'pin': {'id': req.body.item}});
            });
        } else {
            res.status(404).send('Not found');
        }
    });
});

router.delete('/pin', ensureAuthenticated, function(req, res) {
    var user = req.user;
    var pinData = {user: req.user.id, item: req.body.item};

    Pin.findOne(pinData, function(err, foundPin){
        if (foundPin) {
            foundPin.remove();
        }
    });

    res.set('Content-Type', 'application/json');
    return res.send({'pin': {'id': req.body.item}});
});

/******************
  Auto Follow
******************/

router.get('/auto_follow/', ensureAuthenticated, function(req, res, next){
    var followData = {user: req.user, target: req.user};
    res.set('Content-Type', 'application/json');

    Follow.findOne(followData, function(err, foundFollow){
        if (!foundFollow) {
            record = new Follow(followData);
            record.save(function(err) {
                if (err) next(err);
                return res.send({'follow': {'id': record._id}});
            });
        } else {
            return res.send({});
        }
    });
});

module.exports = router;

var config = require('./config/config'),
    express = require('express'),
    models = require('./models'),
    passport = require('passport'),
    _ = require('underscore'),
    async = require('async'),
    stream = require('getstream'),
    fs = require('fs'),
    moment = require('moment');

var client = stream.connect(config.get('STREAM_API_KEY'),
                            config.get('STREAM_API_SECRET'),
                            config.get('STREAM_ID'));

var router = express.Router(),
    User = models.User,
    Item = models.Item,
    Pin = models.Pin,
    Follow = models.Follow;

var ensureAuthenticated = function(req, res, next){
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

var did_i_pin_it = function(all_items, pinned_items){
    var pinned_items_ids = _.pluck(pinned_items, 'item');

    _.each(all_items, function(item){
        if (pinned_items_ids.indexOf(item._id) >= 0){
            item.pinned = true;
        }
    });
};

var did_i_follow = function(all_users, followed_users){
    var followed_users_ids = _.pluck(followed_users, 'target');

    _.each(all_users, function(user){
        if (followed_users_ids.indexOf(user._id) >= 0){
            user.followed = true
        }
    });
};

router.use(function (error, req, res, next) {
    if (!error) {
        next();
    } else {
        console.error(error.stack);
        res.send(500);
    }
});

router.use(function(req, res, next){
    if (!req.isAuthenticated())
        return next();
    else if(!req.user.id)
        User.findOne({username: req.user.username}).lean().exec(function(err, user){
            if (err)
                return next(err);

            req.user.id = user._id;
            req.user.token = client.feed('notification', req.user.id).token;
            req.user.APP_ID = config.get('STREAM_ID');
            req.user.APP_KEY = config.get('STREAM_API_KEY');

            client.feed('notification', req.user.id).get({limit: 0}, function(err, response, body){
                if (typeof body !== 'undefined')
                    req.user.unseen = body.unseen;

                next();
            });
        });
    else
        next();
});

router.get('/', function(req, res){
    Item.find({}).populate('user').lean().exec(function(err, popular){
        if (err)
            return next(err);

        if (req.isAuthenticated()){
            Pin.find({user: req.user.id}).select('item -_id').lean().exec(function(err, pinned_items){
                did_i_pin_it(popular, pinned_items);
                return res.render('trending', {location: 'trending', user: req.user, stuff: popular});
            });
        } else
            return res.render('trending', {location: 'trending', user: req.user, stuff: popular});
    });
});

var enrich = function(activities, callback){
    var separated = _.groupBy(activities, function(activity){
        return activity.verb.split(':')[0];
    });

    async.parallel({
        pins: function(cb){
            Pin.enrich_activities(separated.pin, cb);
        },
        follows: function(cb){
            Follow.enrich_activities(separated.follow, cb);
        }
    }, function(err, enriched){
        if (err)
            return next(err);

        var pinDict = _.groupBy(enriched.pins, function(enrichedActivity){
            return 'pin:' + enrichedActivity.foreign_id();
        });

        var followDict = _.groupBy(enriched.follows, function(enrichedActivity){
            return 'follow:' + enrichedActivity.foreign_id();
        });


        var enrichedActivities = _.extend(pinDict, followDict);
        var results = [];

        for (var i = 0; i < activities.length; ++i){
            var activity_id = activities[i].foreign_id;
            if (typeof enrichedActivities[activity_id] !== 'undefined'){
                var enrichedActivity = enrichedActivities[activity_id][0].toJSON();
                enrichedActivity.timesince = moment(activities[i].time).fromNow();

                if (activity_id.split(':')[0].localeCompare('pin') == 0)
                    enrichedActivity.pin = true;
                else
                    enrichedActivity.pin = false;

                results.push(enrichedActivity);
            }
        }

        callback(null, results);
    });
}

var enrich_aggregated_activities = function(activities, callback){
    var asyncStruct = {};

    _.each(activities, function(activity, index){
        asyncStruct[index] = function(cb){
            enrich(activity.activities, cb);
        }
    });

    var results = [];
    async.parallel(asyncStruct, function(err, enrichedActivities){
        _.each(enrichedActivities, function(activitiesArray, key){
            var pin = false;
            if (activitiesArray[0].pin)
                pin = true;
            
            results.push({objs: activitiesArray, 'pin': pin});
        });

        callback(results);
    });
}

router.get('/flat', ensureAuthenticated, function(req, res, next){
    var flatFeed = client.feed('flat', req.user.id);

    flatFeed.get({}, function(err, response, body){
        if (err)
            return next(err);

        var activities = response.body.results;
        enrich(activities, function(err, results){
            return res.render('feed', {location: 'feed', user: req.user, activities: results, path: req.url});
        });
    });
});

router.get('/aggregated_feed', ensureAuthenticated, function(req, res, next){
    var aggregatedFeed = client.feed('aggregated', req.user.id);

    aggregatedFeed.get({}, function(err, response, body){
        if (err)
            return next(err);

        var activities = response.body.results;
        enrich_aggregated_activities(activities, function(results){
            return res.render('aggregated_feed', {location: 'aggregated_feed', user: req.user, activities: results, path: req.url});
        });
    });
});

router.get('/notification_feed/', ensureAuthenticated, function(req, res){
    var notificationFeed = client.feed('notification', req.user.id);

    notificationFeed.get({mark_read:true, mark_seen: true}, function(err, response, body){
        if (err)
            return next(err);

        if (body.results.length == 0)
            return res.send('');
        else{
            req.user.unseen = 0;
            enrich(body.results[0].activities, function(err, results){
                return res.render('notification_follow', {lastFollower: results[0], count: results.length, layout: false});
            });
        }
    });
});

router.get('/people', ensureAuthenticated, function(req, res){
    User.find({}).nor([{'_id': 0}, {'_id': req.user.id}]).lean().exec(function(err, people){
        Follow.find({user: req.user.id}).exec(function(err, followedUsers){
            if (err)
                return next(err);

            did_i_follow(people, followedUsers);

            return res.render('people', {location: 'people', user: req.user, people: people, path: req.url, show_feed: false});
        });
    })
});

router.get('/profile', ensureAuthenticated, function(req, res, next){
    var userFeed = client.feed('user', req.user.id);

    userFeed.get({}, function(err, response, body){
        if (err)
            return next(err);

        var activities = response.body.results;
        enrich(activities, function(err, results){
            return res.render('profile', {location: 'profile', user: req.user, profile_user: req.user, activities: results, path: req.url, show_feed: true});
        })
    });
});

router.get('/profile/:user', ensureAuthenticated, function(req, res){
    User.findOne({username: req.params.user}, function(err, foundUser){
        if (err)
            return next(err);

        if (!foundUser)
            return res.send('User ' + req.params.user + ' not found.')

        var flatFeed = client.feed('user', foundUser._id);

        flatFeed.get({}, function(err, response, body){
            if (err)
                return next(err);

            var activities = response.body.results;
            enrich(activities, function(err, results){
                return res.render('profile', {location: 'profile', user: req.user, profile_user: foundUser, activities: results, path: req.url, show_feed: true});
            })
        });
    });
});

router.get('/account', ensureAuthenticated, function(req, res){
    res.render('account', {user: req.user});
});

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

router.post('/follow', ensureAuthenticated, function(req, res){
    var followData = {user: req.user.id, target: req.body.target};

    Follow.findOne(followData, function(err, foundFollow){
        if (!foundFollow)
            Follow.as_activity(followData);
        else
            foundFollow.remove_activity(req.user.id, req.body.target);

        res.set('Content-Type', 'application/json');
        return res.send({'pin': {'id': req.body.item}});
    });
});

router.post('/pin', ensureAuthenticated, function(req, res){
    var user = req.user.id;
    var pinData = {user: req.user.id, item: req.body.item};

    Pin.findOne(pinData, function(err, foundPin){
        if (!foundPin)
            Pin.as_activity(pinData);
        else 
            foundPin.remove_activity(user._id);

        res.set('Content-Type', 'application/json');
        return res.send({'pin': {'id': req.body.item}});
    });
});


module.exports = router;

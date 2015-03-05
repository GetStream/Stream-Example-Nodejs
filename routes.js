var config = require('./config/config'),
    express = require('express'),
    passport = require('passport'),
    ensureAuthenticated = require('./config/passport'),
    models = require('./models'),
    fixtures = require('./fixtures'),
    _ = require('underscore'),
    async = require('async');

var stream = require('getstream');
var client = stream.connect(config.get('STREAM_API_KEY'),
                            config.get('STREAM_API_SECRET'),
                            config.get('STREAM_ID'));

var router = express.Router(),
    User = models.user,
    Item = models.item,
    Pin = models.pin,
    Follow = models.follow;

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

router.get('/', function(req, res){
    Item.find({}).populate('user').lean().exec(function(err, popular){
        if (err)
            return console.log(err);
        if (!req.isAuthenticated())
            return res.render('trending', {location: 'trending',user: req.user, stuff: popular});


        User.findOne({username: req.user.username}).select('_id').lean().exec(function(err, user){
            Pin.find({user: user._id}).select('item -_id').lean().exec(function(err, pinned_items){
                did_i_pin_it(popular, pinned_items);

                return res.render('trending', {location: 'trending', user: req.user, stuff: popular});
            })
        });
    });
});

var enrich = function(activities, callback){
    activities = activities.reverse();

    var separated = _.groupBy(activities, function(activity){
        return (activity.verb.localeCompare('pin') == 0);
    });

    var pin_activities = separated['true'];
    var follow_activities = separated['false'];

    async.parallel({
        enrichedPins: function(cb){
            Pin.enrich_activities(pin_activities, cb);
        },
        enrichedFollows: function(cb){
            Follow.enrich_activities(follow_activities, cb);
        }
    }, function(err, results){
        if (err)
            console.log(err);

        var enrichedPins = results.enrichedPins;
        var enrichedFollows = results.enrichedFollows;

        var results = [];

        var pin_index = 0;
        var follow_index = 0;
        for (var i = 0; i < activities.length; ++i){
            console.log(activities[i]);
            if ((activities[i].foreign_id.split(':')[0].localeCompare('pin')) == 0 &&
            (parseInt(activities[i].foreign_id.split(':')[1]) == enrichedPins[pin_index].foreign_id())){
                var pin = enrichedPins[pin_index].toJSON();
                pin.pin = true;
                results.push(pin);
                ++pin_index;
            }
            else if (((activities[i].foreign_id.split(':')[0].localeCompare('follow')) == 0) &&
                (parseInt(activities[i].foreign_id.split(':')[1]) == enrichedFollows[follow_index].foreign_id())){
                var follow = enrichedFollows[follow_index].toJSON();
                follow.pin = false;
                results.push(follow);
                console.log(follow);
                ++follow_index;
            }
        }
        callback(err, results);
    });
}

var enrich_aggregated_activities = function(activities, callback){
    var enrichedActivities = [];
    var asyncStruct = {};

    _.each(activities, function(activity, index){
        asyncStruct[index] = function(cb){
            enrich(activity.activities, cb);
        }
    });

    var results = [];
    async.parallel(asyncStruct, function(err, enrichedActivities){
        _.each(enrichedActivities, function(activitiesArray, key){
            pin = false;
            if (activitiesArray[0].pin)
                pin = true;
            
            results.push({objs: activitiesArray, 'pin': pin});

        })
        callback(results);
    });
}

router.get('/flat', ensureAuthenticated, function(req, res){
    User.findOne({username: req.user.username}, function(err, foundUser){
        var flatFeed = client.feed('flat', foundUser._id);

        flatFeed.get({}, function(err, response, body){
            if (err)
                console.log(err)

            var activities = response.body.results;
            enrich(activities, function(err, results){
                return res.render('feed', {location: 'feed', user: req.user, activities: results, path: req.url});
            });
        });
    });
});

router.get('/aggregated_feed', ensureAuthenticated, function(req, res){
    User.findOne({username: req.user.username}, function(err, foundUser){
        var aggregatedFeed = client.feed('aggregated', foundUser._id);

        aggregatedFeed.get({}, function(err, response, body){
            if (err)
                console.log(err)

            var activities = response.body.results;
            console.log(activities);
            enrich_aggregated_activities(activities, function(results){
                console.log(results);
                return res.render('aggregated_feed', {location: 'aggregated_feed', user: req.user, activities: results, path: req.url});
            });
        });
    });
});

router.get('/notification_feed/', ensureAuthenticated, function(req, res){
    User.findOne({username: req.user.username}, function(err, foundUser){
        var notification_feed = client.feed('notification', foundUser._id);

        notification_feed.get({mark_read:true, mark_seen: true}, function(err, response, body){
            console.log(JSON.stringify(response));
            if (err)
                console.log(err)

            if (body.results.length == 0)
                return res.send('');

            else
                enrich(body.results[0].activities, function(err, results){
                    console.log(results);
                    return res.render('notification_follow', {lastFollower: results[0], count: results.length, layout: false});
                });
        });
    });
});

router.get('/people', ensureAuthenticated, function(req, res){
    User.find({}).where('_id').ne(0).lean().exec(function(err, users){
        users = _.groupBy(users, function(user){
            return (user.username.localeCompare(req.user.username) == 0);
        });

        people = users['false'] || [];
        currentUser = users['true'][0];

        Follow.find({user: currentUser._id}).exec(function(err, followedUsers){
            did_i_follow(people, followedUsers);

            return res.render('people', {location: 'people', user: req.user, people: people, path: req.url, show_feed: false});
        });
    })
});

router.get('/profile', ensureAuthenticated, function(req, res){
    User.findOne({username: req.user.username}, function(err, foundUser){
        var flatFeed = client.feed('user', foundUser._id);

        flatFeed.get({}, function(err, response, body){
            if (err)
                console.log(err);

            var activities = response.body.results;
            enrich(activities, function(results){
                return res.render('_profile', {location: 'profile', user: req.user, profile_user: req.user, activities: results, path: req.url, show_feed: true});
            })
        });
    });
});

router.get('/profile/:user', ensureAuthenticated, function(req, res){
    User.findOne({username: req.params.user}, function(err, foundUser){
        if (!foundUser)
            return res.send('User ' + req.params.user + ' not found.')

        var flatFeed = client.feed('user', foundUser._id);

        flatFeed.get({}, function(err, response, body){
            if (err)
                console.log(err);

            var activities = response.body.results;
            enrich(activities, function(results){
                console.log(results);
                return res.render('_profile', {location: 'profile', user: req.user, profile_user: foundUser, activities: results, path: req.url, show_feed: true});
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
                    return res.redirect('/');
                });
            }
            else
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
        var userFeed = client.feed('user', foundUser._id);
        var flatFeed = client.feed('flat', foundUser._id);
        var aggregatedFeed = client.feed('aggregated', foundUser._id);
        var data = {user: foundUser._id, target: req.body.target};

        Follow.findOne(data, function(err, foundFollow){
            if (foundFollow){
                flatFeed.unfollow('user', req.body.target)
                aggregatedFeed.unfollow('user', req.body.target)

                foundFollow.remove_activity(userFeed);
            }
            else {
                flatFeed.follow('user', req.body.target)
                aggregatedFeed.follow('user', req.body.target)

                Follow.as_activity(data, userFeed);
            }

            res.set('Content-Type', 'application/json');
            return res.send({'pin': {'id': req.body.item}});
        });
    });
});

router.post('/pin', ensureAuthenticated, function(req, res){
    User.findOne({username: req.user.username}, function(err, foundUser){
        var user = client.feed('user', foundUser._id);
        var pinData = {user: foundUser._id, item: req.body.item};

        Pin.findOne(pinData, function(err, foundPin){
            if (foundPin)
                foundPin.remove_activity(user);
            else 
                Pin.as_activity(pinData, user);

            res.set('Content-Type', 'application/json');
            return res.send({'pin': {'id': req.body.item}});
        })
    });
});

module.exports = router;

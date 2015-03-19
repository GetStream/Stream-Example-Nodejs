var mongoose = require('mongoose'),
	autoIncrement = require('mongoose-auto-increment'),
	config = require('./config/config'),
	_ = require('underscore'),
	stream_node = require('getstream-node');

var connection = mongoose.createConnection(config.get('MONGOLAB_URI'));

FeedManager = stream_node.FeedManager;
ActivitySchema = stream_node.Activity(connection, mongoose.Schema);

var userSchema = new ActivitySchema(
	{
		_id: Number,
		username: {type: String, required: true},
		avatar_url: {type: String, required: true}
	},
	{
		collection: 'Users'
	}
);

var User = connection.model('User', userSchema)

var itemSchema = new ActivitySchema(
	{
		_id: Number,
		user: {type: Number, required: true, ref: 'User'},
		image_url: {type: String, required: true},
		pin_count: {type: Number, default: 0}
	},
	{
		collection: 'Item'
	}
);

var Item = connection.model('Item', itemSchema);

var pinSchema = new ActivitySchema(
	{
		_id: Number,
		user: {type: Number, required: true, ref: 'User'},
		item: {type: Number, required: true, ref: 'Item'},
	},
	{
		collection: 'Pin'
	}
);

pinSchema.statics.as_activity = function(pinData, user) {
    Pin.create(pinData, function(err, insertedPin){
	    var userFeed = client.feed('user', pinData.user);
	    var activity = {
	                    'actor': 'user:' + pinData.user,
	                    'verb': 'pin',
	                    'object': 'pin:' + pinData.item,
	                    'foreign_id': 'pin:' + insertedPin.foreign_id()
	                    };
	    userFeed.addActivity(activity, function(err){
        	if (err)
           		return next(err);
		});
	});
};
pinSchema.methods.remove_activity = function(user_id){
	var userFeed = client.feed('user', user_id);
    userFeed.removeActivity({foreignId: 'pin:' + this.foreign_id()});
    this.remove();
};
pinSchema.statics.enrich_activities = function(pin_activities, cb){
	if (typeof pin_activities === 'undefined')
		return cb(null, []);

   	pinIds = _.map(_.pluck(pin_activities, 'foreign_id'), function(foreign_id){
   		return parseInt(foreign_id.split(':')[1]);
   	});

	Pin.find({_id: {$in: pinIds}}).populate(['user', 'item']).exec(function(err, found){
		User.populate(found, {path: 'item.user'}, function(err, done){
			if (err)
				return next(err);
			else
				cb(err, done);
		});
	});
};

var Pin = connection.model('Pin', pinSchema);

var followSchema = new Schema(
	{
		_id: Number,
		user: {type: Number, required: true, ref: 'User'},
		target: {type: Number, required: true, ref: 'User'},
	},
	{
		collection: 'Follow'
	}
);

followSchema.statics.enrich_activities = function(follow_activities, cb){
	if (typeof follow_activities === 'undefined')
		return cb(null, []);

	followIds = _.map(_.pluck(follow_activities, 'foreign_id'), function(foreign_id){
		return parseInt(foreign_id.split(':')[1]);
	});

	Follow.find({_id: {$in: followIds}}).populate(['user', 'target']).exec(cb);
};

followSchema.statics.as_activity = function(followData) {
    Follow.create(followData, function(err, insertedFollow){
		var user_id = followData.user,
			target_id = followData.target;

    	var userFeed = client.feed('user', user_id),
    	    flatFeed = client.feed('flat', user_id),
        	aggregatedFeed = client.feed('aggregated', user_id);

       	flatFeed.follow('user', target_id);
        aggregatedFeed.follow('user', target_id);

        var activity = {
        	'actor': 'user:' + followData.user,
        	'verb': 'follow',
        	'object': 'follow:' + followData.target,
        	'foreign_id': 'follow:' + insertedFollow.foreign_id(),
        	'to': ['notification:' + followData.target]
        };

        userFeed.addActivity(activity, function(error, response, body) {
        	if (err)
        		return next(err);
        });
    });
};

followSchema.methods.remove_activity = function(user_id, target_id){
    var userFeed = client.feed('user', user_id),
    	flatFeed = client.feed('flat', user_id),
    	aggregatedFeed = client.feed('aggregated', user_id);

    flatFeed.unfollow('user', target_id);
    aggregatedFeed.unfollow('user', target_id)

    userFeed.removeActivity({foreignId: 'follow:' + this.foreign_id()});
    this.remove();
};

var Follow = connection.model('Follow', followSchema);

User.find({}, function(err, foundUsers){
	if (foundUsers.length == 0)
		require('./after_deploy')();
});

module.exports = {
	User: User,
	Item: Item,
	Pin: Pin,
	Follow: Follow
};

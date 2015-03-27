var mongoose = require('mongoose'),
    config = require('./config/config'),
    _ = require('underscore'),
    autoIncrement = require('mongoose-auto-increment'),
    stream_node = require('getstream-node');

var connection = mongoose.createConnection(config.get('MONGOLAB_URI'));
var FeedManager = stream_node.FeedManager;

autoIncrement.initialize(connection);

var userSchema = new mongoose.Schema(
	{
    _id: Number,
		username: {type: String, required: true},
		avatar_url: {type: String, required: true}
	},
	{
		collection: 'Users'
	}
);
userSchema.plugin(autoIncrement.plugin, {model: 'User', field: '_id'});
var User = connection.model('User', userSchema)

var itemSchema = new mongoose.Schema(
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
itemSchema.plugin(autoIncrement.plugin, {model: 'Item', field: '_id'});
var Item = connection.model('Item', itemSchema);

var pinSchema = new mongoose.Schema(
	{
    _id: Number,
		user: {type: Number, required: true, ref: 'User'},
		item: {type: Number, required: true, ref: 'Item'},
	},
	{
		collection: 'Pin'
	}
);
stream_node.mongoose.activitySchema(pinSchema);
pinSchema.plugin(autoIncrement.plugin, {model: 'Pin', field: '_id'});

var Pin = connection.model('Pin', pinSchema);
stream_node.mongoose.activityModel(Pin);

var followSchema = new mongoose.Schema(
	{
    _id: Number,
		user: {type: Number, required: true, ref: 'User'},
		target: {type: Number, required: true, ref: 'User'},
	},
	{
		collection: 'Follow'
	}
);
stream_node.mongoose.activitySchema(followSchema);
followSchema.plugin(autoIncrement.plugin, {model: 'Follow', field: '_id'});
followSchema.statics.enrich_activities = function(follow_activities, cb){
	if (typeof follow_activities === 'undefined')
		return cb(null, []);

	followIds = _.map(_.pluck(follow_activities, 'foreign_id'), function(foreign_id){
		return parseInt(foreign_id.split(':')[1]);
	});

	Follow.find({_id: {$in: followIds}}).populate(['user', 'target']).exec(cb);
};

followSchema.pre('save', function (next) {
  this.wasNew = this.isNew;
  next();
});

followSchema.post('save', function (doc) {
  if (this.wasNew) {
  	FeedManager.followUser(doc.user, doc.target);
  }
});

followSchema.post('remove', function (doc) {
  FeedManager.unfollowUser(doc.user, doc.target);
});

var Follow = connection.model('Follow', followSchema);
stream_node.mongoose.activityModel(Follow);

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

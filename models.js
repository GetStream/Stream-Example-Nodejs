var mongoose = require('mongoose'),
	config = require('./config/config'),
	_ = require('underscore'),
	Schema = mongoose.Schema,
	stream_node = require('getstream-node');

mongoose.Promise = global.Promise;

var connection = mongoose.connect(config.get('MONGODB_URI'), {
	useMongoClient: true,
});

var FeedManager = stream_node.FeedManager;
var StreamMongoose = stream_node.mongoose;

var userSchema = new Schema(
	{
		username: { type: String, required: true },
		avatar_url: { type: String, required: true },
	},
	{
		collection: 'User',
	}
);

var User = mongoose.model('User', userSchema);

var itemSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
		image_url: { type: String, required: true },
		pin_count: { type: Number, default: 0 },
	},
	{
		collection: 'Item',
	}
);
var Item = mongoose.model('Item', itemSchema);

var pinSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
		item: { type: Schema.Types.ObjectId, required: true, ref: 'Item' },
	},
	{
		collection: 'Pin',
	}
);

pinSchema.plugin(StreamMongoose.activity);

pinSchema.statics.pathsToPopulate = function() {
	return ['user', 'item'];
};

pinSchema.methods.activityForeignId = function() {
	return this.user._id + ':' + this.item._id;
};

var Pin = mongoose.model('Pin', pinSchema);

var followSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
		target: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
	},
	{
		collection: 'Follow',
	}
);

followSchema.plugin(StreamMongoose.activity);

followSchema.methods.activityNotify = function() {
	target_feed = FeedManager.getNotificationFeed(this.target._id);
	return [target_feed];
};

followSchema.methods.activityForeignId = function() {
	return this.user._id + ':' + this.target._id;
};

followSchema.statics.pathsToPopulate = function() {
	return ['user', 'target'];
};

followSchema.post('save', function(doc) {
	if (doc.wasNew) {
		var userId = doc.user._id || doc.user;
		var targetId = doc.target._id || doc.target;
		FeedManager.followUser(userId, targetId);
	}
});

followSchema.post('remove', function(doc) {
	FeedManager.unfollowUser(doc.user, doc.target);
});

var Follow = mongoose.model('Follow', followSchema);

// send the mongoose instance with registered models to StreamMongoose
StreamMongoose.setupMongoose(mongoose);

module.exports = {
	User: User,
	Item: Item,
	Pin: Pin,
	Follow: Follow,
};

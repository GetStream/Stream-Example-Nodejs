var mongoose = require('mongoose'),
    config = require('./config/config'),
    _ = require('underscore'),
    stream_node = require('getstream-node');

var connection = mongoose.connect(config.get('MONGOLAB_URI'));

var FeedManager = stream_node.FeedManager;
var StreamMongoose = stream_node.mongoose;

var userSchema = new mongoose.Schema(
  {
    username: {type: String, required: true},
    avatar_url: {type: String, required: true}
  },
  {
    collection: 'Users'
  }
);

var User = connection.model('User', userSchema);

var itemSchema = new mongoose.Schema(
  {
    user: {type: String, required: true, ref: 'User'},
    image_url: {type: String, required: true},
    pin_count: {type: Number, default: 0}
  },
  {
    collection: 'Item'
  }
);var Item = connection.model('Item', itemSchema);

var pinSchema = new mongoose.Schema(
  {
    actor: {type: String, required: true, ref: 'User'},
    item: {type: Number, required: true, ref: 'Item'},
  },
  {
    collection: 'Pin'
  }
);

StreamMongoose.activitySchema(pinSchema);

pinSchema.statics.pathsToPopulate = function(){
  return ['actor', 'item'];
};

pinSchema.methods.activityActorProp = function(){
  return 'actor';
}

var Pin = connection.model('Pin', pinSchema);

var followSchema = new mongoose.Schema(
  {
    actor: {type: String, required: true, ref: 'User'},
    target: {type: Number, required: true, ref: 'User'},
  },
  {
    collection: 'Follow'
  }
);

StreamMongoose.activitySchema(followSchema);

followSchema.methods.activityNotify = function() {
  target_feed = FeedManager.getNotificationFeed(this.target);
  return [target_feed];
};

followSchema.statics.pathsToPopulate = function(){
  return ['actor', 'target'];
};

followSchema.methods.activityActorProp = function(){
  return 'actor';
}

followSchema.pre('save', function (next) {
  this.wasNew = this.isNew;
  next();
});

followSchema.post('save', function (doc) {
  if (this.wasNew) {
    FeedManager.followUser(doc.actor, doc.target);
  }
});

followSchema.post('remove', function (doc) {
  FeedManager.unfollowUser(doc.actor, doc.target);
});

var Follow = connection.model('Follow', followSchema);

module.exports = {
  User: User,
  Item: Item,
  Pin: Pin,
  Follow: Follow
};

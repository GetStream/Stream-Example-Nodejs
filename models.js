var mongoose = require('mongoose'),
	autoIncrement = require('mongoose-auto-increment'),
	config = require('./config/config'),
	_ = require('underscore');

var connection = mongoose.createConnection(config.db);
var Schema = mongoose.Schema;

autoIncrement.initialize(connection);

var userSchema = new Schema(
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

var itemSchema = new Schema(
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

var pinSchema = new Schema(
	{
		_id: Number,
		user: {type: Number, required: true, ref: 'User'},
		item: {type: Number, required: true, ref: 'Item'},
	},
	{
		collection: 'Pin'
	}
);
pinSchema.plugin(autoIncrement.plugin, {model: 'Pin', field: '_id'});
pinSchema.statics.as_activity = function(pinData, user) {
    connection.model('Pin', pinSchema).create(pinData, function(err, insertedPin){
	    var activity = {
	                    'actor': 'user:' + pinData.user,
	                    'verb': 'pin',
	                    'object': 'pin:' + pinData.item,
	                    'foreign_id': 'pin:' + insertedPin.foreign_id()
	                    };

	    user.addActivity(activity, function(error, response, body) {
	        if (error){
	            console.log(error)
	        }
		});
	});
}
pinSchema.methods.remove_activity = function(user){
    user.removeActivity({foreignId: 'pin:' + this.foreign_id()});
    this.remove();
}
pinSchema.statics.enrich_activities = function(pin_activities, cb){
	if (typeof pin_activities === 'undefined')
		return cb(null, []);

   	pinIds = _.map(_.pluck(pin_activities, 'foreign_id'), function(foreign_id){
   		return parseInt(foreign_id.split(':')[1]);
   	})

	connection.model('Pin', pinSchema)
		.find({_id: {$in: pinIds}})
		.populate(['user', 'item'])
		.exec(function(err, found){
			connection.model('User', userSchema).populate(found, {path: 'item.user'} ,function(err, done){
				if (err)
					return console.log(err);
				else
					cb(err, done);
			});
		});
};

pinSchema.methods.foreign_id = function(){
	return this._id;
}

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
followSchema.plugin(autoIncrement.plugin, {model: 'Follow', field: '_id'});
followSchema.statics.enrich_activities = function(follow_activities, cb){
	if (typeof follow_activities === 'undefined')
		return cb(null, []);

   	followIds = _.map(_.pluck(follow_activities, 'foreign_id'), function(foreign_id){
   		return parseInt(foreign_id.split(':')[1]);
   	});

	connection.model('Follow', followSchema)
		.find({_id: {$in: followIds}})
		.populate(['user', 'target'])
		.exec(cb);
};
followSchema.statics.as_activity = function(followData, userFeed) {
    connection.model('Follow', followSchema).create(followData, function(err, insertedFollow){
	    var activity = {
	                    'actor': 'user:' + followData.user,
	                    'verb': 'follow',
	                    'object': 'follow:' + followData.target,
	                    'foreign_id': 'follow:' + insertedFollow.foreign_id(),
	                    'to': ['user:' + followData.target]
	                    };

	    userFeed.addActivity(activity, function(error, response, body) {
	        if (error){
	            console.log(error)
	        }
		});
	});
}
followSchema.methods.remove_activity = function(userFeed){
    userFeed.removeActivity({foreignId: 'follow:' + this.foreign_id()});
    this.remove();
}
followSchema.methods.foreign_id = function(){
	return this._id;
}

module.exports = {
				 user: connection.model('User', userSchema),
				 item: connection.model('Item', itemSchema),
				 pin: connection.model('Pin', pinSchema),
				 follow: connection.model('Follow', followSchema),
				};

var mongoose = require('mongoose'),
	autoIncrement = require('mongoose-auto-increment'),
	config = require('./config/config');

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

module.exports = {
				 user: connection.model('User', userSchema),
				 item: connection.model('Item', itemSchema),
				 pin: connection.model('Pin', pinSchema),
				 follow: connection.model('Follow', followSchema),
				};

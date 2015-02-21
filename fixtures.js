var	models = require('./models'),
	fs = require('fs');

var User = models.user,
	Item = models.item,
	Pin = models.pin,
	Follow = models.follow;

module.exports = function(){
	User.remove({}, function(err) {
		User.resetCount(function(){
			User.create({displayName: 'admin', avatar_url: 'admin.jpg'},
				function(err, newArticle){
					if (err){
						return console.log(err);
				}
			});
		});
	});


	Pin.remove({}, function(err) { 
		Pin.resetCount(function(){
			Pin.create({user: 1, item: 1},
				function(err, newArticle){
					if (err){
						return console.log(err);
				}
			});
		});
	});

	Follow.remove({}, function(err) { 
		Follow.resetCount(function(){});
	});
	
	Item.remove({}, function(err) { 
		Item.resetCount(function(){
			var mediaFiles = fs.readdirSync('./media/');
			mediaFiles.forEach(function(fileName){
				Item.create({user: 0, image_url: fileName},
					function(err, newArticle){
						if (err){
							return console.log(err);
						}
				});
			});
		});
	});
};
var	models = require('./models'),
	fs = require('fs');

var User = models.User,
	Item = models.Item,
	Pin = models.Pin,
	Follow = models.Follow;

module.exports = function(){
    User.remove({}, function(err) {
        User.create({username: 'admin', avatar_url: 'admin.jpg'});
        User.create({username: 'Andrew', avatar_url: 'https://github.com/identicons/jasonlong.png'});
        User.create({username: 'Mihai', avatar_url: 'https://github.com/identicons/jasonlong.png'});
        User.create({username: 'Thomas', avatar_url: 'https://github.com/identicons/jasonlong.png'});

        Item.remove({}, function(err) { 
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

        Pin.remove({}, function(err) { 
            Pin.as_activity({user: 1, item: 1});
            Pin.as_activity({user: 1, item: 2});
            Pin.as_activity({user: 1, item: 3});
            Pin.as_activity({user: 1, item: 4});
            Pin.as_activity({user: 2, item: 6});
            Pin.as_activity({user: 1, item: 5});
            Pin.as_activity({user: 1, item: 7});
            Pin.as_activity({user: 3, item: 9});
            Pin.as_activity({user: 3, item: 8});
            Pin.as_activity({user: 3, item: 4});
        });

        Follow.remove({}, function(err) { 
            Follow.as_activity({user: 1, target: 2});
            Follow.as_activity({user: 1, target: 3});
            Follow.as_activity({user: 2, target: 1});
            Follow.as_activity({user: 2, target: 3});
        });

        
    });
}
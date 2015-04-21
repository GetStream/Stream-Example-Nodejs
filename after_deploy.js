#!/usr/bin/env node

var models = require('./models'),
    fs = require('fs'),
    async = require('async');

var User = models.User,
    Item = models.Item;

var firstUser = false;

module.exports = importData = function(){
    async.series([
        function(callback){
            console.log('creating users...');
            firstUser = new User({username: 'admin', avatar_url: 'admin.jpg'});
            firstUser.save(function(err) {
                if (err) console.log(err);    
                callback(null);            
            });
        },
        function (callback) {
            User.create({username: 'Andrew', avatar_url: 'https://github.com/identicons/jasonlong.png'}, function(err) {
                if (err) console.log(err);
                callback(null);
            });
        },
        function (callback) {
            User.create({username: 'Sergey', avatar_url: 'https://avatars0.githubusercontent.com/u/4436860?v=3&s=96'}, function(err) {
                if (err) console.log(err);
                callback(null);
            });
        },
        function (callback) {
            User.create({username: 'Thomas', avatar_url: 'https://avatars0.githubusercontent.com/u/125464?v=3&s=96'}, function(err) {
                if (err) console.log(err);
                callback(null);
            });
        },
        function(callback){
            console.log('creating items...');
            var mediaFiles = fs.readdirSync('./media/');

            i = 0;
            mediaFiles.forEach(function(fileName){
                Item.create({user: firstUser._id, image_url: fileName}, function(err, newArticle){
                    if (err){
                        process.exit(1);
                        return console.log(err);
                    }

                    i++;
                    if (i == mediaFiles.length) {
                         callback(null);
                    }
                });
            });
           
        }
    ],
    function(err, results){
        console.log('import completed');
        process.exit(0);
    });
};

if(!module.parent){
    importData();
}
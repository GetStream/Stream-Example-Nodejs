#!/usr/bin/env node

var models = require('./models'),
    fs = require('fs'),
    async = require('async');

var User = models.User,
    Item = models.Item;

var firstUser = false;
var imports = [];

var users = [
    {username: 'Andrew', avatar_url: 'https://github.com/identicons/jasonlong.png'},
    {username: 'Sergey', avatar_url: 'https://avatars0.githubusercontent.com/u/4436860?v=3&s=96'},
    {username: 'Thomas', avatar_url: 'https://avatars0.githubusercontent.com/u/125464?v=3&s=96'}
];

module.exports = importData = function() {
    // create the first user before everything else
    console.log('Starting import with User admin');
    User.create({username: 'admin', avatar_url: 'https://avatars0.githubusercontent.com/u/4336861?v=3&s=96'}, function(err, createdUser) {
        firstUser = createdUser;

        for (var i in users) {
            imports.push(function(newUser) {
                return function(done) {
                    console.log('Importing User', newUser.username);
                    User.create(newUser, function(err, createdUser) {
                        if (!firstUser) {
                            firstUser = createdUser;
                        }
                        done(err);
                    });
                }
            }(users[i]));
        }

        var mediaFiles = fs.readdirSync('./media/');

        mediaFiles.forEach(function(fileName){
            imports.push(function(done) {
                console.log('Importing Item', fileName);
                Item.create({user: firstUser._id, image_url: fileName}, function(err, createdItem){
                    done(err);
                });
            });
        });

        async.parallel(imports,
        function(err) {
            if (err) console.log(err);
            console.log('import completed');
            process.exit(0);
        });
    });
};

if(!module.parent){
    importData();
}
var nconf = require('nconf');

nconf.argv().env();

var STREAM_URL = process.env.STREAM_URL.replace(/[@=:]/g, '/').split('/');

nconf.defaults({
    'MONGOLAB_URI': 'mongodb://localhost/stream_nodejs',
	'PORT': 8000,
	'GITHUB_CLIENT_ID': 'REPLACE_W_GITHUB_CLIENT_ID',
	'GITHUB_CLIENT_SECRET': 'REPLACE_W_GITHUB_CLIENT_SECRET',
	'GITHUB_CALLBACK': '/auth/github/callback',
	'STREAM_ID': 2620,
	'STREAM_API_KEY': 'pp5nmuzmw2n5',
	'STREAM_API_SECRET': 'gdps5zv24a6xbz7spst5j8ur68639nj2kyg28fwmec3wjuayd38kdzz926a5e3fm'
});

module.exports = nconf;

var nconf = require('nconf');

nconf.argv().env();

var STREAM_URL = process.env.STREAM_URL.replace(/[@=:]/g, '/').split('/');

nconf.defaults({
    'MONGOLAB_URI': 'mongodb://localhost/stream_nodejs',
	'PORT': 8000,
	'GITHUB_CLIENT_ID': 'REPLACE_W_GITHUB_CLIENT_ID',
	'GITHUB_CLIENT_SECRET': 'REPLACE_W_GITHUB_CLIENT_SECRET',
	'GITHUB_CALLBACK': '/auth/github/callback',
	'STREAM_ID': STREAM_URL[7],
	'STREAM_API_KEY': STREAM_URL[3],
	'STREAM_API_SECRET': STREAM_URL[4]
});

module.exports = nconf;

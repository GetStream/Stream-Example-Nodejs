var nconf = require('nconf');

nconf.argv().env();

nconf.defaults({
	MONGODB_URI: 'mongodb://localhost/stream_nodejs',
	PORT: 8000,
	GITHUB_CLIENT_ID: 'REPLACE_W_GITHUB_CLIENT_ID',
	GITHUB_CLIENT_SECRET: 'REPLACE_W_GITHUB_CLIENT_SECRET',
	GITHUB_CALLBACK: '/auth/github/callback',
});

module.exports = nconf;

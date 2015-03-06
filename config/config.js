var nconf = require('nconf');

nconf.argv().env();
nconf.defaults({
    'MONGODB_URL': 'mongodb://localhost/streamapp',
	'PORT': 8000,
	'GITHUB_CLIENT_ID': 'd267d4096edf2f3b0180',
	'GITHUB_CLIENT_SECRET': '5d9830f534cc7477bd857f616845977f16f28605',
	'GITHUB_CALLBACK': 'http://127.0.0.1:8000/auth/github/callback',
	'STREAM_ID': '2637',
	'STREAM_API_KEY': '2kfz86z8qdd9',
	'STREAM_API_SECRET': 'xn8g8und66vza9q43sh9kpbfnrkexhy3kf7vns7wgkhsryt3d85w5f8w8r397gc5'
});

module.exports = nconf;

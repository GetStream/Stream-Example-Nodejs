var nconf = require('nconf');

nconf.argv().env();

var STREAM_URL = process.env.STREAM_URL.replace(/[@=:]/g, '/').split('/');

nconf.defaults({
    'MONGOLAB_URI': 'mongodb://localhost/streamapp',
	'PORT': 8000,
	'GITHUB_CLIENT_ID': 'd267d4096edf2f3b0180',
	'GITHUB_CLIENT_SECRET': '5d9830f534cc7477bd857f616845977f16f28605',
	'GITHUB_CALLBACK': 'http://127.0.0.1:8000/auth/github/callback',
	'STREAM_ID': STREAM_URL[7],
	'STREAM_API_KEY': STREAM_URL[3],
	'STREAM_API_SECRET': STREAM_URL[4]
});


console.log(nconf.get('STREAM_API_SECRET'))
module.exports = nconf;

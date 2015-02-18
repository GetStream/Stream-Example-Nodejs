var development = {
	db: 'mongodb://localhost/streamapp',
	port: 8000
};

var production = {
	db: 'remotemongourl',
	port: process.env.PORT
};

module.exports = {
	development: development,
	production: production,
}[process.env.NODE_ENV || 'development'];

var bodyParser = require('body-parser'),
	config = require('./config'),
	express = require('express'),
	expressLayouts = require('express-ejs-layouts'),
	mongoose = require('mongoose');

var app = express();

app.set('view engine', 'ejs');
app.set('layout', 'myLayout');

app.use(expressLayouts);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var db_connection = mongoose.createConnection(config.db);
db_connection.on('error', function () {
  console.log('Error! Database connection failed.');
});

app.listen(config.port);

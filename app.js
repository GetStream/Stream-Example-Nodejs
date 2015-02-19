var bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	config = require('./config/config'),
	express = require('express'),
    expressLayouts = require('express-ejs-layouts'),
	expressSession = require('express-session'),
	mongoose = require('mongoose'),
	passport = require('passport'),
    routes = require('./routes');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(expressLayouts);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser(secret='I like turtles'));
app.use(expressSession({secret: 'keyboard cat',
						resave: false,
						saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/', routes);

var db_connection = mongoose.createConnection(config.db);
db_connection.on('error', function () {
    console.log('Error! Database connection failed.');
});

app.listen(config.port);

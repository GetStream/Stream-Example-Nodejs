var bodyParser = require('body-parser'),
    cookieParser = require('cookie-parser'),
    config = require('./config/config'),
    express = require('express'),
    expressLayouts = require('express-ejs-layouts'),
    expressSession = require('express-session'),
    passport = require('passport'),
    passportConfig = require('./config/passport'),
    passport_mock = require('./passport_mock'),
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

app.use(passport_mock.initialize());
// app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);
app.use(express.static(__dirname + '/static'));
app.use('/media', express.static(__dirname + '/media'));

app.listen(config.get('PORT'));

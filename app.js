var bodyParser = require('body-parser'),
	express = require('express'),
	expressLayouts = require('express-ejs-layouts');

var app = express();

app.set('view engine', 'ejs');
app.set('layout', 'myLayout');

app.use(expressLayouts);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.listen(8888);

var express    = require('express');
var logger     = require('morgan');
var bodyParser = require('body-parser');

var reports = require('./routes/reports');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());

// Headers for REST calls
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  next();
});

app.use('/data', express.static(__dirname + '/data'));
app.use('/v1', reports);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


module.exports = app;

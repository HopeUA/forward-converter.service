var express    = require('express');
var logger     = require('morgan');
var bodyParser = require('body-parser');

var jobs = require('./routes/jobs');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());

app.use('/v1', jobs);

// Headers for REST calls
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  next();
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

module.exports = app;

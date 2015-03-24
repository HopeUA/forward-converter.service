var express    = require('express');
var logger     = require('morgan');
var bodyParser = require('body-parser');

var jobs = require('./routes/jobs');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());

app.use('/v1', jobs);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

module.exports = app;

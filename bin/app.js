var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var env = require("./build/env");
var oem = require(path.resolve(path.join(env.oem.home, "js/oem.js")));


var app = express();

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
// TODO: preffer use oem favicon.ico
app.use(favicon(path.join(env.oem.home, oem.images.desktop)));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// 允许跨域
app.use(function(req, resp, next){
	if(req.method === "OPTIONS") {
		resp.set("Access-Control-Allow-Origin", "*");
		resp.set("Access-Control-Allow-Methods", "POST, OPTIONS, DELETE, PUT, GET");
		resp.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		resp.set("Access-Control-Allow-Credentials", true);
		resp.end();
		return;
	} else {
		next();
	}
});
// routes/index 暴露了一些自定义的文件映射，这些映射的文件可能存在于磁盘上，
// 所以放在 `express.static` 之前确保每次使用的不是磁盘缓存
app.use('/', require("./routes/index"));
app.use(express.static(path.resolve(env.oem.home)));
app.use(express.static(path.join(__dirname, '../src')));
app.use('/', require("./routes/mock"));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.set('Content-Type', 'text/html');
  res.write("<h1 style='color: red;'>" + err.message + "</h1>");
  res.end("<pre style='color: red;'>" + err.stack + "</pre>");
});


module.exports = app;

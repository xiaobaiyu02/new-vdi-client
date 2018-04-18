var express = require('express');
var router = express.Router();
var glob = require("glob");
var fs = require("fs-extra");
var path = require("path");

var mime = require("mime");
// var through = require("through2");

var builder = require("../build/dev");
// var gulp = require("gulp");
// var gulpLess = require("gulp-less");
// var b = require("browserify")("./src/js/app.js", {
// 	debug: true,
// 	fileCache: {
// 		get(file){
// 			console.log("read file hook");
// 			return fs.readFileSync(file, "utf-8");
// 		}
// 	}
// });

router.get("/config.js", function(req, resp){
	resp.set("Content-Type", mime.getType("js"));
	// TODO: 根据 bind 的端口设置此值
	resp.write("$API = 'http://" + req.get("host") + "';\n");
	// 插入这一行代码，方便加入一些条件判断
	// 这些判断在 build 的时候会被去掉
	resp.end("window.DEBUG = true;\n");
});

router.get('/js/app.bundle.js', function(req, resp, next) {
	resp.set("Content-Type", mime.getType("js"));
	var stream = builder.createClientBundle();
	var ended = false;
	stream.on("error", function(e){
		if(ended) { return; }
		console.log(e);
		resp.write("(function(){ document.body.innerHTML = ");
		resp.write(JSON.stringify(
			"<h1>browserify build error:<h1>" +
			"<pre style='color: red; font-size: 1.7rem;'>" +
			e.message + "\n" +
			e.stack +
			"</pre>"
		));
		resp.end("})();");
		ended = true;
	});
	stream.pipe(resp);
});

router.get('/js/initial.bundle.js', function(req, resp, next) {
	resp.set("Content-Type", mime.getType("js"));
	var stream = builder.createInitialBundle();
	var ended = false;
	stream.on("error", function(e){
		if(ended) { return; }
		console.log(e);
		resp.write("(function(){ document.body.innerHTML = ");
		resp.write(JSON.stringify(
			"<h1>browserify build error:<h1>" +
			"<pre style='color: red; font-size: 1.7rem;'>" +
			e.message + "\n" +
			e.stack +
			"</pre>"
		));
		resp.end("})();");
		ended = true;
	});
	stream.pipe(resp);
});

router.get("/js/views.bundle.js", function(req, resp){
	resp.set("Content-Type", mime.getType("js"));
	builder.createViewsBundle().pipe(resp);
	/* glob("./src/views/*.html", function(err, files){
		Promise.all(files.map(function(f){
			return fs.readFile(f, "utf-8");
		})).then(function(contents){
			var ret = {};
			files.map(function(f){
				return path.basename(f, ".html");
			}).forEach(function(key, i){
				ret[key] = contents[i];
			});
			resp.write("var views = ");
			resp.write(JSON.stringify(ret));
			resp.end(";\n");
		}).catch(function(e){
			console.error(e);
		});
	});*/
});

router.get("/css/initial-ui.css", function(req, resp){
	makeLessResponse("initial-ui.less", resp);
});

router.get("/css/client-ui.css", function(req, resp){
	makeLessResponse("client-ui.less", resp);
});

module.exports = router;

function makeLessResponse(file, resp) {
	resp.set("Content-Type", mime.getType("css"));
	builder.createCssBundle(file).pipe(resp);
	/*
	gulp.src(file).pipe(gulpLess()).pipe(through.obj(function(file, enc, callback){
		resp.write(file.contents);
		callback();
	}, function(callback){
		resp.end();
		callback();
	}));
	*/
}
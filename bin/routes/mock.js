var express = require('express');
var router = express.Router();

var fs = require("fs");
var path = require("path");
var Mock = require("mockjs");
var gulp = require("gulp");

var fileCache = {};

router.all('*', function(req, resp, next) {
	var pathname = req.path;
    if(pathname.endsWith('/')) {
        pathname = pathname.substring(0, pathname.length - 1);
    }
    // TODO: preffer use oem path
    pathname = path.join(__dirname, "../../.data", pathname);
    var dirname = path.dirname(pathname);
    var filename = path.basename(pathname) + ".json";
    var maybefiles = [
        dirname + "/" + req.method.toLowerCase() + "-" + filename,
        dirname + "/" + filename
    ];
	var f, hit = false;
	for(var i=0,len=maybefiles.length;i<len;i++) {
		f = maybefiles[i];
        if(fs.existsSync(f)) {
            resp.set("Content-Type", "application/json");
			if(fs.lstatSync(f).isDirectory()) {
				resp.status(404).end("unexpected directory:", f);
			} else {
				resp.status(200);
				resp.json(mockfile(f));
			}
			hit = true;
            break;
        }
	}
	if(!hit) {
		next();
	}
});

module.exports = router;

function mockfile(file) {
	var content, obj;
	if(fileCache.hasOwnProperty(file)) {
		content = fileCache[file];
	} else {
		content = fs.readFileSync(file, "utf-8");
		fileCache[file] = content;
		gulp.watch(file, onChange);
	}
	try {
		obj = JSON.parse(content);
	} catch(e) {
		obj = {
			"msg": "解析 json 报错",
			"file": file
		};
	}
	return Mock.mock(obj);
}

function onChange(e){
	if(e.type !== "changed") { return; }
	fileCache[e.path] = fs.readFileSync(e.path, "utf-8");
}
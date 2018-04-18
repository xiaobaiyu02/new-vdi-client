/* global */
var env = require("./env");
var fs = require("fs");
var path = require("path");
var glob = require("glob");
var gulp = require("gulp");
var debug = require("debug")("build:cache");

var paths = ["./src", env.oem.home];
var fileCache = {};

cacheSrc();
cacheOem();
// 仅开发模式才 watch
if(/bin(?:\\|\/)www$/.test(process.argv[1])) {
    console.log("start file watcher ...");
    watchAndUpdate();
}

module.exports = fileCache;

function cacheSrc(){
    var cwd = "./src";
    ["js/**/*.js", "js/**/*.json", "less/*.less", "views/*.html"].forEach(function(pattern){
        glob.sync(pattern, {cwd: cwd}).forEach(function(f){
            // browserify 打包使用的文件缓存是绝对路径
            var ff = abspath(f, cwd);
            fileCache[ff] = readfile(ff);
        });
    });
}

function cacheOem(){
    var cwd = env.oem.home;
    ["js/**/*.js", "js/**/*.json", "less/*.less", "views/*.html"].forEach(function(pattern){
        glob.sync(pattern, {cwd: cwd}).forEach(function(f){
            // 替换 oem/<file> 到 src/<file>
            var localpath = abspath(f, cwd); // 物理路径
            var logicalPath = realpath(localpath); // 逻辑上的路径
            fileCache[logicalPath] = readfile(localpath);
        });
    });
}


function watchAndUpdate(){
    var onChange = function(e){
        var file = e.path;
        debug('[%s] %s', e.type, file);
        // 忽略文件删除
        if(!fs.existsSync(file)) {
            return;
        }
        // 不是文件？忽略
        if(!fs.statSync(file).isFile()) {
            return;
        }
        var logicalPath = realpath(file);
        fileCache[logicalPath] = readfile(file);
    }
    paths.forEach(function(cwd){
        gulp.watch(cwd + "/**/*.js", onChange);
        gulp.watch(cwd + "/**/*.json", onChange);
        gulp.watch(cwd + "/**/*.less", onChange);
        gulp.watch(cwd + "/**/*.html", onChange);
    });
}

function readfile(f) {
    return fs.readFileSync(f, "utf-8");
}

function abspath(f, cwd) {
    if(cwd) {
        f = path.join(cwd, f);
    }
    return path.resolve(f);
}

function realpath(pathstr) {
    var relative = pathstr.replace(process.cwd(), ".").replace(/\\/g, "/");
    if(relative.indexOf(env.oem.home) === 0) {
        return path.resolve(relative.replace(env.oem.home, "./src"));
    } else {
        return pathstr;
    }
}
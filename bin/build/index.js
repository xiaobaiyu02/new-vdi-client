var env = require("./env");
var builder = require("./dev");
var config = require("../../config");

var fs = require("fs-extra");
var path = require("path");
var yazl = require("yazl");
var glob = require("glob");
var assign = require("lodash/assign");

var gulp = require("gulp");
var minify = require("gulp-uglify");
var source = require('vinyl-source-stream');
var header = require("gulp-header");
var sourcemaps = require("gulp-sourcemaps");
var buffer = require("gulp-buffer");
var through = require("through2");
var crypto = require("crypto");


var oemInfo = require(path.resolve(env.oem.home + "/js/oem.js"));

if(require.main === module) {
    main();
}

/**
 * 现在的 build 直接生成最终的 zip 包，没有中间的临时文件
 */
function main(){
    var willBuildInitial = false;
    var argv = process.argv;
    if(argv.indexOf("--init") > -1) {
        willBuildInitial = true;
    }
    var output = "dist/" + env.oem.name + ".zip";
    var startTime = Date.now();
    if(willBuildInitial) {
        output = "dist/" + env.oem.name + "-init.zip";
        makeInitialZipFile(output, report);
    } else {
        makeClientZipFile(output, report);
    }
    function report(){
        console.log("  build:", env.oem.name + (willBuildInitial ? "-init" : ""));
        console.log(" output:", output);
        console.log("elapsed:", require('pretty-ms')(Date.now() - startTime));
        var stat = fs.statSync(output);
        console.log("   size:", require("filesize")(stat.size));
        console.log("    md5:", require("md5-file").sync(output));
    }
}

function getClientFiles(){
    // 这些是静态资源，直接丢给 zip 压缩器
    var staticFiles = collectStaticFiles([
        "css/*.css",
        "fonts/**/*",
        "img/*",
        "index.html"
    ]);

    // 这些是动态资源，需要先 build 然后丢给 zip 压缩器
    var lessFiles = {
        "css/client-ui.css": function(){
            return builder.createCssBundle("client-ui.less");
        }
    };
    var jsFiles = {
        "js/app.bundle.js": function(){
            return env.development ? builder.createClientBundle() : createMinifyClientBundle();
        },
        "js/views.bundle.js": function(){
            return builder.createViewsBundle({minify: true});
        }
    };

    var otherFiles = {
        // webpack 这两个是为了兼容底层的处理脚本
        "webpack/favicon.png": getOEMFile(oemInfo.images.winIcon),
        "webpack/desktop.ico": getOEMFile(oemInfo.images.desktop),
        "shortcut.ini": createShortcutIni(),
        "package.json": createPackageJson({
            width: 1920,
            height: 1080,
            fullscreen: false,
            kiosk: false,
            resizable: true
        }),
        "package_window.json": createPackageJson({
            frame: true,
            fullscreen: false,
            kiosk: false,
            resizable: true
        }),
        "package_fullscreen.json": createPackageJson({})
    };
    return assign({}, staticFiles, lessFiles, jsFiles, otherFiles);
}

function getInitialFiles(){
    // 这些是静态资源，直接丢给 zip 压缩器
    var staticFiles = collectStaticFiles([
        "css/*.css",
        "fonts/**/*",
        "initial.html"
    ]);

    // 这些是动态资源，需要先 build 然后丢给 zip 压缩器
    var lessFiles = {
        "css/initial-ui.css": function(){
            return builder.createCssBundle("initial-ui.less");
        }
    };
    var jsFiles = {
        "js/initial.bundle.js": function(){
            return env.development ? builder.createInitialBundle() : createMinifyInitialBundle()
        },
        "js/views.bundle.js": function(){
            return builder.createViewsBundle({
                filters: ["initial-ui.html", "modal.html"],
                minify: true
            });
        }
    };

    var otherFiles = {
        "package.json": createPackageJson({}, {
            main: "./initial.html",
            "inject-js-start": void(0)
        })
    };
    return assign({}, staticFiles, lessFiles, jsFiles, otherFiles);
}

function makeInitialZipFile(target, callback) {
    var zipfile = new yazl.ZipFile();
    var files = getInitialFiles();
    var defaultOptions = {
        mtime: new Date(2018, 1, 1)
    };
    Object.keys(files).forEach(function(f){
        var val = files[f];
        if(typeof val === "string") { // 文件路径
            zipfile.addFile(val, f);
        } else if(Buffer.isBuffer(val)) { // Buffer
            zipfile.addBuffer(val, f, defaultOptions);
        } else if(typeof val === "function") { // stream 包装过的函数
            zipfile.addReadStream(val(), f, defaultOptions);
        } else {
            throw new Error("未处理的其它文件：" + f);
        }
    });
    fs.mkdirsSync("dist");
    zipfile.outputStream.pipe(fs.createWriteStream(target)).on("close", callback || function(){});
    zipfile.end();
}

function makeClientZipFile(target, callback) {
    var zipfile = new yazl.ZipFile();
    var files = getClientFiles();
    var defaultOptions = {
        mtime: new Date(2018, 1, 1)
    };
    Object.keys(files).forEach(function(f){
        var val = files[f];
        if(typeof val === "string") { // 文件路径
            zipfile.addFile(val, f);
        } else if(Buffer.isBuffer(val)) { // Buffer
            zipfile.addBuffer(val, f, defaultOptions);
        } else if(typeof val === "function") { // stream 包装过的函数
            zipfile.addReadStream(val(), f, defaultOptions);
        } else {
            throw new Error("未处理的其它文件：" + f);
        }
    });
    fs.mkdirsSync("dist");
    zipfile.outputStream.pipe(fs.createWriteStream(target)).on("close", callback || function(){});
    zipfile.end();
}

function collectStaticFiles(arr) {
    var files = {};
    var paths = ["./src", env.oem.home];
    arr.forEach(function(pattern){
        paths.forEach(function(cwd){
            // glob 指定了 cwd 返回的路径是相对路径
            // 用 OEM 目录下同样的相对路径的文件替换 src下的
            glob.sync(pattern, {cwd: cwd}).forEach(function(file){
                var p = path.resolve(path.join(cwd, file));
                if(fs.statSync(p).isFile()) {
                    files[file] = p;
                }
            });
        });
    });
    return files;
}

function createShortcutIni(){
    var buf1 = new Buffer([255, 254]);
    var buf2 = new Buffer("[shortcut]\r\ntext = " + oemInfo.shortcutText, "utf16le");
    return Buffer.concat([buf1, buf2]);
}

function getOEMFile(f) {
    var p = path.join(env.oem.home, f);
    return path.resolve(p);
}

function createPackageJson(winProps, props){
    var json = {
        main: "./index.html",
        // 为了减小底层开发人员的压力，这里写死
        name: "Client",
        description: oemInfo.name + " vdi client for " + oemInfo.vendor,
        copyright: oemInfo.copyright,
        website: oemInfo.website,
        version: "4.4.3",
        "node-remote": "*://*",
        "chromium-args": [
            "--args",
            "--touch-events=enabled",
            "--disable-web-security",
            "--allow-file-access-from-files",
            "--remote-debugging-port=9222"
        ].join(" "),
        "dom_storage_quota": 10,
        "single-instance": true,
        "webkit": {
            plugin: true,
            java: false,
            "page-cache": false
        },
        "window": {
            title: oemInfo.winTitle,
            icon: "./webpack/favicon.png",
            toolbar: false,
            frame: false,
            position: "center",
            width: 800,
            height: 600,
            min_width: 800,
            min_height: 600,
            max_width: 2560,
            max_height: 1600,
            resizable: false,
            as_desktop: true,
            "always-on-top": false,
            "fullscreen": true,
            "show_in_taskbar": true,
            "show": true,
            "trasparent": false,
            "visible-on-all-workspaces": true,
            "kiosk": true
        }
    };
    assign(json.window, winProps || {});
    assign(json, props || {});
    return new Buffer(JSON.stringify(json));
}

function createMinifyClientBundle(){
    return createMinifyBundle(builder.createClientBundle(), "client.bundle.js");
}

function createMinifyInitialBundle(){
    return createMinifyBundle(builder.createInitialBundle(), "initial.bundle.js");
}

function createMinifyBundle(bStream, file){
    var copyright = fs.readFileSync("./COPYRIGHT", "utf-8");
    var stream = through();
    var sourcemapPrefix = "/sourcemap/" + (new Date).toISOString().substr(0, 10);
    var hash;
    bStream.pipe(source(file))
        .pipe(buffer())
        // 获取 md5，后面使用
        .pipe(through.obj(function(file, enc, callback){
            var md5 = crypto.createHash("md5");
            md5.update(file.contents);
            hash = md5.digest("hex").substr(0, 6);
            this.push(file);
            callback();
        }))
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(header(copyright))
        .pipe(minify({
			compress: {
				global_defs: {
					"window.DEBUG": false
				}
			},
			output: {
				comments: /All rights are reserved\./
			}
        }))
        .pipe(sourcemaps.write("." + sourcemapPrefix, {
			sourceMappingURL: function(file){
				var url = config.sourceMapRoot;
                if(!url) {
                    url = "http://" + config.host + ":" + config.port;
                }
                var sourcemapFile = file.relative.replace(/\.js$/i, "." + hash + ".js.map");
                url += sourcemapPrefix + "/" + sourcemapFile;
                return url;
			}
		})).pipe(through.obj(function(file, enc, callback){
            // 分流，js 写在返回流中，sourcemap 保持不变
            if(/\.js$/i.test(file.relative)) {
                stream.write(file.contents);
            } else {
                // sourcemap 文件重命名
                // xx.js.map => xx.[hash].js.map
                file.path = file.path.replace(/\.js\.map$/i, "." + hash + ".js.map");
                this.push(file);
            }
            callback();
        }, function(callback){
            stream.end();
            callback();
        })).pipe(gulp.dest("./output"));
    return stream;
}

var fileCache = require("./cache");
var env = require("./env");
var path = require("path");
var less = require('less');
var through = require("through2");
var browserify = require("browserify");
var AutoPrefix = require("less-plugin-autoprefix");
var CleanCSS = require("less-plugin-clean-css");
var assign = require("lodash/assign");
var min = require("./min");

var bAppInstance = browserify("./src/js/app.js", {
    debug: process.env.NODE_ENV !== "build",
    fileCache: fileCache
});
var bInitialInstance = browserify("./src/js/initial.js", {
    debug: process.env.NODE_ENV !== "build",
    fileCache: fileCache
});

[bAppInstance, bInitialInstance].forEach(function(b){
    b.external("nw.gui");
    b.external("fs");
    b.external("path");
    b.external("child_process");
    if(process.env.NODE_ENV === "min") {
        b.require("vue/dist/vue.min", {expose: "vue"});
    } else {
        b.require("vue/dist/vue", {expose: "vue"});
    }
});

var lessPlugins = [
    new AutoPrefix({browsers: ["Chrome >= 41", "Android >= 4.4.2"]})
];
if(!env.development) {
    lessPlugins.push(new CleanCSS({advanced: true}));
}

exports.createClientBundle = createClientBundle;
exports.createInitialBundle = createInitialBundle;
exports.createViewsBundle = createViewsBundle;
exports.createCssBundle = createCssBundle;

function createClientBundle(){
    return bAppInstance.bundle();
}

function createInitialBundle(){
    return bInitialInstance.bundle();
}

function createViewsBundle(options){
    var stream = through();
    var contents = {};
    options = assign({
        minify: false,
        filters: []
    }, options);
    var filters = options.filters || [];
    stream.write("var views = ");
    var htmlRe = /\.html$/i;
    Object.keys(fileCache).filter(function(str){
        return htmlRe.test(str);
    }).filter(function(str){
        if(filters.length === 0) { return true; }
        var name = path.basename(str);
        var hit = false;
        filters.forEach(function(file){
            if(name === file) {
                hit = true;
            }
        });
        return hit;
    }).forEach(function(f){
        var text = fileCache[f];
        if(options.minify) {
            text = min.html(text);
        }
        contents[path.basename(f, ".html")] = text;
    });
    stream.write(JSON.stringify(contents));
    stream.end(";\n");
    return stream;
}

function createCssBundle(file){
    var source;
    var filemgr = less.environment.getFileManager(
        "./src/less/client-ui.less",
        process.cwd(), {}
    );
    Object.keys(fileCache).forEach(function(pathstr){
        if(pathstr.endsWith(file)) {
            source = fileCache[pathstr];
        }
    });
    if(Object.keys(filemgr.contents || {}).length > 0) {
        filemgr.contents = {};
    }
    var stream = through();
    less.render(source, {
        plugins: lessPlugins,
        paths: [env.oem.home + "/less", "./src/less"],
        filename: file
    }, function(e, output){
        if(e) {
            if(env.development) {
                stream.write("/*");
                stream.write(e.message);
                stream.write("\n");
                stream.write(e.stack);
                stream.write("*/");
            } else {
                throw e;
            }
        } else {
            stream.write(output.css);
        }
        stream.end();
    });
    return stream;
}

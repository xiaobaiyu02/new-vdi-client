var fs = require("fs");
var path = require("path");
var glob = require("glob");
var less = require("less");
var through = require("through2");
var browserify = require("browserify");
var bInstance = browserify("./src/js/app.js");

exports.build = build;
exports.createAppBundle = createAppBundle;
exports.createViewsBundle = createViewsBundle;

// 编译产品模式代码也要保存到磁盘上，还是跟 vdi-client 保持
// 一致，直接在打包的时候写到 .zip 文件里面算了
function build(){
    createAppBundle();
    createViewsBundle();
    ["initial-ui.less", "client-ui.less"].forEach(function(f){
        createCssBundle(f);
    })
}

function createAppBundle(){
    return bInstance.bundle();
}

function createViewsBundle(){
    var stream = through();
    stream.write("var views = ");
    glob("./views/*.html", function(err, files){
        if(err) {
            throw err;
        }
        var contents = {};
        files.forEach(function(f){
            contents[path.basename(f, ".html")] = fs.readFileSync(f, "utf-8");
        });
        stream.write(JSON.stringify(contents));
        stream.end(";\n");
    });
    return stream;
}

function createCssBundle(name){
    var stream = through();
    var lessfile = "./src/less/" + name;
    var source = fs.readFileSync(lessfile, "utf-8");
    less.render(source, {
        paths: ["./src/less"],
        filename: lessfile
    }, function(e, output){
        if(e) {
            stream.write("/*");
            stream.write(e.message);
            stream.write("\n");
            stream.write(e.stack);
            stream.write("*/");
        } else {
            stream.write(output.css);
        }
        stream.end();
    });
    return stream;
}
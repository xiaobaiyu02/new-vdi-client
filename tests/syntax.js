/* global describe */
var lint = require("mocha-eslint");
var glob = require("glob");
var fs = require("fs");

// 忽略 vue 
var ignorePatterns = ["./src/js/vue.js", "./src/js/vue.min.js"];

describe("语法检查：", function(){
    describe("主干代码：", function(){
        var paths = glob.sync("./src/js/**/*.js", {
            ignore: ignorePatterns
        });
        makeLint(paths);
    });
    describe("OEM 代码：", function(){
        var oems = fs.readdirSync("./oem");
        oems.forEach(function(name){
            describe(`${name}:`, function(){
                var paths = glob.sync(`./oem/${name}/js/**/*.js`, {
                    ignore: ignorePatterns
                });
                makeLint(paths);
            });
        });
    });
});

function makeLint(paths) {
    lint(paths, {
        alwaysWarn: false
    });
}
var minifyHTML = require("html-minifier").minify;
var UglifyJS = require("uglify-js");

exports.html = html;
exports.js = js;

function html(text) {
    return minifyHTML(text, {
        removeComments: true,
        collapseWhitespace: true,
        keepClosingSlash: true,
        caseSensitive: true
    });
}

function js(source, wrap) {
    if(typeof wrap === "undefined") {
        wrap = false;
    }
    var result = UglifyJS.minify(source, {
        fromString: true,
        output: {
            wrap_iife: wrap
        }
    });
    return result.code;
}
var browserify = require("browserify");
var watchify = require("watchify");
var through = require("through2");

var b = browserify("./src/js/app.js", {
    cache: {},
    packageCache: {},
    plugins: [watchify]
});


var index = 1;

doBundle();

function doBundle(){
    if(index === 10) { return; }
    var time = Date.now();
    b.bundle(function(){
        console.log("[%d] time: %dms", index, Date.now() - time);
        setTimeout(doBundle);
    });
    index++;
}
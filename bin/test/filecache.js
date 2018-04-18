var cache = require("../build/cache");
var builder = require("../build/dev");

var b;

cache.ready.then(function(){
    b = builder.getB();
    doBundle();
});

var index = 0;
function doBundle() {
    if(index === 10) { return }
    var time = Date.now();
    b.bundle(function(){
        console.log("[%d] time: %dms", index, Date.now() - time);
        setTimeout(doBundle);
    });
    index++;
}
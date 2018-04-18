var debug = require("debug")("build:env");
var fs = require("fs");

var ENV_PRODUCTION = "production";
var ENV_DEVELOPMENT = "development";

var envstr = process.env.NODE_ENV || ENV_DEVELOPMENT;

exports.production = envstr === ENV_PRODUCTION;
exports.development = envstr === ENV_DEVELOPMENT;

if(!exports.production) {
    exports.development = true;
}

var oemHome;
var oemName = process.argv.filter(function(item){
    return item.indexOf("-") !== 0;
})[2];

if(!oemName) {
    debug("use default client: e-vdi");
    oemName = "e-vdi";
    oemHome = "./oem/e-vdi";
} else {
    oemHome = "./oem/" + oemName;
    if(!fs.existsSync(oemHome)) {
        debug("client directory doesn't exists!");
        process.exit();
    }
    if(!fs.statSync(oemHome).isDirectory()) {
        debug(oemHome + " is not a directory!");
        process.exit();
    }
}

exports.oem = {
    name: oemName,
    home: oemHome
};

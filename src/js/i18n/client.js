var codeData = require("./code");
var langData = require("./lang");

var codeRe = /^\d+$/;

module.exports = function(text){
    var datastr;
    if(typeof text === "number" || codeRe.test(text)) {
        datastr = codeData[text];
    }
    if(!datastr) {
        datastr = langData[text];
    }
    return datastr;
}
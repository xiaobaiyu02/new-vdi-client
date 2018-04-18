/**
 * 使用 localStorage 作为底层存储方案
 * 为了方便，保存值时，将同时保存此值的类型：string, number, object 等
 * 这样可以确保获取的时候获取到正确的值，而且不用转换
 */

var db = window.localStorage;
var typeReg = /:type$/;

module.exports = {
    get: getStorage,
    set: setStorage
};

function getStorage(key){
    if(!key) {
        return key; 
    }
    checkKey(key);
    var value = db.getItem(key);
    var valueType = db.getItem(key + ":type");
    // 没有设置过值时，localStorage.getItem() 返回 null
    if(value !== null && valueType !== null) {
        switch(valueType) {
            case "number":
                value = value * 1;
                break;
            case "boolean":
                value = value === "true";
                break;
            case "object":
                if(value === "null") {
                    value = null;
                } else {
                    value = JSON.parse(value);
                }
                break;
            case "string":
                break;
            default:
                console.error("unexpected storage value type: " + valueType);
                value = null;
        }
    }
    return value;
}

function setStorage(key, value){
    var typeKey = key + ":type";
    var valueType = typeof value;
    if(valueType === "undefined") {
        value = null;
    } else if(valueType === "object") {
        value = JSON.stringify(value);
    }
    db.setItem(key, value);
    db.setItem(typeKey, valueType);
}

function checkKey(key){
    if(typeReg.test(key)) {
        console.warn("存储值时，键名不能以 `:type` 结尾！");
    }
}
/* eslint-disable */
// 后面看情况要不要实现
function checkValue(value) {
    //
}
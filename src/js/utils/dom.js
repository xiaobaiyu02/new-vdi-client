var each = require("lodash/each");

/**
 * dom 操作
 */
exports.on = on;
exports.off = off;
exports.addTag = addTag;
exports.isAndroid = isAndroid;
exports.isLinux = isLinux;
exports.isWindows = isWindows;

/**
 * 给元素绑定事件
 */
function on(element, name, handler) {
    element.addEventListener(name, handler);
}

/**
 * 卸载绑定的事件
 */
function off(element, name, handler) {
    element.removeEventListener(name, handler);
}

function addTag(name, attrs, p, after) {
    var el = document.createElement(name);
    each(attrs, function(val, key){
        el[key] = val;
    });
    if(after) {
        p.insertBefore(after, el);
    } else {
        p.appendChild(el);
    }
    return el;
}

var ua = navigator.userAgent;

function isAndroid(){
    return /android/i.test(ua);
}

function isLinux(){
    // android 上 ua 也包含 linux
    var android = isAndroid();
    return android ? false : /linux/i.test(ua);
}

function isWindows(){
    return /windows/i.test(ua);
}
var has = require("lodash/has");
var each = require("lodash/each");
var defaults = require("lodash/defaults");
var isFunction = require("lodash/isFunction");
var isObject = require("lodash/isPlainObject");
var isArray = require("lodash/isArray");

exports.mergeOptions = mergeOptions;
exports.runInNewContext = runInNewContext;
exports.callHook = callHook;
exports.setArray = setArray;

var autoId = 1;
function runInNewContext(options){
    options = options || {};
    if(!options.el) {
        options.el = "#somethingignore-" + (autoId++);
        var el = document.createElement("div");
        el.id = options.el.substring(1);
        document.body.appendChild(el);
    }
    if(!options.template) {
        throw new Error("invalid template option");
    }
    return new Vue(options);
}

function callHook(obj, method, context) {
    if(obj && has(obj, method)) {
        var fn = obj[method];
        if(isFunction(fn)) {
            try {
                fn.call(context || obj);
            } catch(e) {
                console.warn("call hook method error:", e.message);
            }
        }
    }
}

function mergeOptions(component, options) {
    each([
        "beforeCreate", "created",
        "beforeMount", "mount", "mounted",
        "beforeUpdate", "updated",
        "activated", "deactivated",
        "beforeDestroy", "destroyed"
    ], function(method){
        isFunction(options[method]) && (component[method] = options[method]);
    });
    each([
        "methods",
        "directives",
        "components",
        "mixins",
        "computed"
    ], function(key){
        if(isObject(options[key])) {
            component[key] = component[key] || {};
            defaults(component[key], options[key]);
        }
    });
    if(isArray(options.props)) {
        component.props = options.props;
    }
}

function setArray(src, dest) {
    while(src.length > 0) {
        src.pop();
    }
    src.push.apply(src, dest);
}
/**
 * number 指令
 */
var dom = require("../utils/dom");
var isNumberEvent = require("../utils/keyboard").isNumberEvent;

var numberRange = /^\d+-\d+$/;

// FIXME: 这个数组用来缓存 element 和对应 vnode 的数组
// 这种方法有点 low，但是 vue 里面没有根据 element 获取 vnode 的接口
var bindCache = [];

module.exports = {
    bind: bindFn,
    unbind: unbindFn
};

function bindFn(el, info){
    var tag = el.tagName.toLowerCase();
    if(tag !== "input") {
        return console.error(
            "v-" + info.name + " only support <input type=\"text\"/>"
        );
    }
    dom.on(el, "keydown", onKeydown);
    dom.on(el, "input", onInput);
    bindCache.push([el, info]);
}
function unbindFn(el){
    dom.off(el, "keydown", onKeydown);
    dom.off(el, "input", onInput);
    removeCache(el);
}
function onKeydown(e){
    if(!isNumberEvent(e)) {
        return e.preventDefault(), false;
    }
}
function onInput(e){
    var value = e.target.value * 1;
    if(isNaN(value)) {
        e.target.value = "";
        return ;
    }
    var range = parseRange(getVNode(e.target).value);
    if(!range) {
        return; 
    }
    // vue 中指令和组件是两种东西，无法从指令中直接获取组件，所以下面的
    // 代码本希望是自动为不符合校验规则的组件添加失败 class 或者触发
    // 特殊的事件，看来是要泡汤了，后面看有没有其它方法可以做到
    // if(value >= range.min && value <= range.max) {
    //     this.$emit("valid");
    // } else {
    //     this.$emit("invalid");
    // }
}
function parseRange(value) {
    if(value && numberRange.test(value)) {
        var parts = value.split("-");
        var num1 = parts[0] * 1;
        var num2 = parts[1] * 1;
        if(!isNaN(num1) && !isNaN(num2) && num1 <= num2) {
            return {min: num1, max: num2};
        }
    }
    return false;
}

function removeCache(element) {
    var index = -1;
    bindCache.forEach(function(arr, i){
        var el = arr[0];
        var vnode = arr[1]; // eslint-disable-line
        if(el === element) {
            index = i;
        }
    });
    if(index > -1) {
        bindCache.splice(index, 1);
    }
}

function getVNode(element) {
    var hit = false;
    bindCache.forEach(function(arr){
        var el = arr[0];
        var vnode = arr[1];
        if(el === element) {
            hit = vnode;
        }
    });
    return hit;
}
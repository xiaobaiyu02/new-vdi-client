/**
 * 键盘相关的实用函数
 */
exports.isNumberEvent = isNumberEvent;

var numberCodes = [
    // 主键盘上的数字键
    48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
    // 小键盘上的数字键
    96, 97, 98, 99, 100, 101, 102, 103, 104, 105
];
function isNumber(keycode) {
    return numberCodes.indexOf(keycode) > -1;
}

function isNumberEvent(e) {
    var code = e.which || e.keyCode;
    if(e.altKey) {
        return false;
    }
    if(e.shiftKey) {
        // shift + left, shift + right
        return code === 37 || code === 40;
    }
    if(e.ctrlKey || e.metaKey) {
        // ctrl/meta + a, ctrl/meta + c
        return code === 65 || code === 67;
    }
    if( code === 8  /* backspace */ ||
        code === 46 /* delete */    ||
        code === 9  /* tab */       ||
        code >= 35 && code <= 40 /* home end left up right down */) {
        return true;
    }
    return isNumber(code);
}
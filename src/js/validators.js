/**
 * 后面考虑拆分这个文件为如下结构：
 * - validators
 *     vtypes.js
 *     index.js
 *     <func>.js
 */
/* global */
var defaults = require("lodash/defaults");
var isString = require("lodash/isString");
var isFunction = require("lodash/isFunction");

// ip 正则表达式，下面的字符串是 0-255 的正则表达式
var segRe = "([0-9]|[1-9][0-9]?|1[0-9][0-9]|2[0-4][0-9]|25[0-5])";
var ipRegExp = new RegExp("^" + [segRe, segRe, segRe, segRe].join("\\.") + "$");
// 无效 IP 集合，后面测试提了新的无效 IP 再加
var invalidIps = [
    "0.0.0.0"
];
// 字母类域名正则表达式，域名表达式也要计算 ip
var domainRegExp = /^([-0-9a-z]+\.){1,}[a-z]+$/i;

var vtypes = {
    ip: function(val){
        var valid = ipRegExp.test(val);
        valid = valid && (invalidIps.indexOf(val) === -1);
        return valid;
    },
    domain: function(val){
        return ipRegExp.test(val) || domainRegExp.test(val);
    },
    port: function(val) {
        var n = val * 1;
        if(isNaN(n)) {
            return false;
        } else {
            return n >= 1025 && n <= 65535;
        }
    },
    numberRange: function(min, max){
        return function(val){
            var n = val * 1;
            return n >= min && n <= max;
        };
    }
};

// 登录界面
var loginValidators = {
    username: {
        label: "用户名",
        required: true,
        minlength: 2,
        maxlength: 32
    },
    password: {
        label: "密码",
        required: true,
        minlength: 1,
        maxlength: 20
    }
};

// 修改密码
var modifyPasswordValidators = {
    musername: loginValidators.username,
    mpassword: {
        label: "旧密码",
        required: true,
        minlength: 6,
        maxlength: 20
    }
};
modifyPasswordValidators.mpassword1 = defaults({
    label: "新密码",
    fn: function(values){
        if(values.mpassword && values.mpassword1) {
            if(values.mpassword === values.mpassword1) {
                return "旧密码与新密码一致";
            }
        }
        if(values.mpassword1 && values.mpassword2) {
            if(values.mpassword1 !== values.mpassword2) {
                return "两次输入密码不一致";
            }
        }
        return true;
    }
}, modifyPasswordValidators.mpassword);
modifyPasswordValidators.mpassword2 = defaults({
    label: "确认密码"
}, modifyPasswordValidators.mpassword1);

// 设置 - 服务器地址
var serverAddressValidators = {
    console_ip: {
        label: "服务器地址",
        required: true,
        regex: ipRegExp,
        regexText: "无效的 IP 地址"
    },
    console_port: {
        label: "端口",
        required: true,
        fn: function(values){
            return vtypes.port(values.console_port);
        }
    }
};
// 设置 - 网络
var networkValidators = {
    address: {
        label: "IP地址",
        required: true,
        regex: ipRegExp,
        regexText: "无效的 IP 地址"
    }
};
networkValidators.mask = defaults({
    label: "子网掩码"
}, networkValidators.address);
networkValidators.gateway = defaults({
    label: "网关",
    required: false
}, networkValidators.address);
networkValidators.dns1 = defaults({
    label: "DNS1",
    required: false
}, networkValidators.address);
networkValidators.dns2 = defaults({
    label: "DNS2",
    required: false
}, networkValidators.address);

networkValidators.ssid = {
    label: "SSID",
    required: true
};
networkValidators.wifipassword = {
    label: "wifi密码",
    required: true
};
// 设置 - 系统

module.exports = {
    login: createValidator.bind(this, loginValidators),
    modifypwd: createValidator.bind(this, modifyPasswordValidators),
    settings: {
        serverAddress: createValidator.bind(this, serverAddressValidators),
        network: createValidator.bind(this, networkValidators)
    },
    vtypes: vtypes
};

function validate(val, rules, values) {
    var label = rules.label;
    if(rules.required) {
        if(!val) {
            return "请输入" + label;
        }
    } else {
        // 虽然这个字段不是必须的，但是如果有值也要校验
        if(!val) {
            return true;
        }
    }
    if(rules.minlength) {
        if(val.length < rules.minlength) {
            return label + "最短长度是" + rules.minlength + "个字符";
        }
    }
    if(rules.maxlength) {
        if(val.length > rules.maxlength) {
            return label + "最大长度是" + rules.maxlength + "个字符";
        }
    }
    if(rules.regex) {
        if(!rules.regex.test(val)) {
            return rules.regexText;
        }
    }
    if(isFunction(rules.fn)) {
        return rules.fn(values, label);
    }
    var num = val * 1;
    if(typeof rules.min === "number") {
        if(num < rules.min) {
            return label + "不能小于" + rules.min;
        }
    }
    if(typeof rules.max === "number") {
        if(num > rules.max) {
            return label + "不能大于" + rules.max;
        }
    }
    return true;
}

/**
 * 根据指定的规则对象创建一个校验器
 * 
 * 规则对象的键是字段名，值是规则对象，如：
 *   rules = {
 *     label: "字段名称"
 *     required: true
 *   };
 * 目前支持的规则有：required, minlength, maxlength, min, max, regexp, 自定义校验
 * @param {Object} rules 字段规则描述
 */
function createValidator(rules){
    var allDirty = false;
    var dirtyFields = {};
    var errors = {};
    return {
        markAllDirty: markAllDirty,
        checkAllValid: checkAllValid,
        checkValid: checkValid,
        markDirty: markDirty,
        markReset: markReset,
        isValid: isValid,
        getError: getError
    };
    // 检查所有的字段是否是有效的
    // 可以指定字段列表
    function checkAllValid(fields){
        var valid = true;
        var self = this;
        if(!fields) {
            fields = Object.keys(rules);
        }
        fields.forEach(function(field){
            var ret = self.checkValid(field, self[field]);
            // 加上调试，当出现校验不通过的情况时，直接看控制台就好了
            if(window.DEBUG && isString(ret)) {
                console.log("validate", rules[field].label, "fail:", ret);
            }
            valid = valid && (isString(ret) ? false : ret);
        });
        return isString(valid) ? false : valid;
    }
    // 校验某字段是否有效
    function checkValid(field, value){
        if(field in rules) {
            return validate(value, rules[field], this);
        }
        // 默认为 true
        return true;
    }
    // 先检查是否修改过，没有修改过认为是有效的
    // 需要绑定 validator 到 form 表单时，使用此方法和 markDirty 可以获得实时校验效果
    function isValid(field) {
        var v, value = this[field];
        if(allDirty) {
            v = this.checkValid(field, value);
            if(isString(v)) {
                errors[field] = v;
                return false;
            }
            delete errors[field];
            return v;
        }
        if(field in dirtyFields) {
            v = this.checkValid(field, value);
            if(isString(v)) {
                errors[field] = v;
                return false;
            }
            delete errors[field];
            return v;
        } else {
            delete errors[field];
            return true;
        }
    }
    // 将指定字段设置为修改过
    function markDirty(field) {
        dirtyFields[field] = true;
    }
    // 将所有字段设置为修改过
    function markAllDirty(){
        allDirty = true;
    }
    function getError() {
        var keys = Object.keys(errors);
        return keys.length > 0 ? errors[keys[0]] : "";
    }
    function markReset() {
        var args = [].slice.call(arguments);
        args.forEach(function(arg){
            delete dirtyFields[arg];
        });
    }
}
/**
 * 这个文件定义了一些组件生成器。
 *
 * 先定义两个概念：动态组件，静态组件。
 *
 * 在项目中，具体到某一个功能组件，其属性都是确定的，比如一个数字
 * 输入组件，它的 max, min, maxlength, minlength 等属性都是
 * 确定的。这样在实现这个组件的时候根据这些确定的属性去配置就好了，
 * 也就是说这种方式并不需要动态传递数据给组件了。这就是静态组件。
 *
 * 但是假如说有很多这样的数字输入组件，我希望共享一段代码来实现他
 * 们，每个组件的 max, min, maxlength, minlength 属性都不相
 * 同，而且我希望在模板里面动态传递这些属性给这些数字输入组件们。
 * 这时候使用一段共享代码实现的组件就可以称为动态组件。
 *
 * 其实具体到项目功能，每一个组件的属性当然是确定的，也就是说使用
 * 静态组件可以完成一切，但是静态组件的缺点是需要为项目中每个组件
 * 封装一次，这样会多写很多代码。而动态组件抽象了一些可以动态传输
 * 的属性，代码复用率高，但它也有一个显著的缺点，动态组件需要暴露
 * 很多属性，这些属性有一些是需要动态传输的，有一些并不需要，这样
 * 看来，动态组件中其实也有静态属性需求，这样说，静态和动态组件的
 * 界限就比较模糊了，所以写代码的时候如何界定这个动、静就是很重要
 * 的问题了。（在 vue 里面，如果定义了属性，却没有使用，控制台就
 * 会发出红色警告）
 *
 * 这个文件定义的组件生成器通过接受一些选项来动态确定生成的组件是
 * 否需要动态属性。
 * 
 */
var each = require("lodash/each");
var isRegExp = require("lodash/isRegExp");
var isFunction = require("lodash/isFunction");
var isString = require("lodash/isString");
var isNumber = require("lodash/isNumber");
var assign = require("lodash/assign");
var clone = require("lodash/cloneDeep");
var defaultsDeep = require("lodash/defaultsDeep");

module.exports = {
    bsInput: bsInput,
    bsTextInput: bsTextInput,
    bsPasswordInput: bsPasswordInput,
    bsNumberInput: bsNumberInput,
    bsIpInput: bsIpInput,
    bsSelect: bsSelect,
    bsCheckbox: bsCheckbox,
    bsRadio: bsRadio
};

function bsInput(options) {
    options = assign({}, {
        type: "text",
        name: "",
        formGroupCls: "form-group clearfix",
        labelCls: "control-label",
        groupCls: "",
        // 如果指定了 grid 分割比例数据，忽略 labelCls 和 groupCls
        gridScale: "",
        formControlCls: "form-control",
        // lg md sm xs
        size: "xs",
        invalidCls: "invalid-input",
        disabledCls: "disabled-input"
    }, options);
    // 1. 生成 form-group 模板结构
    // 2. 根据 options.getInputTemplate() 生成输入框模板
    // 3. 合并组件属性
    var invalidCls = options.invalidCls;
    var disabledCls = options.disabledCls;
    var data = {}, props = ["value", "disabled"];
    var component = {
        props: props,
        data: data,
        watch: {
            // 来自父组件的值
            value: function(val){
                this.inputValue = val;
            },
            // 组件内值变化
            inputValue: function(val){
                this.$emit("input", val);
                this.checkValid();
            }
        },
        methods: {
            checkValid: function(){
                this.invalidCls = this.isValid() ? "" : invalidCls;
            },
            isValid: function(){
                if(this.disabled) {
                    return true;
                }
                var value = this.inputValue;
                var validator = options.validator;
                var ret;
                if(isRegExp(validator)) {
                    ret = validator.test(value);
                    if(!ret) {
                        this.errorMsg = this.regexpText;
                    }
                } else if(isFunction(validator)) {
                    ret = validator(value);
                    if(isString(ret)) {
                        this.errorMsg = ret;
                    }
                } else {
                    ret = true;
                }
                return ret;
            }
        }
    };
    var buf = [
        "<div class='" + options.formGroupCls + "' " +
        ":class='{\"" + invalidCls + "\": invalidCls, " +
        "\"" + disabledCls + "\": disabled}'>"];
    var labelCls = options.labelCls;
    var groupCls = options.groupCls;

    if(options.gridScale) {
        var scales = options.gridScale.split(":");
        labelCls = "control-label col-" + options.size + "-" + scales[0];
        groupCls = "col-" + options.size + "-" + scales[1];
    }
    buf.push("<label class='" + labelCls + "'>");
    if(options.labelText) {
        buf.push(options.labelText);
    } else {
        buf.push("{{labelText}}");
        props.push("labelText");
    }
    buf.push("</label>");
    buf.push("<div class='" + groupCls + "'>");
    if(typeof options.getInputTemplate === "function") {
        buf.push(options.getInputTemplate(options));
    } else {
        buf.push("<slot></slot>");
    }
    
    buf.push("</div></div>");
    component.template = buf.join("");
    if(isFunction(options.patch)) {
        options.patch(component);
    }
    assign(component.methods, options.methods);
    component.data = function(){
        var mydata = clone(data);
        // 初始错误信息
        mydata.errorMsg = "";
        // 设置初始值
        mydata.inputValue = this.value;
        mydata.invalidCls = "";
        return mydata;
    };
    return component;
}

function bsTextInput(options) {
    options = assign({}, {
        getInputTemplate: function(opts){
            var buf = ["<input "];
            buf.push(inputAttrStr(opts));
            buf.push("/>");
            return buf.join("");
        }
    }, options);
    options.type = "text";
    return bsInput(options);
}

function bsPasswordInput(options) {
    options = assign({}, {
        getInputTemplate: function(opts){
            var buf = ["<input "];
            buf.push(inputAttrStr(opts));
            buf.push("/>");
            return buf.join("");
        }
    }, options);
    options.type = "password";
    return bsInput(options);
}

function bsNumberInput(options){
    options = assign({}, {
        min: null,
        max: null,
        patch: function(component){
            component.props.push("min", "max");
        },
        getInputTemplate: function(opts){
            var buf = ["<input "];
            var min = opts.min;
            var max = opts.max;
            if(isNumber(min) && isNumber(max) && min <= max) {
                buf.push(" v-number='" + min + "-" + max + "'");
            } else {
                buf.push(" v-number");
            }
            buf.push(inputAttrStr(opts));
            buf.push("/>");
            return buf.join("");
        }
    }, options);
    return bsInput(options);
}

function bsSelect(options){
    options = assign({}, {
        options: null,
        patch: function(component){
            if(options.optionTemplate) {
                component.props.push("options");
            }
        },
        getInputTemplate: function(opts){
            var buf = ["<select "];
            buf.push(inputAttrStr(opts));
            buf.push(">");
            if(opts.options) {
                each(opts.options, function(o){
                    buf.push(
                        "<option value='" + o.value + "'>" +
                        o.text +
                        "</option>"
                    );
                });
            } else {
                buf.push(opts.optionTemplate);
            }
            buf.push("</select>");
            return buf.join("");
        }
    }, options);
    return bsInput(options);
}

function bsCheckbox(options){
    options = assign({}, {
        name: null,
        inline: false,
        item: null,
        itemTemplate: null
    }, options, {type: "checkbox"});
    var buf = ["<div class='checkbox'>"];
    var props = ["value"];
    if(options.items) {
        each(options.items, function(item){
            if(options.inline) {
                buf.push("<label class='checkbox-inline'>")
            } else {
                buf.push("<label>");
            }
            buf.push(
                "<input v-model='inputValue' type='checkbox' name='" +
                options.name + "' value='" + item.value + "'" +
                (item.checked ? " checked" : "") + "/> " + item.text);
            buf.push("</label>");
        });
        
    } else {
        buf.push(options.itemTemplate);
        props.push("items");
    }
    buf.push("</div>");
    
    var component = {
        props: props,
        template: buf.join(""),
        data: function(){
            var data = {};
            // 设置初始值
            data.inputValue = this.value;
            return data;
        },
        watch: {
            // 来自父组件的值
            value: function(val){
                this.inputValue = val;
            },
            // 组件内值变化
            inputValue: function(val){
                this.$emit("input", val);
            }
        }
    };
    if(isFunction(options.patch)) {
        options.patch(component);
    }
    return component;
}

function bsRadio(options){
    options = assign({}, {
        name: null,
        inline: false,
        item: null,
        itemTemplate: null
    }, options, {type: "radio"});
    var buf = ["<div class='radio'>"];
    var props = ["value"];
    if(options.items) {
        each(options.items, function(item){
            if(options.inline) {
                buf.push("<label class='radio-inline'>")
            } else {
                buf.push("<label>");
            }
            buf.push(
                "<input v-model='inputValue' type='radio' name='" + item.name +
                "' value='" + item.value + "'" +
                (item.checked ? " checked" : "") + "/>");
            buf.push("<span>" + item.text + "</span>");
            buf.push("</label>");
        });
        
    } else {
        buf.push(options.itemTemplate);
        props.push("items");
    }
    buf.push("</div>");
    
    var component = {
        props: props,
        template: buf.join(""),
        data: function(){
            var data = {};
            // 设置初始值
            data.inputValue = this.value;
            return data;
        },
        watch: {
            // 来自父组件的值
            value: function(val){
                this.inputValue = val;
            },
            // 组件内值变化
            inputValue: function(val){
                this.$emit("input", val);
            }
        }
    };
    if(isFunction(options.patch)) {
        options.patch(component);
    }
    return component;
}

function bsIpInput(options) {
    options = assign({}, {
        ipControlCls: "ip-wrapper",
        patch: function(component){
            assign(component.data, {seg1: "", seg2: "", seg3: "", seg4: ""});
            defaultsDeep(component, {
                // watch: {
                // 	value: function(value){
                // 		this.setIp(value || "");
                // 	},
                // 	inputValue: function(){}
                // },
                mounted: function(e){ // eslint-disable-line no-unused-vars
                    var self = this;
                    self.setIp(this.value || "");
                    this.$watch(function(){
                        this.inputValue = 
                            this.seg1 + "." +
                            this.seg2 + "." +
                            this.seg3 + "." +
                            this.seg4;
                        return this.inputValue;
                    // eslint-disable-next-line no-unused-vars
                    }, function(vnew, vold){ 
                        self.$emit("input", vnew);
                        self.checkValid();
                    });
                },
                methods: {
                    setIp: function(ip){
                        var self = this;
                        var parts = ip.split(".");
                        [1, 2, 3, 4].forEach(function(i){
                            self["seg" + i] = parts[i - 1] || "";
                        });
                    },
                    focus: function(){
                        this.$refs.formControl.classList.add("focus");
                    },
                    blur: function(){
                        this.$refs.formControl.classList.remove("focus");
                    },
                    keydown: function(e){
                        var code = e.which || e.keyCode;
                        if(code === 9 || code === 190 || code === 110){
                            return this.focusNextByTab(e);
                        } else if(code === 39) {
                            return this.focusNext(e);
                        } else if(code === 37 || code === 8/* backspace */) {
                            return this.focusPrev(e);
                        } else {
                            // 
                        }
                    },
                    focusPrev: function(e){
                        var src = e.target;
                        if(src.selectionStart === 0 && src.selectionEnd === 0) {
                            var el = this.prevInput(src);
                            if(el) {
                                el.focus();
                                el.selectionStart = el.value.length;
                                el.selectionEnd = el.value.length;
                                return e.preventDefault(), false;
                            }
                        }
                    },
                    focusNext: function(e){
                        var src = e.target;
                        var pos = src.value.length;
                        if(src.selectionStart === pos &&
                            src.selectionEnd === pos) {
                            var el = this.nextInput(src);
                            if(el) {
                                el.focus();
                                el.selectionStart = el.selectionEnd = 0;
                                return e.preventDefault(), false;
                            }
                        }
                    },
                    focusNextByTab: function(e){
                        var src = e.target;
                        var el = this.nextInput(src);
                        if(el) {
                            el.focus();
                            el.selectionStart = el.selectionEnd = 0;
                            el.select();
                            return e.preventDefault(), false;
                        }
                    },
                    nextInput: function(el){
                        var hitKey, skey, num;
                        each(this.$refs, function(ref, key){
                            if(el === ref) {
                                hitKey = key;
                            }
                        });
                        if(hitKey) {
                            skey = hitKey.substring(0, hitKey.length - 1);
                            num = hitKey.substring(hitKey.length - 1) * 1;
                            hitKey = skey + (num + 1);
                        }
                        return hitKey ? this.$refs[hitKey] : null;
                    },
                    prevInput: function(el){
                        var hitKey, skey, num;
                        each(this.$refs, function(ref, key){
                            if(el === ref) {
                                hitKey = key;
                            }
                        });
                        if(hitKey) {
                            skey = hitKey.substring(0, hitKey.length - 1);
                            num = hitKey.substring(hitKey.length - 1) * 1;
                            hitKey = skey + (num - 1);
                        }
                        return hitKey ? this.$refs[hitKey] : null;
                    }
                }
            });
            // 重写 watch value, inputValue
            component.watch.value = function(val){
                this.setIp(val || "");
            };
            component.watch.inputValue = function(){};
        },
        getInputTemplate: function(opts){
            var buf = [
                "<div ref='formControl' class='" + opts.ipControlCls + "'>"
            ];
            each([1, 2, 3, 4], function(i){
                if(i > 1) {
                    buf.push("<span>.</span>");
                }
                buf.push(
                    "<input type='text' ref='seg" + i + "' " +
                    "v-number='\"0-255\"' :disabled='disabled' " +
                    "@keydown='keydown' @focus='focus' " +
                    "@blur='blur' maxlength='3' v-model='seg" + i + "'/>"
                );
            });
            buf.push("</div>");
            return buf.join("");
        }
    }, options);
    return bsInput(options);
}

// FIXME: 这个名字含义表达的太不清晰
function inputAttrStr(options) {
    var buf = [];
    var type = options.type || "text";
    buf.push("type='" + type + "'");
    buf.push("class='" + options.formControlCls + "'");
    buf.push("v-model='inputValue'");
    ["name", "minlength", "maxlength", "placeholder"].forEach(function(attr){
        if(options[attr]) {
            buf.push(attr + "='" + options[attr] + "'");
        }
    });
    return buf.join(" ");
}
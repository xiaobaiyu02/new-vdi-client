/**
 * modal 组件
 * 
 * modal 组件在 vue 里面的使用方式有别于 angular。vue 设计思想是状态驱动，
 * 而不是动态插入、编译模板，这样一来 modal 相关的处理方法就比较棘手，因为
 * modal 内的内容必然和 modal 的父组件有数据交互，也就是说，modal 相关的
 * 处理不再是封闭的，相对于 angular 来说，原来封闭的操作有一部分需要公开到
 * 父组件中，这样必然导致父组件承担了大部分 modal 的业务逻辑，这也是这个组件
 * 之前一直设计不好的重要原因。
 * 
 * 新的设计方式接受额外的 data，也接受额外的模板。这样保证了额外的模板不需要
 * 在父组件中编译，也就可以和父组件解耦。也保证了 modal 的封闭特性。也兼容了
 * vue 状态驱动的思想。
 * 
 * 参考尤雨溪在知乎上的回答：https://www.zhihu.com/question/35820643
 */
/* global views */
var i18n = require("../../i18n/client");
var assign = require("lodash/assign");
var isObject = require("lodash/isPlainObject");
var isString = require("lodash/isString");
var isFunction = require("lodash/isFunction");
var clone = require("lodash/cloneDeep");
var mergeOptions = require("../../utils/vue").mergeOptions;

exports.create = function(options){
    var modalData = assign({
        title: "",
        okText: i18n("确定"),
        cancelText: i18n("取消"),
        size: "lg",
        fade: true,
        dialogCls: "",
        autoCenter: true
    }, options.data);
    // 动态构造新模板
    var modalTemplate = views.modal;
    if(isObject(options.template)) {
        if(isString(options.template.header)) {
            modalTemplate = modalTemplate.replace(
                /<slot name="header">[\s\S]*?<\/slot>/,
                options.template.header
            );
        }
        if(isString(options.template.body)) {
            modalTemplate = modalTemplate.replace(
                "<slot></slot>",
                options.template.body
            );
        }
        if(isString(options.template.footer)) {
            modalTemplate = modalTemplate.replace(
                /<slot name="footer">[\s\S]*?<\/slot>/,
                options.template.footer
            );
        }
    } else if(isString(options.template)) {
        modalTemplate = modalTemplate.replace(
            "<slot></slot>",
            options.template
        );
    }
    var component = {
        data: function(){
            return clone(modalData);
        },
        template: modalTemplate,
        mounted: function(){
            var el = this.$el;
            if(el.nodeType !== 1) {
                return; 
            }
            el.classList.add("opened");
            this.autoCenter && centerModal(el);
            this.$emit("open");
        },
        updated: function(){
            var self = this;
            if(self.autoCenter) {
                self.$nextTick(function(){
                    centerModal(this.$el);
                });
            }
        },
        methods: {
            ok: function(){
                if(isFunction(this.validate)) {
                    if(this.validate()) {
                        this.$emit("ok");
                    }
                } else {
                    this.$emit("ok");
                }
            },
            close: function(){
                this.$emit("close");
            },
            cancel: function(){
                this.$emit("cancel");
            }
        }
    };
    mergeOptions(component, options);
    return component;
};

function centerModal(el){
    if(el.nodeType !== 1) {
        return;
    }
    var dialogEl = el.querySelector(".modal-dialog");
    var rect = dialogEl.getBoundingClientRect();
    dialogEl.style.marginTop = -1 * rect.height / 2 + "px";
    
}
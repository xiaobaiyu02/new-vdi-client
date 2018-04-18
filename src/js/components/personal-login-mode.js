/* global currentClient */
var validator = require("../validators").modifypwd();
var assign = require("lodash/assign");
var isPlainObject = require("lodash/isPlainObject");
var storage = require("../storage");
var constants = require("../constants");
var i18n = require("../i18n/client");

var cacheKey = "login-params";
/**
 * 个人模式组件
 */
module.exports = {
    data: function(){
        return {
            // 登录用户名、密码
            username: "",
            password: "",
            // 两个复选框：保存密码，自动登录
            savePassword: false,
            autoLogin: false,
            // m 开头的是修改密码界面的字段
            // 依次为：用户名，旧密码，新密码，确认密码
            musername: "",
            mpassword: "",
            mpassword1: "",
            mpassword2: "",
            // 是否显示修改密码界面
            isModifing: false,
            // 错误消息
            error: "",
            showGoBack: currentClient.desktopMode === 0 ? true : false
        };
    },
    computed: {
        canLogin: function(){
            var flag = checkLength(this.username, 2, 32);
            flag = flag && checkLength(this.password, 1, 20);
            return flag;
        },
        canUpdate: function(){
            var flag = checkLength(this.musername, 2, 32);
            flag = flag && checkLength(this.mpassword, 6, 20);
            flag = flag && checkLength(this.mpassword1, 6, 20);
            flag = flag && checkLength(this.mpassword2, 6, 20);
            return flag;
        }
    },
    watch: {
        isModifing: function(val){
            this.$emit("alert", "");
            // 跳转到修改密码界面清空密码
            if(val) {
                this.markReset("mpassword", "mpassword1", "mpassword2");
                this.mpassword = "";
                this.mpassword1 = "";
                this.mpassword2 = "";
            }
        }
    },
    template: views["personal-login-mode"], // eslint-disable-line no-undef
    created: function(){
        var loginParams = storage.get(cacheKey);
        if(isPlainObject(loginParams)) {
            this.username = loginParams.username || "";
            this.password = loginParams.password || "";
            this.savePassword = loginParams.savePassword || false;
            this.autoLogin = loginParams.autoLogin || false;
        }
        this.$watch("savePassword", function(val){
            if(!val && this.autoLogin) {
                this.autoLogin = false;
            }
        });
        this.$watch("autoLogin", function(val){
            if(val && !this.savePassword) {
                this.savePassword = true;
            }
        });
        this.$watch("userUpdated", function(val){
            if(val) {
                this.isModifing = false;
            }
        });
        this.$watch(function(){
            return [
                this.musername,
                this.mpassword,
                this.mpassword1,
                this.mpassword2
            ].join("|");
        }, function(){
            this.error = "";
        });
        if(this.username && this.password && this.autoLogin) {
            // 存在此标记，则不自动登录
            if(sessionStorage.autoLogin === "false") {
                delete sessionStorage.autoLogin;
            } else {
                this.login();
            }
        }
    },
    beforeDestroy: function(){
        this.$emit("alert", "");
    },
    methods: {
        _: i18n,
        login: function(){
            var obj = {
                username: this.username,
                password: this.password,
                savePassword: this.savePassword,
                autoLogin: this.autoLogin
            };
            // 缓存是本地控制的
            if(this.savePassword) {
                storage.set(cacheKey, obj);
            } else {
                storage.set(cacheKey, null);
            }
            // 服务器只需要这两个参数
            this.$emit("userlogin", {
                name: this.username,
                password: this.password
            });
        },
        goback: function(){
            if(this.isModifing) {
                this.isModifing = false;
            } else {
                this.$emit("modechange", constants.MIXED);
            }
        },
        updateUser: function(){
            var self = this;
            self.$emit("updateuser", {
                username: self.musername,
                old_password: self.mpassword,
                new_password: self.mpassword1,
                new_password2: self.mpassword2
            }, function(err){
                if(err) {
                    self.error = err.message;
                } else {
                    self.username = self.musername;
                    self.password = self.mpassword;
                    self.isModifing = false;
                }
            });
        }
    }
};

assign(module.exports.methods, validator);

function checkLength(s, min, max) {
    return s.length >= min && s.length <= max;
}
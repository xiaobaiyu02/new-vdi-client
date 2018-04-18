/**
 * 混合模式组件
 */
/* global Promise */
var constants = require("../constants");
var i18n = require("../i18n/client");
var currentClient = require("../utils/client");
// 是否启用倒计时，仅第一次进入混合模式时倒计时
var enableCountdown = true;
// 倒计时计时器
var countdownTimer;

var modeArr = [null, constants.TEACHING, constants.PERSONAL_LOGIN];

module.exports = {
    props: ["version", "online", "suspend"],
    data: function(){
        return {
            countdowning: false
        };
    },
    template: views["mixed-mode"], // eslint-disable-line
    methods: {
        _: i18n,
        showTeachingView: function(){
            this.$emit("modechange", constants.TEACHING);
        },
        showPersonalView: function(){
            // 不管有没有，都做一次删除操作
            delete sessionStorage.autoLogin;
            this.$emit("modechange", constants.PERSONAL_LOGIN);
        },
        startCountdown: function(){
            var self = this;
            var seconds = currentClient.modeCountdown;
            var mode = currentClient.finalMode;
            if(!enableCountdown) {
                return; 
            }
            countdownTimer = setInterval(function(){
                // 有对话框打开的话，停止
                if(self.suspend) {
                    return self.stopCountdown(); 
                }
                if(seconds === 0) {
                    self.stopCountdown();
                    self.$emit("modechange", modeArr[mode]);
                } else {
                    self.$emit("alert", getCountdownMessage(seconds, mode));
                }
                seconds--;
            }, 1000);
            this.countdowning = true;
            // 只有第一次进入混合模式才倒计时
            enableCountdown = false;
        },
        stopCountdown: function(){
            if(!this.countdowning) {
                return;
            }
            clearInterval(countdownTimer);
            countdownTimer = null;
            this.countdowning = false;
            this.$emit("alert", "");
        },
        // 需要的时候注册
        watchOnline: function(){
            this.$watch("online", function(val){
                if(val) {
                    this.startCountdown();
                } else {
                    if(this.countdowning) {
                        this.stopCountdown();
                        // 恢复网络后允许再次倒计时
                        enableCountdown = true;
                    }
                }
            });
        }
    },
    beforeCreate: function(){
        initData.call(this);
    },
    beforeDestroy: function(){
        if(this.countdowning) {
            this.stopCountdown();
        }
    }
};

function getCountdownMessage(second, mode) {
    var modeText = ["", "自动进入场景", "自动进入桌面"][mode];
    return second + i18n(modeText);
}

var inited = false;
function initData(){
    if(inited) {
        return; 
    }
    var self = this;
    currentClient.promise.then(function(){
        // 根据模式选择要进入的桌面
        if(currentClient.desktopMode !== 0) {
            enableCountdown = false;
            self.$emit("modechange", modeArr[currentClient.desktopMode]);
        }
        var seconds = currentClient.modeCountdown;
        if(seconds < 1) {
            enableCountdown = false;
        }
        if(self.online) {
            self.startCountdown();
        }
        // 如果提前判定 enableCountdown 为 false，则不监听
        if(enableCountdown) {
            self.watchOnline();
        }
    }).catch(function(e){
        self.$emit("alert", e ? e.message : "init client error");
    });
    inited = true;
}
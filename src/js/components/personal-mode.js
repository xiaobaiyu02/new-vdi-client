/**
 * 个人桌面模式组件
 */
/* global currentClient */
var constants = require("../constants");
var i18n = require("../i18n/client");
var pageSize = 6;
var countdownTimer;
module.exports = {
    props: ["personalItems", "online", "suspend"],
    watch: {
        online: function(val){
            if(!val && this.countdowning) {
                this.stopCountdown();
            }
        }
    },
    data: function(){
        return {
            currentPage: 1,
            hasConnected: false,
            countdowning: false
        }
    },
    computed: {
        pageCount: function(){
            var len = this.personalItems.length;
            if(len % pageSize === 0) {
                return len / pageSize;
            } else {
                return Math.ceil(len / pageSize);
            }
        },
        row1Items: function(){
            var page = this.currentPage;
            var rowData = this.personalItems.slice(
                (page - 1) * pageSize,
                page * pageSize
            );
            return rowData.slice(0, 3);
        },
        row2Items: function(){
            var page = this.currentPage;
            var rowData = this.personalItems.slice(
                (page - 1) * pageSize,
                page * pageSize
            );
            return rowData.slice(3);
        }
    },
    template: views["personal-mode"], // eslint-disable-line no-undef
    created: function(){
        var prevAutoConnectVm;
        var watchFn = function(newvalue){
            var autoConnectVm;
            if(currentClient.waittime === 0) {
                return; 
            }
            if(newvalue && newvalue.length === 1) {
                autoConnectVm = newvalue[0];
                if(!this.countdowning) {
                    this.startCountdown(function(){
                        this.connect(prevAutoConnectVm);
                    });
                }
                prevAutoConnectVm = autoConnectVm;
            } else {
                this.stopCountdown();
            }
        };
        var unwatchVmList = this.$watch("personalItems", watchFn);
        // 已经连接桌面后，取消锁定机制
        var unwatchHasConnected = this.$watch("hasConnected", function(val){
            if(!val) {
                return; 
            }
            unwatchVmList();
            unwatchHasConnected();
        });
        // 个人桌面数据的列表是由登录接口返回的，所以可能不会触发 watch，这里手动触发
        if(this.personalItems && this.personalItems.length > 0) {
            watchFn.call(this, this.personalItems);
        }
    },
    beforeDestroy: function(){
        this.$emit("alert", "");
    },
    methods: {
        _: i18n,
        goback: function(){
            // 回到登录界面后，不应当再自动登录
            sessionStorage.autoLogin = "false";
            this.$emit("modechange", constants.PERSONAL_LOGIN);
        },
        connect: function(item){
            if(this.countdowning) {
                this.stopCountdown();
            }
            this.$emit("connect", {
                instance_id: item.id,
                vm_id: item.id,
                vm_type: 2,
                desktop_mode: 2,
                os_type: item.image ? item.image.os_type : ""
            });
            this.hasConnected = true;
        },
        prevPage: function(){
            if(this.currentPage > 1) {
                this.currentPage--;
            }
        },
        nextPage: function(){
            if(this.currentPage < this.pageCount) {
                this.currentPage++;
            }
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
        startCountdown: function(callback){
            var self = this;
            var count = currentClient.waittime;
            if(count === 0) {
                return; 
            }
            if(!self.online) {
                return; 
            }
            countdownTimer = setInterval(function(){
                // 有对话框打开的话，就停止
                if(self.suspend) {
                    return self.stopCountdown(); 
                }
                if(count === 0) {
                    self.stopCountdown();
                    callback.call(self);
                    return;
                }
                self.$emit("alert", count + i18n("自动进入桌面"));
                count--;
            }, 1000);
            self.countdowning = true;
        }
    }
};
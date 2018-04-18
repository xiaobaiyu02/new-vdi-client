/**
 * 教学模式组件
 */
/* global currentClient */
var constants = require("../constants");
var i18n = require("../i18n/client");
var pageSize = 6;
// 每次显示教学桌面时，都会注册一个检测网络状态的回调
// 确保网络恢复的时候能够正常获取到最新的桌面列表
var stopOnlineWatcher;
var countdownTimer;
module.exports = {
    props: ["sceneList", "online", "suspend"],
    watch: {
        online: function(val){
            if(!val && this.countdowning) {
                this.stopCountdown();
            }
        },
        // 多媒体上课的时候，多场景将切换到要上课的场景，此时自动倒计时
        sceneList: function(val){
            var self = this;
            if(val && val.length === 1 && !self.countdowning) {
                self.startCountdown(function(){
                    self.connect(self.sceneList[0]);
                });
            }
        }
    },
    data: function(){
        return {
            currentPage: 1,
            hasConnected: false,
            countdowning: false,
            showGoBack: currentClient.desktopMode === 0 ? true : false
        }
    },
    computed: {
        pageCount: function(){
            var len = this.sceneList.length;
            if(len % pageSize === 0) {
                return len / pageSize;
            } else {
                return Math.ceil(len / pageSize);
            }
        },
        row1Items: function(){
            var page = this.currentPage;
            var rowData = this.sceneList.slice(
                (page - 1) * pageSize,
                page * pageSize
            );
            return rowData.slice(0, 3);
        },
        row2Items: function(){
            var page = this.currentPage;
            var rowData = this.sceneList.slice(
                (page - 1) * pageSize,
                page * pageSize
            );
            return rowData.slice(3);
        }
    },
    template: views["teaching-mode"], // eslint-disable-line no-undef
    created: function(){
        if(this.online) {
            this.$emit("getScenes");
        }
        stopOnlineWatcher = this.$watch("online", function(){
            this.$emit("getScenes");
        });
        var prevAutoConnectScene;
        var unwatchSceneList = this.$watch("sceneList", function(newvalue){
            var autoConnectScene;
            if(currentClient.waittime === 0) {
                return; 
            }
            if(newvalue) {
                if(newvalue.length === 1) {
                    autoConnectScene = newvalue[0];
                } else if(newvalue.length > 1) {
                    autoConnectScene = newvalue.filter(function(item){
                        return item.is_auto; 
                    })[0];
                }
                if(!autoConnectScene) {
                    // 不知道之前有没有开启过倒计时，直接干掉不坏事
                    this.stopCountdown();
                    prevAutoConnectScene = null;
                    return;
                }
                // 如果由于场景列表更新重新进入了这个过程，判断之前锁定的场景
                if(prevAutoConnectScene) {
                    // 如果现在锁定的场景是自动的，无理由替换掉并直接返回，保持倒计时不变
                    // 如果现在锁定的场景不是自动的，以之前锁定的为准
                    if(autoConnectScene.is_auto) {
                        prevAutoConnectScene = autoConnectScene;
                    }
                    return;
                }
                if(!this.countdowning) {
                    this.startCountdown(function(){
                        this.connect(prevAutoConnectScene);
                    });
                }
                prevAutoConnectScene = autoConnectScene;
            } else {
                this.stopCountdown();
            }
        });
        // 已经连接桌面后，取消锁定机制
        var unwatchHasConnected = this.$watch("hasConnected", function(val){
            if(!val) {
                return; 
            }
            unwatchSceneList();
            unwatchHasConnected();
        });
    },
    beforeDestroy: function(){
        stopOnlineWatcher();
        stopOnlineWatcher = null;
        this.$emit("alert", "");
    },
    methods: {
        _: i18n,
        goback: function(){
            this.$emit("modechange", constants.MIXED);
        },
        connect: function(scene){
            if(this.countdowning) {
                this.stopCountdown();
            }
            this.$emit("connect", {
                instance_id: scene.id,
                vm_id: scene.id,
                display_name: scene.display_name,
                vm_type: 1,
                desktop_mode: 1,
                os_type: scene.image ? scene.image.os_type : ""
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
                self.$emit("alert", count + i18n("自动进入场景"));
                count--;
            }, 1000);
            self.countdowning = true;
        }
    }
};
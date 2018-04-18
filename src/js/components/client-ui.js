/**
 * client 主界面
 */
/* global currentClient */
var assign = require("lodash/assign");
var clone = require("lodash/cloneDeep");
var constants = require("../constants");
var osTypes = require("../utils/os-types");
var i18n = require("../i18n/client");
var createModal = require("./base/modal").create;
var setArray = require("../utils/vue").setArray;

var components = {};
// 几种模式的命名以此为标准，其它地方的命名需要跟这里一样
components[constants.MIXED] = require("./mixed-mode");
components[constants.PERSONAL] = require("./personal-mode");
components[constants.PERSONAL_LOGIN] = require("./personal-login-mode");
components[constants.TEACHING] = require("./teaching-mode");

// 按钮确认弹出框们
assign(components, require("./confirm-modals"));

// 设置对话框
components["settings-modal"] = createModal({
    data: {
        title: i18n("设置"),
        dialogCls: "client-dialog settings-dialog modal-lg"
    },
    template: {
        body: "<settings></settings>",
        footer: ""
    },
    components: {
        settings: require("./settings")
    }
});

// 排序弹框
components["sort-order-modal"] = require("./sort-order-modal");

// 正在升级，完成后底层会重新加载页面
components["upgrading-modal"] = createModal({
    props: ["upgradeType"],
    data: {
        animidx: 1,
        dialogCls: "upgrading-modal"
    },
    template: {
        header: "",
        body: "<p class='upgrading-msg'>{{ msg }}</p>"
            + "<div class='loading-backdrop'>"
            + "<ul class='loading-wrapper clearfix'>"
            + "<li :class='{active: animidx === 1}'></li>"
            + "<li :class='{active: animidx === 2}'></li>"
            + "<li :class='{active: animidx === 3}'></li>"
            + "<li :class='{active: animidx === 4}'></li>"
            + "<li :class='{active: animidx === 5}'></li>"
            + "<li :class='{active: animidx === 6}'></li>"
            + "</ul>"
            + "</div>",
        footer: ""
    },
    created: function(){
        var self = this;
        setInterval(function(){
            self.animidx++;
            if(self.animidx === 7) {
                self.animidx = 1;
            }
        }, 1000);
    },
    computed: {
        msg: function(){
            return this.upgradeType === "resource"
                ? i18n("OEM_UPGRADE_MESS")
                : i18n("UPGRADE_MESS_2");
        }
    }
});

// 断网提示，Linux 端特有
if(currentClient.isLinux) {
    components["offline-alert-modal"] = require("./offline-alert-modal");
}
components["notify-ui"] = require("./notify-ui");

var modelDefaults = {
    oem: require("../oem"),
    // 状态信息
    online: false,
    ready: false,
    currentView: constants.MIXED,
    // 序号相关
    floatOrder: 4,
    clientOrder: "",
    clientName: "",
    version: "",
    showClientInfo: true,
    // 系统类型
    isAndroid: currentClient.isAndroid,
    isLinux: currentClient.isLinux,
    isWindows: currentClient.isWindows,
    windowsType: 2,
    windowsMode: 0,
    // 一般性错误，在线时显示
    error: "",
    // 离线错误，不在线时优先显示此错误
    offlineError: "",
    // 传递给教学桌面组件的数据
    sceneList: [],
    // 传递给个人桌面组件的数据
    personalItems: [],
    // 更新用户的标志
    updateUserResult: false,
    // 弹出确认框
    showSettingConfirmModal: false,
    showExitConfirmModal: false,
    showExitPasswordConfirmModal: false, // windows 全屏退出模式需要密码
    showShutdownConfirmModal: false,
    showRebootConfirmModal: false,
    showUpgradeModal: false, // 确认升级后，showLowlevelUpgradingModal = true
    showResourceUpgradingModal: false, // 资源包升级
    showLowlevelUpgradingModal: false, // 底层升级
    showSortOrderModal: false,
    // linux 端特有
    showOfflineAlertModal: false,
    offlineAlertWaitTime: 10,
    // 设置对话框
    showSettingDialog: false,
    // 通知消息
    notifyText: "",
    // loading 标志
    loading: false,
    animidx: 1
};

// 获取教学桌面，用户登录，用户信息修改这 3 个请求发生的时候
// 有可能 websocket 还没有准备好，因此，需要放在等待队列中
var readyCallbacks = [];

module.exports = {
    data: function(){
        return clone(modelDefaults);
    },
    mixins: [
        require("../mixins/client-ui/main")
    ],
    components: components,
    watch: {
        online: function(val){
            // 联网后清除断网消息
            if(val) {
                this.onAlert("");
            } else {
                // 断网后关闭 loading
                this.loading = false;
            }
        }
    },
    created: function(){
        var self = this;
        var interval = 400;
        var timer;
        var loop = function(){
            self.animidx++;
            if(self.animidx === 7) {
                self.animidx = 1;
            }
            timer = setTimeout(loop, interval);
        };
        // loading 时手动动画
        self.$watch("loading", function(val){
            if(val) {
                loop();
            } else {
                clearInterval(timer);
                timer = null;
            }
        });
        self._autoReady();
        // ---------- 延迟获取 windowsMode -----------
        currentClient.promise.then(function(c){
            self.windowsMode = c.windowsMode;
            self.windowsType = c.clientType;
        });

        //动态修改屏幕尺寸大小
        function setClientUiSize(){
            var h = document.body.clientHeight;
            var w = document.body.clientWidth;
            var widthAndHeightScale = [];
            if(h === w){
                widthAndHeightScale.push({height:"45%", width:"60%"});
            } else {
                widthAndHeightScale.push({height:"57%", width:"60%"});
            }
            return widthAndHeightScale;
        }
        self.screenScale = setClientUiSize();
    },
    methods: {
        _: i18n,
        hasModalOpened: function(){
            var flag = this.showSettingDialog
                || this.showSettingConfirmModal
                || this.showShutdownConfirmModal
                || this.showRebootConfirmModal
                || this.showExitConfirmModal
                || this.showExitPasswordConfirmModal
                || this.showSortOrderModal
                || this.showUpgradeModal
                || this.showResourceUpgradingModal
                || this.showLowlevelUpgradingModal;
            return flag;
        },
        onAlert: function(msg, offline){
            var str;
            if(msg instanceof Error) {
                str = msg.message;
            } else if(typeof msg === "string") {
                str = msg;
            } else {
                if(msg) {
                    str = msg.toString();
                } else {
                    str = msg;
                }
            }
            if(offline) {
                this.offlineError = str;
            } else {
                this.error = str;
            }
        },
        onUserLogin: function(data){
            var self = this;
            self.loading = true;
            self._addReadyCallback(function(){
                self.wsLogin(data, function(err, data){
                    self.loading = false;
                    if(err) {
                        self.onAlert(err);
                        setArray(self.personalItems, []);
                    } else {
                        setArray(
                            self.personalItems,
                            self._processVmData(data || [])
                        );
                        self.currentView = constants.PERSONAL;
                    }
                });
            });
        },
        onUpdateUser: function(data, callback){
            var self = this;
            self.loading = true;
            self._addReadyCallback(function(){
                self.wsModifyPassword(data, function(err, data){
                    self.loading = false;
                    callback(err, data);
                });
            });
        },
        onGetSceneList:function(){
            var self = this;
            self.loading = true;
            self._addReadyCallback(function(){
                var retryCount = 5;
                var interval = 1000;
                var lastError;
                var getFn = function(){
                    if(retryCount === 0) {
                        self.onAlert(lastError);
                        self.loading = false;
                        return;
                    }
                    self.wsGetSceneList(function(err, data){
                        if(err) {
                            lastError = err;
                            setArray(self.sceneList, []);
                            setTimeout(getFn, interval);
                        } else {
                            self.loading = false;
                            setArray(
                                self.sceneList,
                                self._processVmData(data || [])
                            );
                            // 场景拉取成功后，清空掉可能的错误消息
                            if(self.currentView === constants.TEACHING) {
                                self.onAlert("");
                            }
                        }
                    });
                    retryCount--;
                };
                getFn();
            });
        },
        // 超时时间 30 分钟，每 3 分钟没有响应，重新发送一次
        // 参考：http://172.16.203.11:8011/bugfree/index.php/bug/8588
        onConnect: function(item){
            var self = this;
            var timer;
            var interval = 3 * 60 * 1000;
            var retryCount = 1;
            var noop = function(){};
            var matchedSession = self.findSession(item);
            // 已经正在连接或者连接上了
            if(matchedSession) {
                if(matchedSession.pending) {
                    self.loading = true;
                }
                return;
            }
            
            // 1. 打点
            self.loading = true;
            self.onAlert("");
            // 2. 连接
            self.stopPendingSession();
            item.pending = true;
            self.putSession(item);
            self.wsConnectVm(item, noop);
            // 3. 监听 vm_connect_reply
            self.$once("vmConnected", function(data){
                if(item.vm_id === data.vm_id) {
                    clearInterval(timer);
                    self.onAlert("");
                    // backend.connect 后会自动设置此标记
                    // 此处无需添加
                    // self.loading = false;
                }
            });
            // 4. 启动计时器
            timer = setInterval(function(){
                // 如果离线：直接取消
                if(!self.online) {
                    clearInterval(timer);
                    self.removeSession(item);
                    console.log("client offline, stop retry `vm_connect`.");
                    return;
                }
                // 如果从教学个人/桌面界面切换到了其它界面，停掉计时器
                if(self._isViewChange(item)) {
                    clearInterval(timer);
                    self.removeSession(item);
                    console.log("client page change, stop retry `vm_connect`.");
                    return;
                }
                // 如果不是 pending 状态，说明被 stopPendingSession 干掉了
                if(item.pending !== true) {
                    clearInterval(timer);
                    return;
                }
                console.log("call `vm_connect` again:", retryCount);
                self.wsConnectVm(item, noop);
                retryCount++;
                if(retryCount === 10) {
                    self.loading = false;
                    clearInterval(timer);
                    self.removeSession(item);
                }
            }, interval);
        },
        onModeChange: function(val){
            this.currentView = val;
        },
        // 请求代码转到 main.js 中处理
        onConfirm: function(val, prop){
            if(val) {
                switch(prop) {
                    case "showSettingConfirmModal":
                        this.showSettingDialog = true;
                        break;
                    case "showShutdownConfirmModal":
                        if(this.shouldCascadeShutdown(false /* fromVM */)) {
                            this.wsTryShutdownVM();
                        } else {
                            this.execCommand("shutdown");
                        }
                        break;
                    case "showExitConfirmModal":
                        this.execCommand("exit");
                        break;
                    case "showExitPasswordConfirmModal":
                        this.execCommand("exit");
                        break;
                    case "showRebootConfirmModal":
                        this.execCommand("reboot");
                        break;
                    case "showUpgradeModal":
                        this.execCommand("upgrade_client", {
                            is_local: 0/* 在线升级 */
                        });
                        break;
                    case "showOfflineAlertModal":
                        // 在 offline-alert-modal.js 中已处理
                        break;
                }
            }
            this[prop] = false;
        },
        onSortOrder: function(e){
            var self = this;
            self.loading = true;
            self.wsSetOrder(e.data, function(err, data){
                self.loading = false;
                // 设置序号成功后更新当前序号
                if(data && typeof data.order === "number") {
                    self.clientOrder = data.order;
                }
                e.callback(err, data);
            });
        },
        exit: function(){
            if(currentClient.clientType === 999) {
                return;
            }
            // 由于只有 windows 端只有退出按钮，直接判断
            switch(currentClient.windowsMode) {
                case 0: break; // 此模式无此按钮
                case 1: this.showExitConfirmModal = true; break;
                case 2: this.showExitPasswordConfirmModal = true; break;
            }
        },
        /**
         * 异步 loading ，供子组件使用
         * 通常情况，其它子组件，子子组件需要显示 loading 时，
         * 无法直接修改根组件的状态（也不建议修改），所以，此
         * 组件提供一个对外的方法用来处理这种需求。
         * 
         * 调用方式：
         *   var stopFn = clientApp.$children[0].asyncLoading();
         *   // 在合适的时候调用 stopFn() 关闭 loading
         * 
         * vue.$children 是 Vue 提供的可访问非私有属性，但是建议
         * 尽量少使用。
         * 
         * @return {Function} return stop load callback
         */
        asyncLoading: function(){
            var me = this;
            me.loading = true;
            return function(){
                me.loading = false;
            };
        },
        _processVmData: function(data){
            data.forEach(function(item){
                var type = item.image.os_type;
                var img = "img/win7.png";
                osTypes.forEach(function(o){
                    if(o.key === type) {
                        img = "img/" + o.icon;
                    }
                });
                item.icon = img;
            });
            return data;
        },
        _addReadyCallback: function(fn){
            if(this.ready) {
                fn.call(this);
            } else {
                readyCallbacks.push(fn);
            }
        },
        _flushReadyCallbacks: function(){
            triggerReady(this);
        },
        // 终端启动后最多转圈 5s
        _autoReady: function(){
            var self = this;
            setTimeout(function(){
                self.ready = true;
            }, 5000);
        },
        _isViewChange: function(item){
            var prevView = item.desktop_mode === 1
                ? constants.TEACHING
                : constants.PERSONAL;
            return prevView !== this.currentView;
        }
    }
};

// 异步调用 ready functions
function triggerReady(context){
    var arr = readyCallbacks;
    var callOnNexttick = function(){
        Vue.nextTick(function(){
            var fn = arr.shift();
            if(!fn) {
                return;
            }
            fn.call(context);
            callOnNexttick();
        }, context);
    };
    callOnNexttick();
}

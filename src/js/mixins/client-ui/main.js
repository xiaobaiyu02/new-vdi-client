/**
 * 主逻辑
 *  1. 获取系统信息，同时初始化 websocket
 *  2. 注册端，返回的消息转发给底层
 *  3. 监听来自服务器的消息，转发给底层或者自行处理
 */
/* global Promise, currentClient */
var backend = require("../../backend/lowlevel");
var wsBackend = require("../../backend/ws");
var nwWindow = require("../../nw-window");
var assign = require("lodash/assign");
var parseNetwork = require("../../utils/network").parseNetwork;
var storage = require("../../storage");
var constants = require("../../constants");

var REGISTER_INTERVAL = 5000;
var wsapi, instance;
// TODO: 将 spiceSessions 的操作独立到文件里
// 由于 connectvm 现在是异步的，记录每次 connect 时发送的参数
// 部分业务需求会在虚拟机退出后用到这个数据
// 这里将每一个 spice 连接描述为一次 spice session
var spiceSessions = [];
// 默认情况，断网重连，重连后发送 register 消息
// 连接桌面后，桌面退出前，断网后只重连不发 register
var continueRegister = true;
var createWSTimer;

// 从这里开始
exports.beforeCreate = function(){
    instance = this;
    // 初始化页面不执行这个 lifecycle 方法
    if(currentClient.isInit) {
        return;
    }
    instance.clientOrder = storage.get("order");
    initWsApi();
    bindHttpEvents(backend, this);
};
exports.created = function(){
    //  初始化页面会 mixin 这个文件
    if(currentClient.isInit) {
        return;
    }
    // 不是 linux 端？返回
    if(!currentClient.isLinux) {
        return;
    }
    var enabled = false;
    var showing = false;
    // linux 端断网提示切换到本地系统
    backend.on("offline-alert", function(seconds){
        instance.offlineAlertWaitTime = seconds;
        enabled = true;
        if(!instance.online && !showing) {
            instance.showOfflineAlertModal = true;
            showing = true;
        }
    });
    // 断网提示
    instance.$watch("online", function(val){
        if(enabled) {
            instance.showOfflineAlertModal = !val;
            showing = !val;
        }
    });
};

// 简单的代理一下 wsapi 的方法
// 保证 components/client-ui.js 中的代码无需关心通讯逻辑
exports.methods = {
    // 获取最后连接的的桌面模式，联动关机需要使用这个数据
    getLastConnectMode: function(sessionId){
        if(!spiceSessions) {
            return false;
        }
        var mode;
        spiceSessions.forEach(function(session){
            if(session.vm_id === sessionId) {
                mode = session.desktop_mode;
            }
        });
        return mode;
    },
    // 是否应当联动关机
    // fromVM:
    //    true    vm => box
    //    false  box => vm
    shouldCascadeShutdown: function(fromVM, sessionId){
        var mode = this.getLastConnectMode(sessionId);
        if(mode === false) {
            return false;
        }
        var key = "mode" + mode + "_shutdown_with_";
        if(fromVM) {
            key += "client";
        } else {
            key += "pc";
        }
        return currentClient.config[key] === 1;
    },
    // 下面 3 个方法用于向 client-ui.js 提供会话操作，避免重新连接同样的虚拟机
    hasSession: function(session){
        var has = false;
        var id = session.vm_id;
        spiceSessions.forEach(function(session){
            if(session.vm_id === id) {
                has = true;
            }
        });
        return has;
    },
    findSession: function(session){
        var id = session.vm_id;
        var ret;
        spiceSessions.forEach(function(session){
            if(session.vm_id === id) {
                ret = session;
            }
        });
        return ret;
    },
    putSession: function(session){
        var id = session.vm_id;
        var exists = false;
        spiceSessions.forEach(function(s){
            if(s.vm_id === id) {
                exists = true;
            }
        });
        if(!exists) {
            spiceSessions.push(session);
        }
    },
    removeSession: function(session){
        var index = -1;
        var id = session.vm_id;
        spiceSessions.forEach(function(s, i){
            if(s.vm_id === id) {
                index = i;
            }
        });
        if(index !== -1) {
            spiceSessions.splice(index, 1);
        }
    },
    stopPendingSession: function(){
        var pendingSessions = [];
        spiceSessions.forEach(function(session){
            pendingSessions.push(session);
        });
        pendingSessions.forEach(function(session){
            delete session.pending;
            instance.removeSession(session);
        });
    },
    wsTryShutdownVM: function(id){
        wsapi.setVmStatus({
            vm_id: id,
            action: "power-off"
        }, function(){
            backend.system.shutdown();
        });
    },
    wsModifyPassword: function(data, callback){
        wsapi.modifyPassword(data, callback);
    },
    wsLogin: function(data, callback){
        wsapi.login(data, callback);
    },
    wsLogout: function(data, callback){
        wsapi.logout(data, callback);
    },
    wsVMLogout: function(data, callback){
        wsapi.vmlogout(data, callback);
    },
    wsSetOrder: function(data, callback){
        wsapi.setOrder(data, callback);
    },
    wsGetSceneList: function(callback){
        wsapi.getSceneList(callback);
    },
    wsConnectVm: function(data, callback){
        wsapi.connectVm(data, callback);
    },
    wsGetVmStatus: function(data, callback){
        wsapi.getVmStatus(data, callback);
    },
    wsSetVmStatus: function(data, callback){
        wsapi.setVmStatus(data, callback);
    },
    wsSendClientConfig: function(header, data, callback){
        wsapi.sendClientConfig(header, data, callback);
    },
    // 注册是整个过程的第一步操作，不容有失
    wsRegister: function(data, callback){
        wsapi.register(data, function(err, resp){
            if(err) {
                instance.onAlert(err, true);
                createWSTimer = setTimeout(
                    instance.wsRegister.bind(instance, data, callback),
                    REGISTER_INTERVAL
                );
            } else {
                // 注册成功后标记终端为在线状态
                instance.online = true;
                instance.ready = true;
                instance.offlineError = "";
                instance.onAlert("");
                instance.clientOrder = resp.register.client_order;
                instance.notifyText = resp.register.message;
                callback.call(instance, null, resp);
            }
        });
    },
    // android 特有
    openExplorer: function(){
        backend.system.browser_file();
    },
    // 简化 backend.xx.yy() 的调用
    // 仅代理 backend.system, backend.command
    execCommand: function(cmd, data){
        if(currentClient.isAndroid && cmd === "exit") {
            cmd = "exit_android";
        }
        if(cmd === "upgrade_client") {
            this.showLowlevelUpgradingModal = true;
        }
        if(cmd in backend.system) {
            backend.system[cmd](data);
        } else {
            backend.command[cmd](data);
        }
    }
};
// 初始化页面也引用了这个 mixin ，所以提供两个方法方便初始化页面调用
if(currentClient.isInit) {
    exports.methods.startWebSocket = function(){
        if(wsapi) {
            clearTimeout(createWSTimer);
            wsapi.destroy();
        } else {
            initWsApi();
        }
    };
    exports.methods.stopWebSocket = function(){
        // 参考 http://172.16.203.11:8011/bugfree/index.php/bug/8690
    };
}

function initWsApi(){
    clearTimeout(createWSTimer);
    Promise.all([wsBackend(), getSystemInfo()]).then(function(arr){
        wsapi = arr[0];
        var info = arr[1];
        wsapi.setMac(info.mac);
        if(instance._flushReadyCallbacks) {
            instance._flushReadyCallbacks();
        }
        if(!wsapi._hasBind) {
            bindCloseHandler(wsapi);
            bindWSEvents(wsapi, instance);
            wsapi._hasBind = true;
        }
        if(continueRegister) {
            instance.wsRegister(info, function(err, data){
                console.log(
                    "%cregister success!",
                    "color:#8bc34a;font-size:2em;"
                );
                backend.system.new_register(data);
                backend.emit("ready");
            });
        } else {
            // 桌面连接期间，不会注册，所以手动修改
            instance.online = true;
        }
    }).catch(function(err){
        console.log("create wsapi error:", err);
        createWSTimer = setTimeout(initWsApi, REGISTER_INTERVAL);
    });
}

function getSystemInfo() {
    return Promise.all([
        backend.system.info(),
        backend.network.get_ip(),
        backend.network.get_server_ip()
    ]).then(function(arr){
        var network = parseNetwork(arr[1]);
        var type = currentClient.isAndroid ? "android" : null;
        if(currentClient.isAndroid) {
            type = "android";
        } else if(currentClient.isWindows) {
            type = "windows";
        } else if(currentClient.isLinux) {
            type = "linux";
        }
        instance.clientName = arr[0].hostname;
        instance.version = "(V" + arr[0].version + ")";
        // windows 上会出现 IP 为空的情况
        if(!network.address) {
            throw new Error("ip empty");
        }
        return {
            console_ip: arr[2].console_ip,
            ip: network.address,
            mac: arr[0].mac,
            name: arr[0].hostname,
            os: type,
            cpu: arr[0].cpu_info,
            memory: arr[0].memory_size,
            disk_size: arr[0].disk_size,
            netmask: network.mask,
            version: arr[0].version
        };
    });
}

function bindCloseHandler(ws) {
    ws.closed(function(){
        instance.online = false;
        createWSTimer = setTimeout(initWsApi, REGISTER_INTERVAL);
    });
}

function bindHttpEvents(backend, instance) {
    // 初始化页面不关心这些逻辑
    if(currentClient.isInit) {
        return;
    }
    // 是否升级
    backend.once("ask-upgrade", function(){
        instance.showUpgradeModal = true;
    });
    // 正在升级
    backend.once("upgrade", function(){
        instance.showResourceUpgradingModal = true;
    });
    // 是否显示 nw 窗口，仅 windows 端有用
    backend.on("showNW", function(){
        nwWindow.show();
    });
    
    // 虚拟机退出
    backend.on("vm_logout", function(data){
        // 1. 一旦退出，若发生断网，允许重新注册
        continueRegister = true;
        // 2. 执行联动关机
        if(Array.isArray(data)) {
            data = data[0];
        }
        var sessionId = data.vm_id;
        // 非主动情况退出，需要联动关机
        if(instance.shouldCascadeShutdown(true, sessionId)) {
            console.assert(
                data && data.hasOwnProperty("cascade_shutdown"),
                "field missing: `cascade_shutdown`"
            );
        } else { // spicy 由用户主动关闭时，不联动关机
            data.cascade_shutdown = 0;
        }
        instance.wsVMLogout(data, function(err){
            err && console.error(err);
        });
        // 3. 从列表中删除
        instance.removeSession(data);
        // 4. 个人桌面退出后切换到登录界面
        if(instance.currentView === constants.PERSONAL) {
            sessionStorage.autoLogin = "false";
            instance.currentView = constants.PERSONAL_LOGIN;
        }
    });
    // 虚拟机操作
    backend.on("vm_action", function(data){
        instance.wsSetVmStatus(data, function(err){
            console.log(err);
        });
    });
}

// 处理主动推送的消息
function bindWSEvents(wsapi, instance){
    // shutdown_hyperv_client
    wsapi.on(
        "shutdown_hyperv_client", errorify(onShutdownHypervClient), instance
    );
    // 场景更新
    wsapi.on("update_modes", errorify(onUpdateModes), instance);
    // 终端关机
    wsapi.on("shutdown", errorify(onShutdown), instance);
    // 终端重启
    wsapi.on("reboot", errorify(onReboot), instance);
    // 终端唤醒
    wsapi.on("wake_up", errorify(onWakeup), instance);
    // 连接桌面返回数据的异步通知
    wsapi.on("vm_connect_reply", errorify(onVmConnectReply), instance);
    // 设置终端参数
    wsapi.on("ChangeClientConfig", errorify(onModifyClientConfig), instance);
    // 强制终端升级
    wsapi.on("upgrade_from_server", errorify(onUpgradeFromServer), instance);
    // 重命名
    wsapi.on("changeName", errorify(onClientNameChange), instance);
    // 终端排序起始值设置
    wsapi.on("start_order", errorify(onSetStartOrder), instance);
    // 通知终端开始排序
    wsapi.on("beginOrder", errorify(onBeginOrder), instance);
    // 刷新终端排序号
    wsapi.on("refreshOrder", errorify(onRefreshOrder), instance);
    wsapi.on("upgradeOrder", errorify(onUpgradeOrder), instance);
    // 通知终端结束排序
    wsapi.on("endOrder", errorify(onEndOrder), instance);
    // 设置终端序号
    wsapi.on("set_client_order", errorify(onSetClientOrder), instance);
    // 设置等待时间
    wsapi.on("set_wait_time", errorify(onSetWaitTime), instance);
    // 转到登录界面
    wsapi.on("loginMode", errorify(onLoginMode), instance);
    // 获取终端配置参数
    wsapi.on("getclientconfig", errorify(onGetClientConfig), instance);
    // 退出 spicy
    wsapi.on("kill_spicy", errorify(onKillSpicy), instance);
    // 联动关机
    wsapi.on("vm_shutdown", errorify(onCascadeShutdown), instance);
}
/* 主动推送的消息一般是要转发给底层的，只有个别几个需要记录一下数据 */

function onShutdownHypervClient(){
    backend.system.shutdown_hyperv_client();
}

function onUpdateModes(){
    // 非教学桌面即使收到了消息也忽略
    if(this.currentView !== constants.TEACHING) {
        return;
    }
    this.onGetSceneList();
    // 自动刷场景的时候不打点
    this.loading = false;
}

function onVmConnectReply(data){
    var self = this;
    var composeData;
    spiceSessions.forEach(function(session){
        if(session.vm_id === data.vm_id) {
            assign(session, data);
            composeData = session;
        }
    });
    if(!composeData) {
        self.loading = false;
        return console.error("missing field: `vm_id`");
    }
    delete composeData.pending;
    // 不知道底层拿到数据后是否会连接成功，所以这时候先等待底层响应
    backend.connect(composeData).then(function(){
        self.loading = false;
        currentClient.isWindows && nwWindow.hide();
    }, function(err){
        self.loading = false;
        self.onAlert(err);
    });
    // 良敏自动化测试出现过这种情况：
    //   vm_connect 之后，由于断网重连导致重发 register
    //   后台收到 register 清空了 vm_connect 连接信息
    // 所以调整下这个标记的位置
    // 进入桌面后，即使断网也不发 register
    continueRegister = false;
    self.$emit("vmConnected", composeData);
}

function onModifyClientConfig(data){
    currentClient.updateConfig(data, true /* fromServer */);
    backend.config(data);
}

function onUpgradeFromServer(data){
    backend.command.upgrade_from_server(data);
}

function onWakeup(){}

function onShutdown(){
    // 如果是多桌面，忽略联动关机
    var sessionId = null;
    if(spiceSessions.length === 1) {
        sessionId = spiceSessions[0].vm_id;
    }
    if(sessionId !== null
        && this.shouldCascadeShutdown(false /* fromVM */, sessionId)) {
        this.wsTryShutdownVM(sessionId);
    } else {
        this.execCommand("shutdown");
    }
}

function onReboot(data){
    backend.command.reboot(data);
}

// 更新名称后重新注册
function onClientNameChange(data){
    backend.command.changeName(data);
    wsapi && wsapi.destroy();
}

function onSetClientOrder(order){
    this.clientOrder = order;
}

function onBeginOrder(data){
    this.showSortOrderModal = true;
    this.floatOrder = data.start_number;
}

function onRefreshOrder(data){
    this.floatOrder = typeof data === "number"
        ? data
        : data.refresh_num;
}

function onUpgradeOrder(data) {
    var order = typeof data === "number"
        ? data
        : data.order;
    this.clientOrder = order;
    storage.set("order", order);
}

function onEndOrder(){
    this.showSortOrderModal = false;
}

function onSetStartOrder(order){
    this.floatOrder = order;
}

function onSetWaitTime(data){
    backend.command.set_wait_time(data);
}

function onLoginMode(){}

function onGetClientConfig(data, raw){
    backend.config().then(function(obj){
        instance.wsSendClientConfig(raw.msg, obj, function(){});
    });
}

function onKillSpicy(data){
    backend.command.kill_spicy(data);
}

function onCascadeShutdown(){
    // 收到消息不再判断是否应当联动关机，直接关闭
    backend.system.shutdown();
}

function errorify(fn) {
    return function(error){
        var args = [].slice.call(arguments, 1);
        if(error) {
            this.loading = false;
            return this.onAlert(error);
        } else {
            fn.apply(this, args);
        }
    };
}

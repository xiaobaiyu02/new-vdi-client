/* global Promise, ArrayBuffer, Uint8Array, DataView */
var dom = require("../../utils/dom");
var utf8 = require("utf-8");
var EventEmitter = require("eventemitter3").EventEmitter;
var isObject = require("lodash/isObject");
var isString = require("lodash/isString");
var isFunction = require("lodash/isFunction");
var mapValues = require("lodash/mapValues");
var each = require("lodash/each");
var has = require("lodash/has");
var i18n = require("../../i18n/client");


var PING_INTERVAL = 10000;
var PONG_INTERVAL = 20000;

module.exports = WebSocketAPI;

/**
 * ws 层对应用层开放的接口
 * 如果收到服务器主动推送的消息，则触发对应的事件，目前已知所有的事件如下：
 *   shutdown: 客户端关机
 *   reboot: 客户端重启
 *   wake_up: 客户端唤醒
 *   vm_connect_reply: vm_connect 的异步通知
 *   changeClientConfig: 修改客户端配置
 *   upgrade_from_server: 强制升级
 *   changeName: 客户端更改名称
 *   start_order: 开始排序
 *   beginOrder: 设置开始排序标记
 *   endOrder: 设置结束排序标记
 *   set_client_order: 设置客户端序号
 *   set_wait_time: 设置等待时间
 *   loginMode: 设置登录模式
 *   getclientconfig: 获取客户端配置
 *   kill_spicy: 杀掉 spicy
 * @param {WebSocket} socket 已经 open 的 websocket
 */
function WebSocketAPI(socket){
    var self = this;
    EventEmitter.call(self);
    if(!(self instanceof WebSocketAPI)) {
        throw new Error("use new call instead!");
    }
    // 主动调用 ws.close() 后触发 `onclose` 延时较长，自行处理
    self._closeCb = [];
    dom.on(socket, "close", function(){
        self.destroy();
        self._flushCloseCallback();
    });
    self.closed = function (fn){
        self._closeCb.push(fn);
    };
    dom.on(socket, "message", function(e){
        // 无论是什么返回，只要有返回，原理上都可以认为是一次成功的 pong
        self._lastPong = Date.now();
        var response = decodePacket(e.data);
        console.assert(
            response.copyright === "oseasy",
            "invalid response.copyright:" + response.copyright
        );
        if(response.body === "PONG") {
            console.log("%cget PONG", "color: green;");
            return ;
        }
        var body = null, error = null;
        var callback;
        var callbackPool = self._getCallbackPool();
        try {
            body = JSON.parse(response.body);
            console.log("<<<<< websocket receive data:", body);
            callback = callbackPool[body.callback_id];
        } catch(e) {
            if(response && response.body) {
                console.error(
                    "!!!!! receive unrecognized message:",
                    response.body
                );
            }
            error = e;
        }
        if(isFunction(callback)) {
            // 处理客户端主动发起的请求
            delete callbackPool[body.callback_id];
            // 有此字段表示 vdi-api 服务器有异常，websocketGO 直接返回了
            if(body.wsmsg) {
                error = new Error(body.wsmsg);
            } else {
                if(body.code === 0) {
                    body = body.data;
                } else {
                    error = new Error(i18n(body.code));
                }
            }
            callback.call(self, error, body);
        } else {
            // 服务器主动推送的消息
            if(body && has(body, "method")) {
                if(body.code !== 0) {
                    error = i18n(body.code);
                    error = error ? error : body.message;
                } else {
                    error = null;
                }
                self.emit(body.method, error, body.data, response);
            } else {
                throw error ||
                    new Error("!!!!! unrecognized response: " + response.body);
            }
        }
    });
    self._socket = socket;
    self._mac = null;
    // 用于内部标记 callback 的自增 id
    self._cbId = 1;
    // 用于内部缓存 callback
    self._cbPool = {};
    self._lastPong = 0;
    self.startCheckPongTimer();
}

WebSocketAPI.prototype = Object.create(EventEmitter.prototype, mapValues({
    constructor: WebSocketAPI,
    _nextId: function(){
        return this._cbId++;
    },
    _getCallbackPool: function(){
        return this._cbPool;
    },
    _putCallback: function(fn){
        var id = this._nextId();
        this._cbPool[id] = fn;
        return id;
    },
    // websocket.onclose 的触发是有问题的：
    // websocket 连接成功后，如果拔掉网线，onclose 不能及时触发
    // 在火狐浏览器中差不多 10s 左右触发，在 chromium 为核心的
    // 浏览器上，这个时间无法估算，基本等于不触发。
    // 为了保证在拔网线后，能够及时响应断开事件，业务层实现 ping/pong
    // 服务器先发 ping，收到 ping 后回 pong
    startPintTimer: function(){
        var me = this;
        var loop = function(){
            me.send(null, {method: "PING"}, null);
            me._pingTimer = setTimeout(loop, PING_INTERVAL);
        };
        clearTimeout(me._pingTimer);
        loop();
    },
    startCheckPongTimer: function(){
        var me = this;
        var checkFn = function(){
            // 业务数据发送可能引起 `_lastPong` 变化
            if(me._lastPong > 0
                && Date.now() - me._lastPong >= PONG_INTERVAL) {
                console.log("%cping expired! destroy...", "color: red;");
                me.destroy();
            } else {
                me._pongTimer = setTimeout(checkFn, PONG_INTERVAL);
            }
        };
        clearTimeout(this._pongTimer);
        checkFn();
    },
    send: function(msg, data, callback){
        if(arguments.length === 2) {
            callback = data;
            data = msg;
            msg = null;
        }
        if(this._destroyed) {
            try {
                callback && callback.call(this, new Error(i18n("网络已断开")));
            } catch(e) {
                console.log("unexpected error:", e);
            }
            return;
        }
        if(isFunction(callback)) {
            data.callback_id = this._putCallback(callback);
        }
        data.client_mac = this._mac;
        this._socket.send(encodePacket(this._mac, msg, data));
        console.log(">>>>> websocket send data:", data);
    },
    setMac: function(mac){
        this._mac = mac;
        if(!this._pingTimer) {
            this.startPintTimer();
        }
    },
    // 端每次启动后要向后台注册
    register: function(data, callback){
        this.send(null, {
            method: "register",
            data: data
        }, callback);
    },
    // 个人桌面登录
    login: function(data, callback){
        this.send(null, {
            method: "login",
            data: data
        }, callback);
    },
    // 个人桌面退出
    logout: function(data, callback){
        this.send(null, {
            method: "logout",
            data: data
        }, callback);
    },
    // 个人桌面修改密码
    modifyPassword: function(data, callback){
        this.send(null, {
            method: "modify_password",
            data: data
        }, callback);
    },
    // 个人桌面设置序号
    setOrder: function(data, callback){
        this.send(null, {
            method: "set_order",
            data: data
        }, callback);
    },
    // 教学桌面获取场景列表，后台管场景叫 mode
    getSceneList: function(callback){
        this.send(null, {
            method: "modes",
            data: {}
        }, callback);
    },
    // 连接虚拟机
    connectVm: function(data, callback){
        this.send(null, {
            method: "vm_connect",
            data: data
        }, callback);
    },
    // 获取终端状态
    getVmStatus: function(data, callback){
        this.send(null, {
            method: "vm_status",
            data: data
        }, callback);
    },
    // 后台管这个叫 vm_action，这里改为设置虚拟机状态
    setVmStatus: function(data, callback){
        this.send(null, {
            method: "vm_action",
            data: data
        }, callback);
    },
    vmlogout: function(data, callback){
        this.send(null, {
            method: "vm_logout",
            data: data
        }, callback);
    },
    // TODO: remove
    shutdownVM: function(data, callback){
        this.send(null, {
            method: "vm_shutdown",
            data: data
        }, callback);
    },
    sendClientConfig: function(msg, data, callback){
        this.send(msg, {
            method: "getclientconfig",
            data: data
        }, callback);
    },
    // api 被销毁后，所有缓存的回调都应当获得一个失败调用
    // 其次，任何API调用都应当立即失败
    destroy: function(){
        var self = this;
        if(this._destroyed) {
            return; 
        }
        try {
            self._socket.close();
            delete self._socket;
            self._flushCloseCallback();
        } catch(e) {
            // ignore
        }
        each(self._getCallbackPool(), function(fn){
            try {
                fn.call(self, new Error(i18n("网络已断开")));
            } catch(e) {
                console.error("unexpected error:", e);
            }
        });
        self._cbPool = null;
        self._destroyed = true;
        clearTimeout(self._pingTimer);
        clearTimeout(self._pongTimer);
    },
    _flushCloseCallback: function(){
        var arr = this._closeCb;
        var fn;
        while(arr.length > 0) {
            fn = arr.shift();
            fn.call(this);
        }
    }
}, function(fn){
    return {value: fn};
}));

function encodePacket(mac, header, body){
    if(isObject(body)) {
        body = JSON.stringify(body);
    }
    if(isString(body)) {
        body = uint8fiy(body);
    }
    var buffer = new ArrayBuffer(59 + body.length);
    var head55 = new Uint8Array(buffer, 0, 55);
    copyTo(head55, 0, 6, uint8fiy("oseasy"));
    console.assert(mac.length === 17, "invalid mac string: " + mac);
    copyTo(head55, 6, 17, uint8fiy(mac));
    if(!header) {
        header = new Uint8Array(32);
    }
    copyTo(head55, 23, 32, header);
    var headTail = new DataView(buffer, 55, 4);
    headTail.setUint32(0, body.length);
    var bodyArr = new Uint8Array(buffer, 59, body.length);
    copyTo(bodyArr, 0, body.byteLength, body);
    return buffer;
}

function decodePacket(data){
    var copyright = stringify(new Uint8Array(data, 0, 6));
    var mac = stringify(new Uint8Array(data, 6, 17));
    var msg = new Uint8Array(data, 23, 32);
    var bodySize = new DataView(data, 55, 4).getUint32(0);
    var body = stringify(new Uint8Array(data, 59, bodySize));
    return {
        copyright: copyright,
        mac: mac,
        msg: msg,
        body: body
    }
}

function stringify(arr) {
    return utf8.getStringFromBytes(arr);
}

function uint8fiy(str){
    var bytes = utf8.setBytesFromString(str);
    var arr = new Uint8Array(bytes.length);
    for(var i = 0, len = arr.length;i < len;i++) {
        arr[i] = bytes[i];
    }
    return arr;
}

function copyTo(dest, from, size, src) {
    var n = 0;
    for(; n <= size; n++) {
        dest[from + n] = src[n];
    }
}

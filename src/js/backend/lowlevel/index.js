/* global $API, Promise, currentClient */
var dom = require("../../utils/dom");
var isString = require("lodash/isString");
var assign = require("lodash/assign");
var merge = require("lodash/merge");
var each = require("lodash/each");
var EventEmitter = require("eventemitter3").EventEmitter;
var i18n = require("../../i18n/client");

var HTTP_GET = "GET";
var HTTP_POST = "POST";
var base = "/request/";

function HTTPBackend(){
    var self = this;
    EventEmitter.call(this);
    var fn = function(){
        self.heartbeat().then(loop, loop);
    };
    var loop = function(){
        setTimeout(fn, window.DEBUG ? 10000 : 1000);
    };
    var ready = false;
    this.on("ready", function(){
        if(ready) {
            return;
        }
        ready = true;
        loop();
    });
}

HTTPBackend.prototype = Object.create(EventEmitter.prototype);
HTTPBackend.prototype.constructor = HTTPBackend;
HTTPBackend.prototype.heartbeat = function(){
    var self = this;
    return self.loop().then(function(data){
        // 询问是否需要升级
        if(data.is_need_upgrate) {
            self.emit("ask-upgrade");
        }
        // 正在升级
        if(data.gui_upgrate) {
            self.emit("upgrade");
        }
        // 是否需要显示 nw-window, 仅 windows 端有效
        if(currentClient.isWindows && data._neet_show_nw) {
            self.emit("showNW");
        }
        if(data.oss_status === 1 && data.oss_auto_switch === 1) {
            self.emit("offline-alert", data.oss_auto_switch_seconds);
        }
        // 虚拟机退出了
        if(data.vm_logout === 1) {
            self.emit("vm_logout", data.vm_logout_args);
        }
        // 虚拟机执行某操作
        if(data.vm_action === 1) {
            self.emit("vm_action", data.vm_action_args);
        }
    }).catch(function(err){
        console.log("sandbox http server error:", err);
    });
};

/**
 * 2018-01-08
 * 这个会是以后仅有的数据接口。
 * 新的方案，所有配置数据都从此接口获取
 * 所有配置数据也都使用这个接口设置
 * 
 * @param {config} {Object|Undefined} 设置数据或者获取数据
 * @return {Promise}
 */
HTTPBackend.prototype.config = function(data){
    if(arguments.length === 0) {
        return ajax(HTTP_GET, "getclientconfig");
    } else if(arguments.length === 1) {
        // 先获取后设置
        return ajax(HTTP_GET, "getclientconfig").then(function(oldData){
            var config = merge(oldData, data);
            return ajax("POST", "changeclientconfig", config);
        });
    } else {
        return Promise.reject(new Error("function argumengs error"));
    }
};

var api = module.exports = new HTTPBackend();

assign(api, createAPI({
    register: {method: HTTP_POST, url: "register"},
    loop: {method: HTTP_GET, url: "loop_data"},
    set_loop: {method: HTTP_POST, url: "set_order"},
    connect: {method: HTTP_POST, url: "vm_connect"},
    btn_config: {method: HTTP_GET, url: "feature_config"},
    vmlogout: {url: "vm_logout_ret"},
    clientConfig: {url: "getclientconfig"}
}));

assign(api, {
    system: {},
    desktop: {
        personal: {},
        teaching: {}
    },
    network: {},
    command: {}
});

assign(api.system, createAPI({
    new_register: {method: HTTP_POST, url: "new_register"},
    info: {url: "system_info"},
    reboot: {url: "reboot"},
    shutdown: {url: "shutdown"},
    exit: {url: "exit"},
    screen_list: {url: "get_resolution"},
    screen_size: {method: HTTP_POST, url: "set_resolution"},
    volume: {method: HTTP_POST, url: "system_volume"},
    upgrate: {url: "upgrate"},
    logout: {url: "personal_logout"},
    shutdown_hyperv_client: {url: "shutdown_hyperv_client"},
    // 0 linux ,1 arm, 2 windows
    client_type: {url: "get_client_type"},
    upgrade_client: {method: HTTP_POST, url: "upgrate_client"},
    get_upgrate_file: {url: "get_upgrate_file"},

    // windows客户端窗口模式
    windows_mode: {url: "windows_mode"},
    rdp_config: {method: HTTP_POST, url: "rdp_config"},
    // 安卓客户端usb文件浏览
    browser_file: {url: "browser_file"},
    exit_android: {url: "app_exit"},

    // linux 系统切换
    oss_enabled: {url: "oss_enabled"},
    switch2local: {url: "switch2local"},
    // 不知道这个是什么，从 tongfang 复制过来的
    sys_exchange: {url: "sys_exchange"}
}));

assign(api.desktop, createAPI({
    mode: {url: "desktop_mode"}
}));

assign(api.desktop.personal, createAPI({
    get_config: {url: "personal_config"},
    login: {method: HTTP_POST, url: "personal_login"},
    passwd: {method: HTTP_POST, url: "personal_modify_pwd"}
}));

assign(api.desktop.teaching, createAPI({
    list: {url: "teacher_login"},
    login: {url: "teacher_login"},
    get_teacher_vms: {url: "get_teacher_vms"}
}));

assign(api.network, createAPI({
    get_ip: {url: base + "Network/get_ip"},
    set_ip: {method: HTTP_POST, url: base + "Network/set_ip"},
    get_oss_ip: {url: "get_oss_ip"},
    get_wifi_list: {url: "get_wifi_list"},
    cancle_dhcp: {url: "cansel_dhcp"},
    begin_dhcp: {url: "start_dhcp"},
    get_server_ip: {url: base + "Network/get_server_ip"},
    set_server_ip: {method: HTTP_POST, url: base + "Network/set_server_ip"},
    start_ping: {method: HTTP_POST, url: "start_ping"},
    ping_echo: {method: HTTP_POST, url: "ping_echo"},
    end_ping: {method: HTTP_POST, url: "end_ping"},
    // windows 独立版
    connect_wifi: {method: HTTP_POST, url: "connect_wifi"},
    get_client_ip: {url: "get_client_ip"}
}));

// 后台主动发送的消息，转发给底层 HTTP 服务器
assign(api.command, createAPI({
    shutdown: {url: "shutdown"},
    reboot: {url: "reboot"},
    changeClientConfig: {method: HTTP_POST, url: "changeclientConfig"},
    set_wait_time: {method: HTTP_POST, url: "set_wait_time"},
    changeName: {method: HTTP_POST, url: "changeName"},
    loginMode: {method: HTTP_POST, url: "loginMode"},
    upgrade_from_server: {method: HTTP_POST, url: "upgrade_from_server"},
    getclientconfig: {url: "getclientconfig"},
    getusbsetting: {url: "getusbsetting"},
    setusbsetting: {method: HTTP_POST, url: "setusbsetting"},
    rdp_config: {url: "rdp_config"},
    kill_spicy: {url: "kill_spicy"}
}));

ajax.get = ajax[HTTP_GET] = ajax.bind(this, HTTP_GET);
ajax.post = ajax[HTTP_POST] = ajax.bind(this, HTTP_POST);

function ajax(method, url, data) {
    var originUrl = url;
    if(url.indexOf("http://") !== 0) {
        if(url.indexOf("/") !== 0) {
            url = "/request/business/" + url;
        }
        url = $API + url; // eslint-disable-no-undef
    }
    if(data && url.indexOf("loop_data") === -1) {
        console.log(">>>>> http send data:", originUrl, data);
    }
    return new Promise(function(resolve, reject){
        var xhr = new XMLHttpRequest();
        xhr.open(method, url + "?t=" + Date.now());
        xhr.setRequestHeader("Content-Type", "application/json");
        dom.on(xhr, "load", function(e){
            var text = e.target.responseText;
            var resp;
            try {
                resp = JSON.parse(text);
                if(resp.code !== 0) {
                    reject(i18n(resp.code));
                } else {
                    resolve(resp.result);
                }
            } catch(e) {
                console.log("parse response failed:", url);
                reject(e);
            }
        });
        dom.on(xhr, "timeout", function(){
            console.log("request timeout:", url);
            reject(new Error("timeout"));
        });
        dom.on(xhr, "error", function(e){
            console.log("request error:", e.message, url);
            reject(e);
        });
        xhr.send(isString(data) ? data : JSON.stringify(data));
    });
}

function createAPI(obj) {
    var ret = {};
    each(obj, function(val, key){
        ret[key] = function(data){
            return ajax[val.method || "GET"](val.url, data);
        };
    });
    return ret;
}
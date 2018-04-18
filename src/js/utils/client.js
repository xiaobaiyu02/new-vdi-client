var dom = require("./dom");
var backend = require("../backend/lowlevel");
var wsBackend = require("../backend/ws");
var merge = require("lodash/merge");
var isEqual = require("lodash/isEqual");

var currentClient = {
    isLinux: dom.isLinux(),
    isAndroid: dom.isAndroid(),
    isWindows: dom.isWindows()
};

if(window.DEBUG && localStorage.client_type) {
    currentClient.isAndroid = localStorage.client_type === "3";
    currentClient.isLinux = localStorage.client_type === "0";
    currentClient.isWindows = localStorage.client_type === "2"
                          ||  localStorage.client_type === "999";
}


currentClient.promise = backend.config().then(function(result){
    currentClient.setConfig(result);
    return currentClient;
});
module.exports = currentClient;

/**
 * 接受一个 getclientconfig 返回的配置对象，并应用这个配置
 * @param {Object} cfg 更新 currentClient
 */
currentClient.setConfig = function(cfg){
    var client = currentClient;
    // 设置 currentClient，保证代码为驼峰风格
    client.clientType = cfg.client_type;
    if(window.DEBUG && localStorage.client_type) {
        client.clientType = localStorage.client_type * 1;
    }
    // 桌面属性
    client.modeCountdown = cfg.desktop_mode.mode_countdown;
    client.waittime = cfg.desktop_mode.wait_time;
    client.finalMode = cfg.desktop_mode.final_mode;
    client.desktopMode = cfg.desktop_mode.desktop_mode;
    // windows 属性
    if(client.isWindows) {
        client.windowsMode = cfg.windows.fullscreen;
    }
    // 联动关机时会从这里读取联动属性
    client.config = cfg;
    // 其它的属性暂不确定要不要加，后面再看
};

/**
 * 更新配置，接受的数据为不完整配置数据
 */
currentClient.updateConfig = function(data, fromServer){
    // 如果修改服务器地址信息，或者本地网卡信息，需要主动断线重连
    var reconnect = false;
    if(data.console) {
        reconnect = !isEqual(data.console, currentClient.config.console);
    }
    if(data.network) {
        reconnect = reconnect || !isEqual(
            data.network,
            currentClient.config.network
        );
    }
    // 通常来说，重连是没问题的，但是端收到服务器更新参数后会重启
    // 所以，如果端会重启就不重连，否则界面会短暂的显示连接服务器失败
    // 参考：http://172.16.203.11:8011/bugfree/index.php/bug/8869
    if(fromServer) {
        reconnect = false;
    }
    backend.config().then(function(result){
        result = merge(result, data);
        currentClient.setConfig(result);
        return currentClient;
    }).then(function(){
        return reconnect ? wsBackend() : null;
    }).then(function(wsapi){
        wsapi && wsapi.destroy();
    });
};
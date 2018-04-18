/* global currentClient */
var isArray = require("lodash/isArray");

exports.parseNetwork = parseNetwork;
exports.getWifiPostData = getWifiPostData;

/**
 * 由于各个端 get_ip 接口返回的数据不一致，此方法用于统一这些数据，
 * 以保证客户端代码的一致性
 * 
 * @param {Object} obj get_ip 的返回信息
 */
function parseNetwork(obj) {
    var networkInfo = {};
    // 有线网络设备信息
    var devices = [];
    var currentDevice;
    // 无线网络设备只需要记住一个 SSID
    var ssid;
    // 有线无线都记录的数据
    var publicFields = ["address", "mask", "gateway", "dns1", "dns2"];
    // Windows 独立版返回的是一个数组，正常版不是
    if(isArray(obj)) {
        var ethernets = obj.filter(function(dev){
            return dev["interface-type"] === 0;
        });
        devices = ethernets.map(function(dev){
            return dev.ConnectName;
        });
        var wlans = obj.filter(function(dev){
            return dev["interface-type"] === 1;
        });
        if(wlans && wlans.length > 0) {
            ssid = wlans[0].wifi_name;
        }
        currentDevice = devices[0] || null;
        if(ssid) {
            obj = wlans[0];
        } else {
            obj = ethernets[0];
        }
    } else {
        devices = obj.network_device_list || [];
        currentDevice = obj.network_device_name;
        ssid = obj.wifi_name;
    }

    publicFields.forEach(function(field){
        networkInfo[field] = obj[field];
    });
    networkInfo.devices = devices;
    networkInfo.device = currentDevice;
    networkInfo.ssid = ssid;
    // net-type, interface-type 这两个字段后端为数字
    networkInfo.connectMethod = obj["net-type"] + "";
    networkInfo.interfaceType = obj["interface-type"] + "";
    return networkInfo;
}

function getWifiPostData(name, password){
    var data;
    // 目前只有这两个平台上有保存 wifi 的操作
    if(currentClient.isLinux) {
        data = {
            "interface-type": 1,
            "net-type": 1,
            wifi_name: name,
            wifi_pwd: password
        };
    } else if(currentClient.clientType === 999) {
        data = {
            SSID: name,
            password: password
        }
    } else {
        throw new Error("current unsupported");
    }
    return data;
}
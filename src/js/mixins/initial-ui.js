/**
 * initial-ui 的逻辑 mixin 代码
 * 
 * 不同于 components/initial-ui.js 这个文件处理所有和处理请求有关的代码逻辑
 * 需要注意它们的关注点不一样，这样做的好处是每个文件独立，逻辑也独立，修改 bug
 * 时是界面问题还是请求问题定位快
 */
var backend = require("../backend/lowlevel");
var networkUtils = require("../utils/network");
var setArray = require("../utils/vue").setArray;
var isArray = require("lodash/isArray");
var oem = require("../oem");

var wifiTimer;
var updateWifiInterval = 5000;

var instance;

module.exports = {
    watch: {
        interfaceType: function(v){
            if(v === "0") {
                clearTimeout(wifiTimer);
            } else if(v === "1") {
                updateWifi();
            }
        },
        connectMethod: function(val){
            var self = this;
            if(val === "0") {
                getNetworkInfo(true);
            } else {
                [
                    "address",
                    "mask",
                    "gateway",
                    "dns1",
                    "dns2"
                ].forEach(function(key){
                    self[key] = "";
                });
                this.startDHCP();
            }
        },
        dns1: function(val){
            if(val === "...") {
                this.dns1 = "";
            }
        },
        dns2: function(val){
            if(val === "...") {
                this.dns2 = "";
            }
        },
        pingResult: function(){
            this.$nextTick(function(){
                var el = this.$el.querySelector("textarea");
                if(el) {
                    el.scrollTop = el.scrollHeight;
                }
            });
        }
    },
    created: function(){
        instance = this;
        getVersion();
        Promise.all([
            getServerIp(),
            getNetworkInfo()
        ]).then(function(){
            var fieldDefaults = {};
            [
                "server_ip", "server_port",
                "interfaceType", "connectMethod",
                "address", "mask", "gateway",
                "dns1", "dns2"
            ].forEach(function(key){
                fieldDefaults[key] = instance[key];
            });
            // 存储此值供 重置 使用
            instance.defaultValues = fieldDefaults;
        });
    },
    destroyed: function(){
        clearTimeout(wifiTimer);
        instance = null;
    },
    methods: {
        shutdown: function(){
            backend.system.shutdown();
        },
        restart: function(){
            backend.system.reboot();
        },
        saveSettings: function(){
            var self = this;
            if(self.password !== oem.password) {
                self.error = "i18n:wrong password";
                return ;
            }
            self.error = "";
            self.loading = true;
            // 手动保存前取消自动 DHCP
            self.stopDHCP();
            setServerIp().then(setNetworkInfo).then(function(){
                self.$emit("done");
            }, function(e){
                self.error = e.message;
            }).then(reportError, reportError);
            function reportError(){
                // 参考：http://172.16.203.11:8011/bugfree/index.php/bug/8866
                setTimeout(function(){
                    // 如果 30s 后还在加载，说明没有注册成功
                    if(!self.loading) {
                        return;
                    }
                    self.loading = false;
                    self.error = "i18n:"
                               + "Connect server failed,Please reconfigure";
                    self.$emit("stop");
                }, 30 * 1000);
            }
        }
    }
};

function getVersion(){
    backend.system.info().then(function(res){
        instance.version = res.version;
    });
}

function getServerIp(){
    return backend.network.get_server_ip().then(function(res){
        instance.server_ip = res.console_ip;
        instance.server_port = res.console_port || "8585";
    });
}

function setServerIp(){
    var data = {
        console_ip: instance.server_ip,
        console_port: instance.server_port * 1,
        rabbitmq_ip: instance.server_ip
    };
    return backend.network.set_server_ip(data);
}

function getNetworkInfo(checkMethod){
    return backend.network.get_ip().then(function(res){
        var data = networkUtils.parseNetwork(res);
        if(checkMethod && data.connectMethod !== instance.connectMethod) {
            return;
        }
        Object.keys(data).forEach(function(key){
            var val = data[key];
            if(isArray(val)) {
                setArray(instance[key], val);
            } else {
                instance[key] = val;
            }
        });
    });
}

function setNetworkInfo(){
    var data;
    if(instance.interfaceType === "0") {
        data = {
            "interface-type": 0,
            "net-type": instance.connectMethod * 1,
            address: instance.address,
            mask: instance.mask,
            gateway: instance.gateway,
            dns1: instance.dns1,
            dns2: instance.dns2,
            network_device_name: instance.device,
            network_device_list: instance.devices
        };
    } else {
        data = networkUtils.getWifiPostData(this.ssid, this.wifi_pwd);
    }
    return backend.network.set_ip(data);
}

function updateWifi(){
    backend.network.get_wifi_list().then(function(list){
        instance.wifilist = list;
        wifiTimer = setTimeout(updateWifi, updateWifiInterval);
    }, function(){
        // 失败不清空 wifilist
        wifiTimer = setTimeout(updateWifi, updateWifiInterval);
    });
}
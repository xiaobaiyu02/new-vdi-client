/**
 * 网络组件
 */
/* global views, currentClient */
var backend = require("../backend/lowlevel");
var bsinput = require("./base/bsinput");
var validators = require("../validators");
var i18n = require("../i18n/client");
var assign = require("lodash/assign");
var isArray = require("lodash/isArray");
var isEqual = require("lodash/isEqual");
var setArray = require("../utils/vue").setArray;
var networkUtils = require("../utils/network");
var wsBackend = require("../backend/ws");

var components = {
    "bs-ip-input": bsinput.bsIpInput({
        gridScale: "4:5",
        ipControlCls: "ip-wrapper form-control input-sm",
        validator: validators.vtypes.ip,
        disabledCls: "disabled-input"
    }),
    "bs-optional-ip-input": bsinput.bsIpInput({
        gridScale: "4:5",
        ipControlCls: "ip-wrapper form-control input-sm",
        validator: function(val){
            return !val || val === "..." || validators.vtypes.ip(val);
        },
        disabledCls: "disabled-input"
    }),
    "bs-wire-type": bsinput.bsRadio({
        inline: true,
        name: "interfaceType",
        items: [{
            value: "0", name: "wtype", text: i18n("有线"), checked: true
        }, {
            value: "1", name: "wtype", text: i18n("无线")
        }]
    }),
    "bs-net-type": bsinput.bsSelect({
        gridScale: "4:5",
        formControlCls: "form-control input-sm",
        options: (function(arr){
            if(!currentClient.isLinux) {
                arr.pop();
            }
            return arr;
        })([{
            value: "0", text: i18n("静态IP")
        }, {
            value: "1", text: "DHCP"
        }, {
            value: "2", text: i18n("系统获取")
        }])
    }),
    "bs-port-input": bsinput.bsNumberInput({
        gridScale: "4:5",
        formControlCls: "form-control input-sm",
        min: 1025,
        max: 65535,
        minlength: 4,
        maxlength: 5,
        placeholder: "1025~65535",
        validator: validators.vtypes.port
    }),
    "bs-slot-input": bsinput.bsInput({
        formControlCls: "form-control input-sm",
        gridScale: "4:5"
    }),
    "bs-password-input": bsinput.bsPasswordInput({
        gridScale: "4:5",
        formControlCls: "form-control input-sm"
    }),
    "bs-ping-input": bsinput.bsTextInput({
        gridScale: "4:5",
        formControlCls: "form-control input-sm",
        maxlength: 36,
        validator: validators.vtypes.domain
    })
};

// 有线网卡数据的字段列表
var ethernetFields = [
    "connectMethod",
    "interfaceType",
    "address",
    "mask",
    "gateway",
    "dns1",
    "dns2"
];
var wifiTimer;
var updateWifiInterval = 5000;
// 保存对旧值的引用，用于检查数据是否修改过
var oldEthernetData;
// 内部标记，表示是否应当重新设置 oldEthernetData
var resetOldData = true;

module.exports = {
    props: ["show"],
    data: function(){
        return {
            // 首次加载的时候忽略 connectMethod change
            ignoreMethod: true,
            isLinux: currentClient.isLinux,
            clientType: currentClient.clientType,
            currentView: 1,
            // model
            device: null,
            devices: [],
            ssid: null,
            interfaceType: "0",
            connectMethod: "1",
            address: "",
            mask: "",
            gateway: "",
            dns1: "",
            dns2: "",
            ethernetError: "",
            wifipassword: "",
            wifilist: [],
            pingAddress: "",
            pingForever: true,
            pingCount: 4,
            pingResult: "",
            pinging: false
        };
    },
    mixins: [
        require("../mixins/ping")
    ],
    components: components,
    template: views["settings-network-config"],
    watch: {
        interfaceType: function(val){
            if(val === "0" /* 有线网络 */) {
                clearTimeout(wifiTimer);
            } else if(val === "1" /* 无线网络 */) {
                this.updateWifi();
            }
        },
        connectMethod: function(val){
            var self = this;
            if(self.ignoreMethod) {
                self.ignoreMethod = false;
                return;
            }
            var fields = ["address", "mask", "gateway", "dns1", "dns2"];
            if(val === "1" /* DHCP */ || val === "2") {
                fields.forEach(function(key){
                    self[key] = "";
                    oldEthernetData[key] = NaN;
                });
            } else if(val === "0" /* static */) {
                self.loadNetwork(true);
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
        gateway: function(val){
            if(val === "...") {
                this.gateway = "";
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
        this.loadConfig();
    },
    destroy: function(){
        oldEthernetData = null;
        resetOldData = true;
    },
    methods: {
        _: i18n,
        lt1k: validators.vtypes.numberRange(1, 1000),
        isIP: validators.vtypes.domain,
        loadConfig: function(){
            var self = this;
            self.loadNetwork();
            self.$watch("currentView", function(val){
                if(val === 1) {
                    this.loadNetwork();
                }
            });
        },
        loadNetwork: function(checkMethod){
            var self = this;
            backend.network.get_ip().then(function(result){
                // TODO: 这个地方的代码从初始化界面代码复制过来，后面考虑封装成一个独立的组件
                var data = networkUtils.parseNetwork(result);
                if(checkMethod && data.connectMethod !== self.connectMethod) {
                    return;
                }
                Object.keys(data).forEach(function(key){
                    var val = data[key];
                    if(isArray(val)) {
                        setArray(self[key], val);
                    } else {
                        self[key] = val;
                    }
                });
                if(resetOldData) {
                    oldEthernetData = data;
                    resetOldData = false;
                }
            });
        },
        saveEthernet: function(){
            var self = this;
            var data = {
                "net-type": self.connectMethod * 1,
                "interface-type": self.interfaceType * 1
            };
            [
                "address",
                "mask",
                "gateway",
                "dns1",
                "dns2"
            ].forEach(function(key){
                data[key] = self[key];
            });
            if(self.device) {
                data.network_device_name = self.device;
            }
            if(self.devices) {
                data.network_device_list = self.devices;
            }
            backend.network.set_ip(data).then(function(){
                resetOldData = true;
                self.loadNetwork();
                self.ethernetError = i18n("保存成功");
                // 服务器 IP 地址变了，websocket 需要重新连接
                wsBackend().then(function(wsapi){
                    wsapi.destroy();
                });
            }, function(e){
                self.ethernetError = e.message;
            });
        },
        saveWifi: function(){
            var self = this;
            var data = networkUtils.getWifiPostData(
                self.ssid,
                self.wifipassword
            );
            backend.network.connect_wifi(data).then(function(){}, function(){});
        },
        updateWifi: function(){
            var self = this;
            backend.network.get_wifi_list().then(function(list){
                setArray(self.wifilist, list);
                wifiTimer = setTimeout(self.updateWifi, updateWifiInterval);
            }, function(){
                // 失败不清空 wifilist
                wifiTimer = setTimeout(self.updateWifi, updateWifiInterval);
            });
        },
        onEthernetChange: function(e){
            this.ethernet = e;
            ethernetFields.forEach(function(key){
                self[key] = e[0][key] || "";
            });
        },
        isEthernetDirty: function(){
            var self = this;
            var data = oldEthernetData;
            var dirty = false;
            if(!data) {
                return false; 
            }
            Object.keys(data).forEach(function(key){
                // if(!data[key]) {
                //     return; 
                // }
                if(!isEqual(data[key], self[key])) {
                    dirty = true;
                }
            });
            return dirty;
        }
    }
};

assign(module.exports.methods, validators.settings.network());
// 新增方法用于分离校验
assign(module.exports.methods, {
    isEthernetValid: function(){
        return this.checkAllValid([
            "address", "gateway", "mask", "dns1", "dns2"
        ]);
    },
    isWifiValid: function(){
        return this.checkAllValid(["ssid", "wifipassword"]);
    },
    canSubmit: function(){
        if(this.interfaceType === "0"/* 有线网络 */) {
            if(this.connectMethod === "0" /* static */) {
                return this.isEthernetValid();
            } else if(this.connectMethod === "1" /* DHCP */) {
                return true;
            } else if(this.connectMethod === "2" /* 系统获取 */) {
                return true;
            }
        } else {
            return this.isWifiValid();
        }
    }
});
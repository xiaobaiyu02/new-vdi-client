/**
 * 初始化界面主 component
 * 模板在 views/initial-ui.html
 * 模板会主动注入到代码中，无需关心此细节
 */

var clone = require("lodash/cloneDeep");
var dom = require("../utils/dom");

var PANEL_SET = 0;
var PANEL_PING = 1;

var modelDefaults = {
    langId: 0,
    server_ip: "",
    server_port: "",
    devices: [],
    device: null,
    interfaceType: "0",
    currentPanel: -1,
    connectMethod: "1",
    address: "",
    mask: "",
    gateway: "",
    dns1: "",
    dns2: "",
    ssid: null,
    wifipassword: "",
    wifilist: [],
    password: "",
    pinging: false,
    pingAddress: "",
    pingForever: true,
    pingCount: 4,
    pingResult: "",
    error: "",
    error2: "",
    version: "",
    isLinux: dom.isLinux(),
    showUpgrade: false,
    upgradeCode: -1,
    upgradeFile: "",
    upgradeList: [],
    upgradeMessages: [],
    upgradable: false,
    upgrading: false,
    // loading 标志
    loading: false,
    animidx: 1
};

var i18n = require("../i18n/init");
var bsinput = require("./base/bsinput");
var modal = require("./base/modal");
var vtypes = require("../validators").vtypes;

// validator 函数
var ipValidator = vtypes.ip;
var portValidator = vtypes.port;
var pingCountValidator = vtypes.numberRange(1, 1000);
var pingValidator = vtypes.domain;
// 使用组件生成器生成特定的界面所需要的组件，避免动态传参
var components = {
    "bs-ip-input": bsinput.bsIpInput({
        gridScale: "5:7",
        ipControlCls: "ip-wrapper form-control",
        validator: ipValidator,
        disabledCls: "disabled-input"
    }),
    "bs-optional-ip-input": bsinput.bsIpInput({
        gridScale: "5:7",
        ipControlCls: "ip-wrapper form-control",
        validator: function(val){
            return !val || val === "..." || ipValidator(val);
        },
        disabledCls: "disabled-input"
    }),
    "bs-interface-type": bsinput.bsRadio({
        inline: true,
        items: [{
            value: "0", name: "wtype", text: "{{_('Wired')}}", checked: true
        }, {
            value: "1", name: "wtype", text: "{{_('Wifi')}}"
        }],
        patch: function(component){
            component.methods = component.methods || {};
            component.methods._ = i18n;
        }
    }),
    "bs-connect-method": bsinput.bsSelect({
        gridScale: "5:7",
        options: [{
            value: "0", text: "{{_('Static')}}"
        }, {
            value: "1", text: "DHCP"
        }].concat(dom.isLinux() ? [{
            value: "2", text: "{{_('System gain')}}"
        }] : []),
        methods: {
            _: i18n
        }
    }),
    "bs-port-input": bsinput.bsNumberInput({
        gridScale: "5:7",
        min: 1025,
        max: 65535,
        minlength: 4,
        maxlength: 5,
        placeholder: "1025~65535",
        validator: portValidator
    }),
    "bs-slot-input": bsinput.bsInput({gridScale: "5:7"}),
    "bs-password-input": bsinput.bsPasswordInput({gridScale: "5:7"}),
    "bs-ping-input": bsinput.bsTextInput({
        gridScale: "4:8",
        maxlength: 36,
        validator: pingValidator
    }),
    "upgrade-modal": modal.create({
        data: {
            fade: true,
            dialogCls: "modal-md upgrade-dialog"
        }
    })
};

module.exports = {
    data: function(){
        return clone(modelDefaults);
    },
    mixins: [
        require("../mixins/initial-ui"),
        require("../mixins/ping"),
        require("../mixins/initial-upgrade"),
        require("../mixins/auto-dhcp")
    ],
    components: components,
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
    },
    methods: {
        _: i18n,
        setLanguage: function(langId){
            i18n.setLanguage(langId);
            this.$forceUpdate();
        },
        resetCurrentPanel: function(e){
            // 判断是不是从 modal 过来的
            var el = e.target;
            var re = /(?:modal|backdrop)/;
            while(el.nodeType === 1 && !re.test(el.className)) {
                el = el.parentNode;
            }
            if(el && el.nodeType === 1) {
                return;
            }
            this.currentPanel = -1;
        },
        showSetPanel: function(){
            this.currentPanel = PANEL_SET;
        },
        showPingPanel: function(){
            this.currentPanel = PANEL_PING;
        },
        showUpgradePanel: function(){
            this.showUpgrade = true;
        },
        resetSettings: function(){
            var self = this;
            var values = self.defaultValues;
            if(!values) {
                return;
            }
            Object.keys(values).forEach(function(key){
                self[key] = values[key];
            });
            self.password = "";
            self.$nextTick(function(){
                this.error = "";
            });
        },
        isIP: ipValidator,
        // less then 1000
        lt1k: pingCountValidator,
        noop: function(){},
        isSettingsValid: function(){
            var self = this;
            var valid = true;
            valid = valid && ipValidator(self.server_ip);
            valid = valid && portValidator(self.server_port);
            if(self.interfaceType === "0"/* 有线网络 */) {
                if(self.connectMethod === "0"/* static */) {
                    // validate ip
                    ["address", "mask"].forEach(function(prop){
                        valid = valid && ipValidator(self[prop]);
                    });
                    ["dns1", "dns2"].forEach(function(prop){
                        var val = self[prop];
                        if(val) {
                            valid = valid && ipValidator(val);
                        }
                    });
                }
            } else {
                valid = valid && self.wifipassword.length > 0;
            }
            return valid;
        },
        extractError: function(error){
            var prefix = "i18n:";
            if(error && error.indexOf(prefix) === 0) {
                return i18n(error.replace(prefix, ""));
            } else {
                return error;
            }
        }
    }
};
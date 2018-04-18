/**
 * 服务器地址组件
 */
/* global views */
var backend = require("../backend/lowlevel");
var bsInput = require("./base/bsinput");
var validators = require("../validators");
var i18n = require("../i18n/client");
var assign = require("lodash/assign");
var wsBackend = require("../backend/ws");

var components = {
    "console-ip": bsInput.bsIpInput({
        gridScale: "5:4",
        ipControlCls: "ip-wrapper form-control input-sm",
        validator: validators.vtypes.ip,
        disabledCls: "disabled-input"
    }),
    "console-port": bsInput.bsNumberInput({
        gridScale: "5:4",
        min: 1025,
        max: 65535,
        minlength: 4,
        maxlength: 5,
        placeholder: "1025~65535",
        validator: validators.vtypes.port,
        formControlCls: "form-control input-sm"
    })
};

module.exports = {
    props: ["show"],
    data: function(){
        return {
            // model
            console_ip: "",
            console_port: "",
            // 对旧值的引用
            old_console_ip: "",
            old_console_port: "",
            error: ""
        };
    },
    components: components,
    computed: {
        dirty: function(){
            return this.console_ip !== this.old_console_ip
                || this.console_port !== this.old_console_port;
        }
    },
    template: views["settings-server-addr-config"],
    created: function(){
        this.loadConfig();
        this.$watch("show", function(val){
            if(!val) {
                return; 
            }
            if(this.dirty) {
                return; 
            }
            this.loadConfig();
        });
    },
    methods: {
        _: i18n,
        loadConfig: function(){
            var self = this;
            backend.network.get_server_ip().then(function(data){
                data.console_port += "";
                ["ip", "port"].forEach(function(s){
                    var key = "console_" + s;
                    var oldKey = "old_" + key;
                    self[oldKey] = self[key] = data[key];
                });
            });
        },
        save: function(){
            var self = this;
            backend.network.set_server_ip({
                console_ip: self.console_ip,
                console_port: self.console_port * 1
            }).then(function(){
                self.loadConfig();
                self.error = i18n("保存成功");
                // 服务器 IP 地址变了，websocket 需要重新连接
                wsBackend().then(function(wsapi){
                    wsapi.destroy();
                });
            }, function(e){
                self.error = e.message;
            });
        }
    }
};

assign(module.exports.methods, validators.settings.serverAddress());
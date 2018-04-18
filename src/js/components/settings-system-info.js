/**
 * 系统设置组件
 */

/* global views, currentClient, clientApp */
var backend = require("../backend/lowlevel");
var validators = require("../validators");
var i18n = require("../i18n/client");
var assign = require("lodash/assign");
var isArray = require("lodash/isArray");
var isString = require("lodash/isString");
var setArray = require("../utils/vue").setArray;
var createModal = require("./base/modal").create;

var components = {
    "resolution-modal": createModal({
        data: {
            title: i18n("设置分辨率"),
            dialogCls: "client-dialog modal-sm"
        },
        template: i18n("SET_RESOLUTION"),
        created: function(){
            this.$once("ok", confirmYes);
            this.$once("cancel", confirmNo);
            this.$once("close", confirmNo);
        }
    }),
    "upgrade-modal": createModal({
        props: ["error"],
        data: {
            title: i18n("系统升级"),
            dialogCls: "client-dialog upgrade-dialog modal-md",
            upgradeList: [],
            upgradeFile: null
        },
        template: {
            body: "<p v-show='upgradeList.length === 0'>"
                +   i18n("SYSTEMUPDATE1")
                + "</p>"
                + "<div class='radio' v-for='item in upgradeList'>"
                + "  <label :class='{disabled: !item.isUpdate}'>"
                + "    <input type='radio' name='upgrade_file'"
                + "      v-model='upgradeFile' :value='item.path'"
                + "      :disabled='!item.isUpdate' :checked='item.checked'"
                + "    />"
                + "    <span>{{ item.path }}</span>"
                + "  </label>"
                + "</div>",
            footer: "<div class='modal-footer'>"
                +   "  <span class='footer-error'>{{ error }}</span>"
                +   "  <button class='btn btn-primary'"
                +   "    v-show='upgradeList.length > 0'"
                +   "    :disabled='!canUpgrade()' @click='doUpgrade'"
                +   "  >{{ _('开始更新') }}</button>"
                +   "  <button class='btn btn-primary'"
                +   "    v-show='upgradeList.length === 0' @click='loadData'"
                +   "  >{{ _('重试') }}</button>"
                +   "</div>"
        },
        created: function(){
            this.$once("ok", function(){
                this.$emit("confirm", true, this.upgradeFile);
            });
            this.$once("cancel", confirmNo);
            this.$once("close", confirmNo);
            this.loadData();
        },
        methods: {
            _: i18n,
            loadData: function(){
                var self = this;
                backend.system.get_upgrate_file().then(function(res){
                    console.assert(
                        isArray(res),
                        "unexpected response result: " + res
                    );
                    // 兼容 android 端引入的数据格式
                    if(isString(res[0])) {
                        res = res.map(function(p){
                            return {path: p, isUpdate: true};
                        });
                    }
                    var checked = false;
                    res.forEach(function(item){
                        if(!checked && item.isUpdate) {
                            item.checked = true;
                            self.upgradeFile = item.path;
                            checked = true;
                        }
                    });
                    setArray(self.upgradeList, res);
                }, function(res){
                    var code;
                    switch(res.code) {
                        case 51007: code = 2; break;
                        case 51006: code = 1; break;
                        default:    code = 0; break;
                    }
                    self.upgradeCode = code;
                });
            },
            canUpgrade: function(){
                if(this.upgrading) {
                    return false; 
                }
                var list = this.upgradeList;
                if(isArray(list)) {
                    return list.some(function(o){
                        return o.isUpdate;
                    });
                }
                return false;
            },
            // modal 内部的事件冒泡到外部处理
            doUpgrade: function(){
                this.upgrading = true;
                this.upgradeCode = 3;
                this.upgradeList.forEach(function(item){
                    item.isUpdate = false;
                });
                this.$emit("ok", this.upgradeFile);
            }
        }
    })
};


module.exports = {
    props: ["show"],
    data: function(){
        return {
            isWindows: currentClient.isWindows,
            currentView: currentClient.isWindows ? 2 : 1,
            resolutions: [],
            resolution: null,
            oldResolution: null,
            resolutionError: "",
            rdpType: "",
            oldRdpType: "",
            rdpTypeError: "",
            // model
            version: "",
            disk_size: "",
            memory_size: "",
            cpu_info: "",
            mac: "",
            showSaveResolutionModal: false,
            showUpgradeModal: false,
            upgradeError: ""
        };
    },
    computed: {
        isResolutionChange: function(){
            return this.resolution !== this.oldResolution;
        },
        isRdpChange: function(){
            return this.rdpType !== this.oldRdpType;
        }
    },
    components: components,
    template: views["settings-system-info"],
    created: function(){
        this.loadConfig();
        this.$watch("currentView", this.loadConfig);
    },
    methods: {
        _: i18n,
        loadConfig: function(){
            switch(this.currentView) {
                case 1: this.loadSystemInfo(); break;
                case 2:
                    this.loadResolutionConfig();
                    if(currentClient.isWindows) {
                        this.loadRdpConfig();
                    }
                    break;
            }
        },
        loadSystemInfo: function(){
            var self = this;
            backend.system.info().then(function(data){
                [
                    "version",
                    "disk_size",
                    "memory_size",
                    "cpu_info",
                    "mac"
                ].forEach(function(key){
                    self[key] = data[key];
                });
            });
        },
        loadResolutionConfig: function(){
            var self = this;
            backend.system.screen_list().then(function(data){
                self.resolution = self.oldResolution = data.current_resolution;
                setArray(
                    self.resolutions,
                    data.support_resolution.map(function(s){
                        return {text: s === "best" ? i18n("最佳") : s, value: s};
                    })
                );
            });
        },
        loadRdpConfig: function(){
            var self = this;
            backend.system.rdp_config({action:1}).then(function(res){
                var type = (res.rdp_type || 0) + "";
                self.rdpType = self.oldRdpType = type;
            });
        },
        save: function(){
            backend.network.set_server_ip({
                console_ip: this.console_ip,
                console_port: this.console_port * 1
            });
        },
        saveResolution: function(){
            return backend.system.screen_size({
                set_resolution : this.resolution || "best"
            }).then(function(){
                self.resolutionError = i18n("保存成功");
                self.loadResolutionConfig();
            }, function(e){
                self.resolutionError = e.message;
            });
        },
        saveRdp: function(){
            var self = this;
            backend.system.rdp_config({
                action: 0,
                rdp_type: self.rdpType * 1
            }).then(function(){
                self.rdpTypeError = i18n("保存成功");
                self.loadRdpConfig();
            }, function(e){
                self.rdpTypeError = e.message;
            });
        },
        // TODO: 原来的逻辑是升级时显示 loading，成功后关闭 loading
        // 我的想法是如果这个速度很快的话，不用显示 loading，看实际测试结果再决定吧
        upgrade: function(file){
            var self = this;
            var stopFn = clientApp.$children[0].asyncLoading();
            backend.system.upgrade_client({
                is_local : 1,
                upgrate_file : file
            }).then(function(){
                self.showUpgradeModal = false;
                stopFn();
            }, function(err){
                self.upgradeError = err.message;
                stopFn();
            });
        },
        onResolutionConfirm: function(val){
            if(val) {
                this.saveResolution();
            }
            this.showSaveResolutionModal = false;
        },
        onUpgradeConfirm: function(val, file) {
            if(val) {
                this.upgrade(file);
            } else {
                this.showUpgradeModal = false;
            }
        }
    }
};

assign(module.exports.methods, validators.settings.serverAddress());

function confirmYes(){
    this.$emit("confirm", true);
}

function confirmNo(){
    this.$emit("confirm", false);
}
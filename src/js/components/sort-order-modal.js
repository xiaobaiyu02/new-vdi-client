/* global views, currentClient */
var createModal = require("./base/modal").create;
var i18n = require("../i18n/client");
var backend = require("../backend/lowlevel");
var isArray = require("lodash/isArray");
var storage = require("../storage");
var dom = require("../utils/dom");

var components = {
    "force-set-order-modal": createModal({
        data: {
            dialogCls: "force-modal modal-md"
        },
        template: {
            header: "",
            body: [
                "<p class='text-center'>" + i18n("抢占序号") + "</p>",
                "<p class='text-center'>",
                "<button type='button' class='btn btn-primary' @click='ok'>"
                  + i18n("确定") + "</button>",
                "<button type='button' class='btn btn-default' @click='cancel'>"
                  + i18n("取消") + "</button>",
                "</p>"
            ].join(""),
            footer: ""
        }
    })
};

var forceSetOrderCallback = null;

module.exports = createModal({
    props: ["floatOrder", "clientOrder"],
    data: {
        sortMethod: "auto",
        manualOrder: "",
        dirty: false,
        clientIp: "",
        autoCenter: false,
        dialogCls: "sort-order-dialog modal-lg",
        error: "",
        currentView: 1,
        finalOrder: 0,
        showForceSetOrderModal: false,
        fontStyle: null
    },
    template: {
        header: "",
        body: views["sort-order-modal"],
        footer: ""
    },
    components: components,
    created: function(){
        var self = this;
        getClientIp().then(function(ip){
            self.clientIp = ip;
        }).catch(function(){});
        // 参考：http://172.16.203.11:8011/bugfree/index.php/bug/8099
        // 需要添加 enter 支持，纯 html 貌似无法完整实现这个功能
        // 所以添加全局 keydown 来处理
        dom.on(document, "keydown", this._bindKeydown);
    },
    beforeDestroy: function(){
        dom.off(document, "keydown", this._bindKeydown);
    },
    watch: {
        currentView: function(val){
            var self = this;
            if(val !== 2) {
                self.fontStyle = null;
                return;
            }
            self.$nextTick(function(){
                var p = self.$el.querySelector(".ordermsg");
                var height = p.getBoundingClientRect().height;
                self.fontStyle = {fontSize: p ? height * 0.9 : 0};
            });
        }
    },
    methods: {
        _: i18n,
        sort: function(){
            var self = this;
            // 默认为自动 +1，自动 +1 并不是要在 floatOrder 的基础上 +1
            var order = self.floatOrder;
            if(self.sortMethod === "manual") {
                order = self.manualOrder * 1;
            }
            var fn = function(force){
                self.$emit("sortOrder", {
                    data: {order: order, force: force},
                    callback: function(err, data){
                        if(err) {
                            self.error = err.message;
                            if(self.error === i18n(50017) &&
                               self.sortMethod === "manual") {
                                forceSetOrderCallback = fn.bind(self, true);
                                self.showForceSetOrderModal = true;
                            }
                        } else {
                            self.finalOrder = data.order;
                            storage.set("order", data.order);
                            self.currentView = 2;
                        }
                    }
                });
            };
            fn();
        },
        close: function(){
            this.$emit("close");
        },
        isValid: function(){
            if(this.sortMethod === "auto") {
                return true;
            } else {
                return this.isOrderValid();
            }
        },
        isOrderValid: function(){
            var order = this.manualOrder * 1;
            if(isNaN(order)) {
                return false; 
            }
            return order >= this.floatOrder && order <= 1000;
        },
        checkValid: function(){
            var order = this.manualOrder * 1;
            this.dirty = true;
            if(isNaN(order)) {
                this.error = i18n("请输入序号");
                return;
            } else {
                if(order < this.floatOrder) {
                    this.error = i18n("输入序号需大于起始序号") + this.floatOrder;
                    return;
                } else if(order > 1000) {
                    this.error = i18n("序号不得大于1000");
                    return;
                }
            }
            this.error = "";
        },
        onForceSetOrder: function(yes){
            if(yes) {
                this.error = "";
                forceSetOrderCallback();
            }
            forceSetOrderCallback = null;
            this.showForceSetOrderModal = false;
        },
        _bindKeydown: function(e){
            if(e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) {
                return;
            }
            if(e.keyCode !== 13/* enter */) {
                return;
            }
            if(this.currentView !== 1) {
                return;
            }
            this.isValid() && this.sort();
        }
    }
});

function getClientIp(){
    // 2017-08-28 陈小虎新增接口
    if(currentClient.isWindows) {
        return backend.network.get_client_ip().then(function(res){
            return res.address;
        });
    } else {
        return backend.network.get_ip().then(function(netcards){
            var current;
            if(!isArray(netcards)) {
                netcards = [netcards];
            }
            netcards.forEach(function(net){
                if(net.status === true) {
                    current = net;
                }
            });
            if(current) {
                return current.address;
            } else {
                return netcards[0].address;
            }
        });
    }
}
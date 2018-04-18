var i18n = require("../i18n/client");
var backend = require("../backend/lowlevel");
var createModal = require("./base/modal").create;

var timer;

module.exports = createModal({
    props: ["seconds"],
    data: {
        title: i18n("client.title.alert"),
        dialogCls: "client-dialog modal-sm offline-alert-dialog",
        value: 10
    },
    template: {
        body: "<p>"
            +   i18n("client.msg.offline-1")
            +   "<span class='second'>{{value}}</span> "
            +   i18n("client.msg.offline-2")
            + "</p>",
        footer: "<div class='modal-footer'>"
            +   "  <button type='button' class='btn btn-primary'"
            +   "    :disabled='value === 0' @click='go'"
            +   "  >{{ okText }}</button>"
            +   "<button type='button' class='btn btn-default'"
            +   "    :disabled='value === 0' @click='close'"
            +   "  >{{ cancelText }}</button>"
            +   "</div>"
    },
    created: function(){
        var self = this;
        self.value = self.seconds;
        timer = setInterval(function(){
            self.value--;
            if(self.value === 0) {
                self.stop();
                self.switch2local();
            }
        }, 1000);
    },
    beforeDestroy: function(){
        this.stop();
    },
    methods: {
        stop: function(){
            clearInterval(timer);
            this.value = 0;
            timer = null;
        },
        switch2local: function(){
            backend.system.switch2local();
        },
        go: function(){
            clearInterval(timer);
            this.switch2local();
        }
    }
});
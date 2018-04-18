/**
 * 客户端界面会用到的一些弹出确认框
 */

var createModal = require("./base/modal").create;
var i18n = require("../i18n/client");
var oem = require("../oem");

var dialogCls = "client-dialog modal-sm";

module.exports = {
    "setting-confirm-modal": createModal({
        data: {
            password: "",
            error: "",
            title: i18n("设置"),
            dialogCls: dialogCls
        },
        template: {
            body: "<div class='form-horizontal'>"
                + "  <div class='form-group clearfix'>"
                + "    <label class='control-label text-right col-xs-4'>"
                +        i18n("密码")
                + "    </label>"
                + "    <div class='col-xs-7'>"
                + "      <input type='password' class='form-control input-sm'"
                + "        v-model='password'"
                + "        @keyup.13='ok' @input='resetError'/>"
                + "    </div>"
                + "  </div>"
                + "</div>",
            footer: "<div class='modal-footer'>"
                +   "  <div class='row'>"
                +   "    <div class='col-xs-11'>"
                +   "      <span class='footer-error'>{{ error }}</span>"
                +   "      <button type='button' class='btn btn-primary'"
                +   "        :disabled='password.length === 0'"
                +   "        @click='ok'"
                +   "      >{{ okText }}</button>"
                +   "      <button type='button' class='btn btn-default'"
                +   "        @click='cancel'"
                +   "      >{{ cancelText }}</button>"
                +   "    </div>"
                +   "  </div>"
                +   "</div>"
        },
        created: function(){
            this.$once("ok", confirmYes);
            this.$once("cancel", confirmNo);
            this.$once("close", confirmNo);
            this.$once("open", function(){
                this.$el.querySelector("input").focus();
            });
        },
        methods: {
            resetError: function(){
                this.error = "";
            },
            validate: function(){
                var flag = this.password === oem.password;
                this.error = flag ? "" : i18n("密码错误");
                return flag;
            }
        }
    }),
    "reboot-confirm-modal": createModal({
        data: {
            title: i18n("重启"),
            dialogCls: dialogCls
        },
        template: i18n("确定重启吗"),
        created: function(){
            this.$once("ok", confirmYes);
            this.$once("cancel", confirmNo);
            this.$once("close", confirmNo);
        }
    }),
    "shutdown-confirm-modal": createModal({
        data: {
            title: i18n("关机"),
            dialogCls: dialogCls
        },
        template: i18n("确定关机吗"),
        created: function(){
            this.$once("ok", confirmYes);
            this.$once("cancel", confirmNo);
            this.$once("close", confirmNo);
        }
    }),
    "exit-confirm-modal": createModal({
        data: {
            title: i18n("退出"),
            dialogCls: dialogCls
        },
        template: i18n("确定退出客户端吗"),
        created: function(){
            this.$once("ok", confirmYes);
            this.$once("cancel", confirmNo);
            this.$once("close", confirmNo);
        }
    }),
    "exit-password-confirm-modal": createModal({
        data: {
            error: "",
            password: "",
            title: i18n("退出"),
            dialogCls: dialogCls
        },
        template: {
            body: "<div class='form-horizontal'>"
                + "  <p class='col-xs-offset-2'>"
                +     i18n("确定退出客户端吗")
                + "  </p>"
                + "  <div class='form-group clearfix'>"
                + "    <label class='control-label text-right col-xs-4'>"
                +        i18n("密码")
                + "    </label>"
                + "    <div class='col-xs-7'>"
                + "      <input type='password' class='form-control input-sm'"
                + "        v-model='password'"
                + "        @keyup.13='ok' @input='resetError'/>"
                + "    </div>"
                + "  </div>"
                + "</div>",
            footer: "<div class='modal-footer'>"
                +   "  <div class='row'>"
                +   "    <div class='col-xs-11'>"
                +   "      <span class='footer-error'>{{ error }}</span>"
                +   "      <button type='button' class='btn btn-primary'"
                +   "        :disabled='password.length === 0'"
                +   "        @click='ok'"
                +   "      >{{ okText }}</button>"
                +   "      <button type='button' class='btn btn-default'"
                +   "        @click='cancel'"
                +   "      >{{ cancelText }}</button>"
                +   "    </div>"
                +   "  </div>"
                +   "</div>"
        },
        created: function(){
            this.$once("ok", confirmYes);
            this.$once("cancel", confirmNo);
            this.$once("close", confirmNo);
            this.$once("open", function(){
                this.$el.querySelector("input").focus();
            });
        },
        methods: {
            resetError: function(){
                this.error = "";
            },
            validate: function(){
                var flag = this.password === oem.password;
                this.error = flag ? "" : i18n("密码错误");
                return flag;
            }
        }
    }),
    "upgrade-confirm-modal": createModal({
        data: {
            title: i18n("系统升级"),
            dialogCls: dialogCls
        },
        template: i18n("UPGRADE_MESS_1"),
        created: function(){
            this.$once("ok", confirmYes);
            this.$once("cancel", confirmNo);
            this.$once("close", confirmNo);
        }
    })
};

function confirmYes(){
    this.$emit("confirm", true);
}

function confirmNo(){
    this.$emit("confirm", false);
}
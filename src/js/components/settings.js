/**
 * 设置组件
 */
/* global views, currentClient */
var i18n = require("../i18n/client");

var SERVER_ADDR_CONFIG = 1;

var components = {
    "server-address-config": require("./settings-server-address-config"),
    "network-config": require("./settings-network-config"),
    "system-info": require("./settings-system-info")
};

module.exports = {
    data: function(){
        return {
            currentView: SERVER_ADDR_CONFIG,
            clientType: currentClient.clientType
        };
    },
    template: views.settings,
    components: components,
    methods: {
        _: i18n,
        showView: function(num){
            this.currentView = num;
        }
    }
};
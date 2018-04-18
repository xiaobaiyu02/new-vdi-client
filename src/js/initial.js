/**
 * 初始化页面的主程序逻辑
 * 
 * 由于 Linux 端不能在首次的时候确定将要运行的 OEM 版本，必须通过服务器数据来确定。
 * 所以根据 ./app.js 分拆出当前文件，用于为初始化打包。
 */
window.Vue = require("vue");
var each = require("lodash/each");
var components = {
    "initial-ui": require("./components/initial-ui")
};
initCurrentClient();
Vue.directive("number", require("./directives/number"));

each(components, function(obj, key){
    // TODO: 使用 require 动态注入模板
    /* eslint-disable  */
	if(views.hasOwnProperty(key)) {
		obj.template = views[key];
	}
	/* eslint-enable */
    Vue.component(key, obj);
});

require("./logger").init();
startApp();

function startApp(){
    window.clientApp = new Vue({
        data: {
            online: false
        },
        el: "#app-container",
        template: "<initial-ui @done='onDone' @stop='onStop'/>",
        mixins: [
            require("./mixins/client-ui/main")
        ],
        methods: {
            onDone: function(){
                this.startWebSocket();
            },
            onStop: function(){
                this.stopWebSocket();
            },
            // 占位符，因为 client-ui 用到了这个
            onAlert: function(){}
        }
    });
}

function initCurrentClient(){
    window.currentClient = require("./utils/client");
    window.currentClient.isInit = true;
}
window.Vue = require("vue");
var each = require("lodash/each");

initCurrentClient();

var components = {
    "client-ui": require("./components/client-ui")
};

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
    console.log("\n\n\napp start ...");
    window.clientApp = new Vue({
        el: "#app-container",
        template: "<client-ui/>"
    });
}


function initCurrentClient(){
    window.currentClient = require("./utils/client")
}

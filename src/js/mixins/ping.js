/**
 * ping 功能的 mixin
 * 因为这个功能多个地方都会用到，所以拿出来封装到 mixin
 * 
 * ping 功能需要几个 v-model:
 *  - pingAddress  要 ping 的 ip 或者域名
 *  - pingForever  是否持续 ping
 *  - pingCount    指定 ping 的次数
 *  - pingResult   ping 结果的字符串
 *  - pinging      是否正在 ping 的标记
 * 
 * 模板可以参考 `views/initial-ui.html`
 */
var ping = require("../utils/ping");

var stopPingFn;

module.exports = {
    beforeDestroy: function(){
        stopPingFn && stopPingFn();
    },
    methods: {
        // TODO: 下面这段文字是很有意义的，考虑添加到 README.md 里
        // 如果提供下面两个方法，使用这个 mixin 的 component 就可以
        // 写更少的代码了，但是如果界面需求发生更改，就需要改这里的代码
        // 了。注意：mixin 是公共代码，尽量少修改公共代码，避免对其它
        // 地方造成影响
        // 
        // isPingCount: function(){},
        // isPingAddress: function(){},
        startPing: function(){
            var self = this;
            self.pingResult = "";
            var count = self.pingForever ? 0 : self.pingCount;
            stopPingFn = ping(self.pingAddress, count, function(text){
                self.pingResult += text;
            }, function(){
                self.pinging = false;
            });
            self.pinging = true;
        },
        endPing: function(){
            stopPingFn && stopPingFn();
        }
    }
};
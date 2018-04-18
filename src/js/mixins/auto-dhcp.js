/**
 * DHCP 逻辑优化
 * 
 * 4.4.2 端在启动的时候，默认需要 DHCP，原有的做法是直到 DHCP 成功，否则一直黑屏
 * 这种方式用户体验太差，4.4.3 中优化这里的交互，由前端轮训 IP 状态信息来查看 DHCP
 * 是否完成。
 */
var backend = require("../backend/lowlevel");
var oem = require("../oem");

var dhcpTimer;
var continueDhcp = false;

module.exports = {
    created: function(){
        this.startDHCP();
    },
    methods: {
        startDHCP: function(){
            clearTimeout(dhcpTimer);
            var self = this;
            var loop = function(){
                // dhcpTimer 启动后会启动一个 promise, promise 是异步的
                // 如果在异步行为期间调用 stopDHCP() ，结果可能是不可预料的
                // 所以手动加一个标记
                if(!continueDhcp) {
                    return;
                }
                dhcpTimer = setTimeout(function(){
                    getDHCPResult().then(function(data){
                        if(data.end) {
                            // 自动填充界面字段
                            self.applyDHCPResult(data.config);
                            // 自动填充密码
                            self.password = oem.password;
                            // 填充后自动触发保存按钮行为
                            self.saveSettings();
                            // 自动触发应当在后台运行，取消打点
                            self.$nextTick(function(){
                                this.loading = false;
                            });
                        } else {
                            loop();
                        }
                    }, function(){
                        loop();
                    });
                }, 2000);
            };
            continueDhcp = true;
            loop();
        },
        stopDHCP: function(){
            clearTimeout(dhcpTimer);
            continueDhcp = false;
        },
        applyDHCPResult: function(data){
            this.server_ip = data.console.console_ip;
            this.server_port = data.console.console_port;
            this.address = data.network.address;
            this.addres = data.network.address;
            this.mask = data.network.mask;
            this.gateway = data.network.gateway;
            this.dns1 = data.network.dns1;
            this.dns2 = data.network.dns2;
            this.connectMethod = "0"; // 静态 IP
        }
    }
};

function getDHCPResult(){
    return backend.config().then(function(data){
        // 使用 IP 地址来判断是否 DHCP 成功，在 windows 上 DHCP 失败的时候
        // 返回的 IP 有可能是 169 开头的某 IP，已确定如果 DHCP 失败，端应当
        // 返回空 IP
        return {
            // 这个字段不需要了，只要某一次结果成功，就执行自动注册
            // autoRegister: !!data.console.registered,
            end: !!(data.network.address && data.console.console_ip),
            config: data
        };
    });
}
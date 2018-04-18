/**
 * 通知组件
 * 
 * 当服务器推送消息时，client-ui 首先收到消息，收到消息后传递给 clientApp，
 * 随后再传递给本组件。
 * 注意：根据后台设计，通知消息并不是实时的！
 */
/* global views */
var loopTimer;
var loopInterval = 30;

module.exports = {
    props: ["message"],
    data: function(){
        return {left: 0};
    },
    watch: {
        message: function(val){
            if(val) {
                this.startLoop();
            } else {
                this.stopLoop();
            }
        }
    },
    template: views["notify-ui"],
    mounted: function(){
        if(this.message) {
            this.startLoop();
        }
    },
    destroyed: function(){
        this.stopLoop();
    },
    methods: {
        startLoop: function(){
            var self = this;
            self.stopLoop();
            loopTimer = setTimeout(function loop(){
                self._run();
                loopTimer = setTimeout(loop, loopInterval);
            }, loopInterval);
        },
        stopLoop: function(){
            clearTimeout(loopTimer);
        },
        _run: function(){
            var width = this.$el.firstElementChild.offsetWidth;
            // +50 让文字有一段隐藏的时间
            if(this.left + width + 10 < 0) {
                this.left = window.innerWidth;
            } else {
                this.left -= 1;
            }
        }
    }
};
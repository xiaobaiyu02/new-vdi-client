/**
 * 日志接口
 * 
 * 如果运行在 nw 上，将日志重定向到本地文件
 * Android 上 logger 的实现同其它端不一致
 * Android 上 API 如下：
 *   oConsole.log(string)
 *   oConsole.error(string)
 *   oConsole.info(string)
 *   oConsole.debug(string)
 *   oConsole.warn(string)
 */
/* global oConsole */
var fs;
var inited = false;
var dom = require("./utils/dom");
var isAndroid = dom.isAndroid();
var lineSeparator = dom.isWindows() ? "\r\n" : "\n";
// log 文件流，需要时再生成
var logStream;
try {
    fs = require("fs");
} catch(e) {
    // ignore
}
exports.init = function(){
    if(inited) {
        return ;
    }
    var oldConsole = window.console;
    window.console = {
        log: function(){
            log2file.apply(this, arguments);
            oldConsole.log.apply(oldConsole, arguments);
        },
        error: function(){
            log2file.apply(this, arguments);
            oldConsole.error.apply(oldConsole, arguments);
        },
        assert: function(test, msg){
            if(!test) {
                log2file.call(this, "assert failed:", msg);
                oldConsole.assert.apply(oldConsole, arguments);
            }
        }
    };
};

function log2file() {
    var args = stripStyles([].slice.call(arguments));
    if(args.length === 0) {
        return;
    }
    if(!isAndroid && !logStream) {
        createLogStream();
    }
    args.unshift(nowstr());
    args = args.map(function(x){
        if(x instanceof Error) {
            x = x.toString();
        } else {
            x = typeof x === "string"
                ? x
                : JSON.stringify(x);
        }
        return x;
    });
    var text = args.join(" ") + lineSeparator;
    // 过滤掉 ping/pong 消息
    // if(/P[IO]NG/.test(text)) {
    //     return;
    // }
    if(isAndroid) {
        oConsole.log(text);
    } else {
        logStream.write(text);
    }
}

function createLogStream() {
    var stream;
    if(fs) {
        stream = fs.createWriteStream("./client.log", {flags: "a"});
    } else {
        // 兼容浏览器
        stream = {
            write: function(){},
            on: function(){}
        };
    }
    // 绑定 error ,防止报错
    stream.on("error", function(){});
    // 正常或非正常关闭后，设置 logStream 为空
    stream.on("close", function(){
        logStream = null;
    });
    logStream = stream;
    return stream;
}

/**
 * 当使用 console.log 时，webkit 支持使用样式打印
 * 这个函数清除样式代码，保证日志干净
 */
function stripStyles(args) {
    var msg = args[0];
    if(!msg) {
        return [];
    }
    if(typeof msg === "string" && msg.indexOf("%c") === 0) {
        args = [msg.substring(2)];
    }
    return args;
}

function nowstr(){
    var d = new Date;
    var datestr = d.getFullYear()
                + "-"
                + padLeft((d.getMonth() + 1))
                + "-"
                + padLeft(d.getDate());
    var timestr = padLeft(d.getHours())
                + ":"
                + padLeft(d.getMinutes())
                + ":"
                + padLeft(d.getSeconds());
    return datestr + " " + timestr;
}

function padLeft(n, ch) {
    if(!ch) {
        ch = "0";
    }
    if(n < 10) {
        return ch + n;
    }
    return n + "";
}
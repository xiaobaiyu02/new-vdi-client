/**
 * ping 
 */
var backend = require("../backend/lowlevel");

/* global currentClient */
module.exports = function(ip, count, onData, onEnd){
    if(currentClient.isAndroid) {
        return httpPing(ip, count, onData, onEnd);
    } else {
        return nativePing(ip, count, onData, onEnd);
    }
};

/**
 * 使用 child_process 实现的 ping
 */
function nativePing(ip, count, onData, onEnd){
    var args = [ip];
    if(count) {
        if(currentClient.isWindows) {
            args.push("-n", count);
        } else {
            args.push("-c", count);
        }
    } else {
        if(currentClient.isWindows) {
            args.push("-t");
        }
    }
    var pingProcess = require("child_process").spawn("ping", args, {
        shell: true
    });
    if(currentClient.clientType === 999) {
        pingProcess.stdout.on("data", function(data){
            onData(gbkTranslate(data));
        });
    } else {
        pingProcess.stdout.on("data", onData);
    }
    
    pingProcess.stdout.on("end", onEnd);
    return function(){
        onEnd();
        try {
            pingProcess.kill();
        } catch(e) {
            console.log("unexpected error: `pingProcess.kill()`;");
        }
    };
}


function httpPing(ip, count, onData, onEnd){
    var pingId;
    var loopData;
    var pingTimer;
    if(count === 0) {
        count = -1;
    }
    onEnd = callOnce(onEnd);
    backend.network.start_ping({ip: ip, number: count}).then(function(res){
        pingId = res.id;
        loopData = {
            ip: ip,
            number: count,
            id: res.id
        };
        loop_ping();
    }).catch(onEnd);
    function loop_ping(){
        pingTimer = setTimeout(function(){
            backend.network.ping_echo(loopData).then(function(res){
                var data = res.message.trim();
                onData(data ? data + "\n" : "");
                if(res.running) {
                    loop_ping();
                } else {
                    onEnd();
                }
            }, function(){
                loop_ping();
            });
        }, 800)
    }
    return function(){
        backend.network.end_ping({id: pingId}).then(function(){
            clearTimeout(pingTimer);
            onEnd();
        });
    };
}

// eslint-disable-next-line max-len
var codedata = {"c7eb":"请", "c7f3":"求", "d5d2":"找", "b2bb":"不", "b5bd":"到", "d6f7":"主", "bbfa":"机", "a1a3":"。", "bcec":"检", "b2e9":"查", "b8c3":"该", "c3fb":"名", "b3c6":"称", "a3ac":"，", "c8bb":"然", "baf3":"后", "d6d8":"重", "cad4":"试", "b3ac":"超", "cab1":"时", "cede":"无", "b7a8":"法", "b7c3":"访", "ceca":"问", "c4bf":"目", "b1ea":"标", "d5fd":"正", "d4da":"在", "bedf":"具", "d3d0":"有", "d7d6":"字", "bdda":"节", "b5c4":"的", "cafd":"数", "bedd":"据", "c0b4":"来", "d7d4":"自", "bbd8":"回", "b8b4":"复", "bce4":"间", "cdb3":"统", "bcc6":"计", "d0c5":"信", "cfa2":"息", "b0fc":"包", "d2d1":"已", "b7a2":"发", "cbcd":"送", "bdd3":"接", "cad5":"收", "b6aa":"丢", "caa7":"失", "cdf9":"往", "b7b5":"返", "d0d0":"行", "b3cc":"程", "b9c0":"估", "d2d4":"以", "bac1":"毫", "c3eb":"秒", "ceaa":"为", "b5a5":"单", "cebb":"位", "d7ee":"最", "b6cc":"短", "b3a4":"长", "c6bd":"平", "bef9":"均"};
function gbkTranslate(data){
    var i = 0, len = data.length;
    var buf = [], byte, key;
    var ret = [];
    for(; i < len; i++) {
        byte = data[i];
        if(byte < 128) {
            ret.push(String.fromCharCode(byte));
        } else {
            buf.push(byte);
            if(buf.length === 1) {
                continue;
            }
            key = buf[0].toString(16) + buf[1].toString(16);
            if(!codedata.hasOwnProperty(key)) {
                console.log("can not translate: " + key);
            } else {
                ret.push(codedata[key]);
            }
            buf = [];
        }
    }
    return ret.join("");
}

function callOnce(fn){
    var called = false;
    return function(){
        if(called) {
            return; 
        }
        called = true;
        fn();
    };
}
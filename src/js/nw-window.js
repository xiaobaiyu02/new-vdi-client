var nw, win;
var noop = function(){};
try {
    nw = require("nw.gui");
    win = nw.Window.get();
} catch(e) {
    // 不支持的平台实现一个空函数
    win = {
        show: noop,
        hide: noop,
        showDevTools: noop
    };
}

var isShowing = true;
module.exports = {
    show: function(){
        if(!isShowing) {
            win.show();
            isShowing = true;
        }
    },
    hide: function(){
        if(isShowing) {
            win.hide();
            isShowing = false;
        }
    },
    isVisible: function(){
        return isShowing;
    }
};
bindAutoRoom();
if(nw) {
    bindDevtools();
}

/**
 * 使用 CSS 控制显示样式太蛋疼了，使用 nw 提供的 zoom 功能自动
 * 调整内容区域的缩放比例，这样效果要好一些。
 * android 上面通过控制缩放 meta[name=viewport] 实现
 */
function bindAutoRoom(){
    var isAndroid = /android/i.test(navigator.userAgent);
    var updateFn;
    if(isAndroid) {
        updateFn = androidUpdateRoomLevel;
    } else if(nw) {
        updateFn = nwUpdateRoomLevel;
    } else {
        console.log("auto room is disabled");
        return;
    }
    window.addEventListener("resize", updateFn);
    updateFn();
}

// 每次更新后会导致页面缩放，进而触发 resize，
// 所以每次手动设置 scale 后，忽略紧接着的下一次 resize
var ignoreUpdate = false;

function nwUpdateRoomLevel(){
    if(ignoreUpdate) {
        ignoreUpdate = false;
        return;
    }
    var room = getRoomLevel();
    // 参考 http://docs.nwjs.io/en/latest/References/Window/#winzoomlevel
    win.zoomLevel = room < 1 ? room * -1 : room;
    ignoreUpdate = true;
}

function androidUpdateRoomLevel(){
    if(ignoreUpdate) {
        ignoreUpdate = false;
        return;
    }
    var zoom = getRoomLevel();
    var meta = document.head.querySelector("meta[name='viewport']");
    var result = /scale=([0-9.]+)/.exec(meta.content);
    if(result) {
        var currentZoom = parseFloat(result[1]);
        if(Math.abs(zoom - currentZoom) < 0.01) {
            return;
        }
    }
    zoom = zoom + "";
    var dotPos = zoom.indexOf(".");
    // 有小数点一般是有很长的一串数字，截断并保留 2 位小数
    if(dotPos > -1) {
        zoom = zoom.substring(0, dotPos + 3);
    }
    meta.content = "initial-scale=" + zoom + ", "
                 + "maximum-scale=" + zoom + ", "
                 + "user-scalable=no";
    ignoreUpdate = true;
}

function getRoomLevel(){
    // 标准宽高
    var standardWidth = 1280;
    var standardHeight = 800;
    // 实际宽高
    var realWidth = window.innerWidth;
    var realHeight = window.innerHeight;
    var ratio;
    // 实际分辨率比标准分辨率大的时候，选择最小的那个比例
    if(standardHeight < realHeight && standardWidth < realWidth) {
        ratio = Math.min(
            realWidth / standardWidth,
            realHeight / standardHeight
        );
    } else if(standardHeight > realHeight && standardWidth > realWidth) {
        // 实际分辨率比标准分辨率小的时候，选择最大的那个比例
        ratio = Math.max(
            realWidth / standardWidth,
            realHeight / standardHeight
        );
    } else {
        // 忽略这种情况
        ratio = 1;
    }
    
    return ratio;
}

function bindDevtools(){
    var fs = require("fs");
    document.addEventListener("keydown", function(e){
        if(e.keyCode === 123) { // F12
            fs.existsSync("./DEBUG") && win.showDevTools();
        }
    });
}
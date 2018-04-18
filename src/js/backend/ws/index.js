/* global Promise */
var WebSocket = window.WebSocket
             || window.webkitWebSocket
             || window.mozWebSocket
             || window.msWebSocket;
var backend = require("../lowlevel");
var dom = require("../../utils/dom");

var WebSocketAPI = require("./api");

if(!WebSocket) {
    throw new Error("current browser doesn't support WebSocket feature");
}

module.exports = connect;

var wsapi;

function connect(){
    if(wsapi && !wsapi._destroyed) {
        return Promise.resolve(wsapi);
    } else {
        return createWebSocketAPI();
    }
}

function createWebSocketAPI(){
    return backend.network.get_server_ip().then(function(data){
        var addr = data.console_ip + ":" + data.console_port;
        var url = "ws://" + addr + "/ws/vdi";
        console.log("create websocket ...");
        return new Promise(function(resolve, reject){
            var socket = new WebSocket(url);
            // 明确指定后端的二进制类型为 arraybuffer
            socket.binaryType = "arraybuffer";
            dom.on(socket, "open", onOpen);
            dom.on(socket, "error", onError);
    
            function onOpen(){
                wsapi = new WebSocketAPI(socket);
                resolve(wsapi);
            }
            function onError(){
                reject(new Error("create websocket fail"));
            }
        });
    });
}
/* global ArrayBuffer, Uint8Array, DataView */
var utf8 = require("utf-8");
var path = require("path");
var fs = require("fs");
var Mock = require("mockjs");
var isObject = require("lodash/isObject");
var isString = require("lodash/isString");
var has = require("lodash/has");
var WebSocketServer = require("ws").Server;
var proxyReply = require("./proxy");
var config = require("../../config");

module.exports = function(server){
    var wss = new WebSocketServer({
        server: server,
        path: "/ws/vdi"
    });
    // TODO: 根据收到的消息定时的主动推一次消息
    wss.on("connection", function(socket){
        socket.binaryType = "arraybuffer";
        socket.on("message", function(data){
            var body = decodePacket(data);
            // 请求转发到真正的服务器
            if(config.vdiProxy) {
                proxyReply(config.vdiProxy, body.body).then(function(response){
                    socket.send(
                        encodePacket(body.mac, body.header, response.body)
                    );
                }, function(err){
                    socket.send(encodePacket(body.mac, body.header, {
                        code: -1,
                        message: err.message
                    }));
                });
            } else { // 使用假数据
                reply(body, socket);
            }
        });
        socket.on("error", function(){
            /* ignore */
        });
    });
    console.log("websocket server started.");
};

function reply(recvBody, socket) {
    var msg, mac;
    try {
        msg = JSON.parse(recvBody.body);
    } catch(e) {
        msg = {method: "parsejsonerror"};
    }
    if(msg.method === "PING") {
        return socket.send(encodePacket(recvBody.mac, recvBody.header, "PONG"));
    }
    var jsonfile = path.resolve("./.data/websocket/" + msg.method + ".json");
    var mockData = mockfile(jsonfile);
    var callbackKey = "callback_id";
    if(has(msg, callbackKey)) {
        mockData[callbackKey] = msg[callbackKey];
    }
    mac = recvBody.mac;
    socket.send(encodePacket(recvBody.mac, recvBody.header, mockData));
    switch(msg.method) {
        case "vm_connect":
            setTimeout(function(){
                initiativeReply("vm_connect_reply", mac, socket);
            }, Math.random() * 1000);
            break;
    }
}

function initiativeReply(method, mac, socket){
    var jsonfile = path.resolve("./.data/websocket/" + method + ".json");
    var mockData = mockfile(jsonfile);
    socket.send(encodePacket(mac, null, mockData));
}

// copy from ../routes/mock.js
function mockfile(file) {
    var obj, content;
    try {
        content = fs.readFileSync(file, "utf-8");
        obj = JSON.parse(content);
    } catch(e) {
        obj = {
            "msg": e.message,
            "file": file
        };
    }
    return Mock.mock(obj);
}

// copy from ../../src/js/ws/api.js

function encodePacket(mac, header, body){
    if(isObject(body)) {
        body = JSON.stringify(body);
    }
    if(isString(body)) {
        body = uint8fiy(body);
    }
    var buffer = new ArrayBuffer(59 + body.length);
    var head55 = new Uint8Array(buffer, 0, 55);
    copyTo(head55, 0, 6, uint8fiy("oseasy"));
    console.assert(mac.length === 17, "invalid mac string: " + mac);
    copyTo(head55, 6, 17, uint8fiy(mac));
    if(!header) {
        header = new Uint8Array(32);
    }
    copyTo(head55, 23, 32, header);
    var headTail = new DataView(buffer, 55, 4);
    headTail.setUint32(0, body.length);
    var bodyArr = new Uint8Array(buffer, 59, body.length);
    copyTo(bodyArr, 0, buffer.byteLength, body);
    return buffer;
}

function decodePacket(data){
    var copyright = stringify(new Uint8Array(data, 0, 6));
    var mac = stringify(new Uint8Array(data, 6, 17));
    var msg = new Uint8Array(data, 23, 32);
    var bodySize = (new DataView(data, 55, 4)).getUint32(0);
    var body = stringify(new Uint8Array(data, 59, bodySize));
    return {
        copyright: copyright,
        mac: mac,
        msg: msg,
        body: body
    }
}

function stringify(arr) {
    return utf8.getStringFromBytes(arr);
}

function uint8fiy(str){
    var bytes = utf8.setBytesFromString(str);
    return Uint8Array.from(bytes);
}

function copyTo(dest, from, size, src) {
    var n = 0;
    for(; n <= size; n++) {
        dest[from + n] = src[n];
    }
}

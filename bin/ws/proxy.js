/**
 * 这个文件将 websocket 请求转发到 vdi 服务器，方便和后端联调（跳过数据转发层）
 */
var got = require("got");

module.exports = function(url, data){
    return got.post(url, {
        body: JSON.parse(data),
        json: true
    });
};
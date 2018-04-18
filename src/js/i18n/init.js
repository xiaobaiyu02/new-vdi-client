/**
 * 初始化页面的翻译函数
 */
/* eslint-disable */
// 中文常量
var LANG_SIMPLE = 0;
var LANG_TRADITIONAL = 1;
var LANG_ENGLISH = 2;
/* eslint-enable */

var currentLang = LANG_SIMPLE;

/**
 * 翻译原则：key 在保留含义的基础上尽可能短
 */
var data = {
    "can't connect server": [
        "无法连接服务器",
        "無法連接伺服器",
        "Unable to connect to server"
    ],
    "maybe error reasons": [
        "可能出现的原因是：",
        "可能出現的原因是:",
        "Possible reasons:"
    ],
    "init reason 1": [
        "1.网络配置不正确，请点击设置按钮重新配置",
        "1.網路配置不正確，請點選設定按鈕重新配置",
        "1.Configure network error, please click “set” button to re-configure"
    ],
    "button set": [
        "设置",
        "設定",
        "set"
    ],
    "init reason 2": [
        "2.网络异常，请点击ping按钮进行测试",
        "2.網路異常，請點選“ping”按鈕進行測試",
        "2.Network abnormally,please click \"ping\" button to test"
    ],
    "init reason 3": [
        "3.客户端版本不匹配或者过低",
        "3.客戶端版本不匹配或者過低",
        "3.The client version mismatch or too low"
    ],
    "button upgrade": [
        "升级",
        "升級",
        "update"
    ],
    "Server Setting": [
        "服务器设置",
        "服務器設置",
        "Server Setting"
    ],
    "Server address": [
        "服务器地址",
        "服務器地址",
        "Server address"
    ],
    "Server port": [
        "服务器端口号",
        "服務器端口號",
        "Server port"
    ],
    "Local network": [
        "本地网络",
        "本地網絡",
        "Local network"
    ],
    "type": [
        "连接方式",
        "連接方式",
        "type"
    ],
    "Wifi": [
        "无线",
        "無線",
        "Wifi"
    ],
    "Wired": [
        "有线",
        "有線",
        "Wired"
    ],
    "Networking": [
        "网络连接",
        "網路連接",
        "Networking"
    ],
    "Static": [
        "静态IP",
        "靜態IP",
        "Static"
    ],
    "DHCP": [
        "DHCP",
        "DHCP",
        "DHCP"
    ],
    "System gain": [
        "系统获取",
        "系統獲取",
        "System gain"
    ],
    "IP address": [
        "IP地址",
        "IP地址",
        "IP address"
    ],
    "Subnet mask": [
        "子网掩码",
        "子網掩碼",
        "Subnet mask"
    ],
    "Default gateway": [
        "默认网关",
        "默認網關",
        "Default gateway"
    ],
    "Preferred DNS": [
        "首选DNS",
        "首選DNS",
        "Preferred DNS"
    ],
    "Alternate DNS": [
        "备用DNS",
        "備用DNS",
        "Alternate DNS"
    ],
    "wifi list": [
        "无线网络列表",
        "無線網路清單",
        "wifi list"
    ],
    "password": [
        "密码",
        "密碼",
        "password"
    ],
    "Password": [
        "验证密码",
        "驗證密碼",
        "Password"
    ],
    "wrong password": [
        "密码错误",
        "密碼錯誤",
        "wrong password"
    ],
    "Required can't be empty": [
        "必填项不能为空",
        "必填項不能為空",
        "Required can't be empty"
    ],
    "Please enter the port number between 1024-65535": [
        "请输入1024-65535之间的端口号",
        "請輸入1024-65535之間的端口號",
        "Please enter the port number between 1024-65535"
    ],
    "Connect server failed,Please reconfigure": [
        "连接服务器失败，请重新配置",
        "連接服務器失敗，請重新配置",
        "Connect server failed,Please reconfigure"
    ],
    "save": [
        "保存",
        "保存",
        "save"
    ],
    "reset": [
        "重置",
        "重置",
        "reset"
    ],
    "Address": [
        "地址",
        "地址",
        "Address"
    ],
    "Continue to send ping packets": [
        "持续发送ping包",
        "持續發送ping包",
        "Continue to send ping packets"
    ],
    "Ping packet number ": [
        "ping包数量 ",
        "ping包數量 ",
        "Ping packet number "
    ],
    "start": [
        "开始",
        "開始",
        "start"
    ],
    "cancel": [
        "取消",
        "取消",
        "cancel"
    ],
    "shutdown": [
        "关机",
        "關機",
        "shutdown"
    ],
    "restart": [
        "重启",
        "重啟",
        "restart"
    ],
    "version": [
        "版本",
        "版本",
        "version"
    ],
    "Please insert the upgrade usb, click update to start the update": [
        "请插入升级U盘，点击开始更新进行更新",
        "請插入升級U盤，點擊開始更新進行更新",
        "Please insert the upgrade usb, click update to start the update"
    ],
    "Did not find U disk or U disk load failure": [
        " 未发现U盘或者U盘加载失败",
        "未發現U盤或U盤加載失敗",
        "Did not find U disk or U disk load failure"
    ],
    "Upgrade file not detected, please update again": [
        "未检测到升级文件，请重新升级",
        "未檢測到升級文件，請重新升級",
        "Upgrade file not detected, please update again"
    ],
    // eslint-disable-next-line max-len
    "System is upgrading, please do not turn the power off or remove the usb flash drive, system will automatically restart after a successful upgrade": [
        "系统正在升级，请勿关闭电源或移除U盘，升级成功后系统将会自动重启。",
        "系統正在升級，請勿關閉電源或移除U盤，升級成功后系統將會重啟",
        "System is upgrading, please do not turn the power off "
          + "or remove the usb flash drive, system will automatically "
          + "restart after a successful upgrade"
    ],
    "Start update": [
        "开始更新",
        "開始更新",
        "Start update"
    ]
};

module.exports = function(key){
    if(data.hasOwnProperty(key)) {
        return data[key][currentLang];
    } else {
        console.error("missing translate key:", key);
        return key;
    }
};

module.exports.setLanguage = function(langId){
    currentLang = langId;
};
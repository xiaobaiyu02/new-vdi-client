var isArray = require("lodash/isArray");
var isString = require("lodash/isString");
var backend = require("../backend/lowlevel");
var setArray = require("../utils/vue").setArray;

var messages = [
    "Please insert the upgrade usb, click update to start the update",
    "Did not find U disk or U disk load failure",
    "Upgrade file not detected, please update again",
    "System is upgrading, please do not turn the power off or "
    + "remove the usb flash drive, system will automatically "
    + "restart after a successful upgrade"
];

module.exports = {
    methods: {
        initModal: function(){
            var self = this;
            self.upgradeMessages = messages;
            backend.system.get_upgrate_file().then(function(res){
                console.assert(
                    isArray(res),
                    "unexpected response result: " + res
                );
                // 兼容 android 端引入的数据格式
                if(isString(res[0])) {
                    res = res.map(function(p){
                        return {path: p, isUpdate: true};
                    });
                }
                var checked = false;
                res.forEach(function(item){
                    if(!checked && item.isUpdate) {
                        item.checked = true;
                        self.upgradeFile = item.path;
                        checked = true;
                    }
                });
                setArray(self.upgradeList, res);
            }, function(res){
                var code;
                switch(res.code) {
                    case 51007: code = 2; break;
                    case 51006: code = 1; break;
                    default:    code = 0; break;
                }
                self.upgradeCode = code;
            });
        },
        canUpgrade: function(){
            if(this.upgrading) {
                return false; 
            }
            var list = this.upgradeList;
            if(isArray(list)) {
                return list.some(function(o){
                    return o.isUpdate;
                });
            }
            return false;
        },
        doUpgrade: function(){
            this.upgrading = true;
            this.upgradeCode = 3;
            this.loading = true;
            backend.system.upgrade_client({
                is_local: 1,
                upgrate_file: this.upgradeFile
            });
            this.upgradeList.forEach(function(item){
                item.isUpdate = false;
            });
        },
        closeModal: function(){
            this.upgradeCode = -1;
            this.upgradeFile = "";
            this.upgradeList = [];
            this.upgrading = false;
        }
    }
};

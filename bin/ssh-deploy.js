var SSH;
try {
    SSH = require("node-ssh");
} catch(e) {
    console.log("如果需要使用 ssh 部署方式，请安装 node-ssh 模块");
    console.log("    npm install node-ssh");
    console.log("建议不要将此依赖包放入 package.json");
    console.log("建议不要将此依赖包放入 package.json");
    console.log("建议不要将此依赖包放入 package.json");
}
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var ini = require("ini");
var parseArgs = require("minimist");

var RESOURCE_DIR = "/iso/iso/zip";
var RESOURCE_MD5_FILE = RESOURCE_DIR + "/md5.ini";
var THOR_VERSION_FILE = "/etc/thor/version";

main();

function main(){
    var args = parseArgs(process.argv.slice(2));
    var host = args.h || args.host;
    var port = args.p || args.port || 22;
    if(!host || !port) {
        return usage();
    }
    var file = args._[0];
    if(!fs.existsSync(file)) {
        return console.error(file + " does not exists!");
    }
    deploy(host, port, path.resolve(file));
}

function deploy(host, port, file){
    var oem = parseOEM(file);
    console.log("OEM 信息: \n  名称: %s\n  MD5: %s\n", oem.name, oem.md5);
    var ssh = new SSH();
    var prefix = Date.now();
    var md5file = prefix + ".md5.ini";
    var versionfile = prefix + ".version";
    console.log("连接 %s:%d ...", host, port);
    ssh.connect({
        host: host,
        port: port,
        // 如果有需求，可以将下面的数据放到命令行选项中
        username: "root",
        password: "oseasy"
    }).then(function(){
        console.log("正在上传文件：", file);
        return ssh.putFile(file, RESOURCE_DIR + "/" + path.basename(file));
    }).then(function(){
        console.log("上传成功！");
    }, function(e){
        console.log("上传失败！");
        console.log(e);
    }).then(function(){
        // 修改 md5.ini，先下载下来
        return Promise.all([
            // 不清楚这个文件的作用，不过每次都改了
            ssh.getFile(md5file, RESOURCE_MD5_FILE),
            // 服务器每次读版本是从这里读，这个必须要修改
            ssh.getFile(versionfile, THOR_VERSION_FILE)
        ]);
    }).then(function(){
        console.log("修改配置文件");
    }, function(e){
        console.error("下载配置文件失败：", e);
    }).then(function(){
        var config1 = ini.parse(fs.readFileSync(md5file, "utf-8"));
        config1[oem.name] = oem.md5;
        fs.writeFileSync(md5file, ini.stringify(config1));
        var config2 = ini.parse(fs.readFileSync(versionfile, "utf-8"));
        config2.lang[oem.name] = oem.md5;
        fs.writeFileSync(versionfile, ini.stringify(config2));
        console.log("修改配置文件成功！");
    }).then(function(){
        console.log("上传配置文件");
        return ssh.putFiles([{
            local: md5file,
            remote: RESOURCE_MD5_FILE
        }, {
            local: versionfile,
            remote: THOR_VERSION_FILE
        }]);
    }).then(function(){
        console.log("上传配置文件成功！");
        console.log("修改完成！");
        ssh.dispose();
        clearFiles(md5file, versionfile);
    }).catch(function(e){
        console.error(e);
        ssh.dispose();
        clearFiles(md5file, versionfile);
    });
}

function parseOEM(file) {
    var hash = crypto.createHash("md5");
    hash.update(fs.readFileSync(file));
    return {
        name: path.parse(file).name,
        md5: hash.digest("hex")
    };
}

function clearFiles() {
    var files = [].slice.call(arguments);
    files.forEach(function(file){
        fs.unlink(file, function(){});
    });
}

function usage(){
    console.log("Usage: node bin/ssh-deploy.js [options] oem.zip");
    console.log("  Options:");
    console.log("    -h, --host     服务器地址");
    console.log("    -p, --port     ssh 端口，默认 22");
}
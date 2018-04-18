var fs = require("fs-extra");
var path = require("path");
var crypto = require("crypto");
var child_process = require("child_process");

var projectRoot = process.cwd();

// 这个需要随着 OEM 版本的增多而增加
var deployDirectories = {
    "e-vdi": "E-VDI",
    pc: "云PC",
    classCh: "云教室",
    classEn: "云教室英文",
    huipu: "惠普",
    tongfang: "清华同方",
    hwPC: "华网云",
    hwClassCh: "华网云桌面",
    fan: "圓宸桌面雲",
    japan: "日语",
    xipu: "西普",
    baode: "宝德",
    baodePC: "宝德云PC",
    wuzhou: "五舟",
	vpc: "vpc"
};

if(module === require.main) {
    main();
}

function main(){
    var deployRoot = path.join(projectRoot, "../vdi-client-release");
    var releaseVersion = getCurrentVersion(deployRoot);
    console.log("vdi-client-release 仓库当前分支：", releaseVersion);
    var zipfiles = process.argv.slice(2);
    if(zipfiles.length === 0) {
        return ;
    }
    var error = false;
    zipfiles.forEach(function(file){
        var o = path.parse(file);
        if(!/^\.zip$/i.test(o.ext)) {
            return console.error("客户端包一定是 .zip 文件。然而传递了非 .zip 文件：", file);
        }
        if(!deployDirectories.hasOwnProperty(o.name)) {
            return console.error("不能翻译：", o.name);
        }
        var targetFile = getDeployName("client-for-<version>-<date>.zip", o.name);
        var targetDir = path.join(deployRoot, deployDirectories[o.name]);
        deployClient(file, path.join(targetDir, targetFile));
    });
}

function deployClient(src, dest) {
    console.log("复制", src, "到", path.relative(projectRoot, dest));
    fs.mkdirsSync(path.dirname(dest));
    try {
        fs.copySync(src, dest);
    } catch(e) {
        console.error("复制文件报错：", e);
        return;
    }
    console.log("复制成功！");
    
    // 异步写 MD5
    generateClientMD5(fs.createReadStream(src), dest + ".md5");
}

function generateClientMD5(stream, md5file) {
    var md5 = crypto.createHash("md5");
    stream.on("data", function (chunk) {
        md5.update(chunk);
    });
    stream.on("end", function () {
        fs.writeFileSync(md5file, md5.digest("hex"));
        console.log("write file", path.relative(projectRoot, md5file), "success!");
    });
}

function getDeployName(template, version) {
    var name = template.replace("<version>", version);
    return name.replace("<date>", today());
}

function today() {
    var str = (new Date).toISOString();
    str = str.substr(0, 10);
    return str.replace(/-/g, '');
}

function getCurrentVersion(dir){
    var oldcwd = process.cwd();
    if(dir) {
        process.chdir(dir);
    }
    let proc = child_process.spawnSync("git", ["branch"], {cwd: dir || __dirname, encoding: "utf-8"});
    if(dir) {
        process.chdir(oldcwd);
    }
    
    let branches = proc.stdout.split("\n");
    let currentBranch;
    branches.forEach((b) => {
        if(/^\* /.test(b)) {
            currentBranch = b.replace("* ", "").trim();
        }
    });
    if(!currentBranch) {
        throw new Error("can't retrive current branch");
    }
    if(currentBranch.indexOf("-") > -1) {
        return current.split("-")[0];
    } else {
        return currentBranch;
    }
    
}

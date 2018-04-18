/**
 * oem.js 记录当前 oem 所有的信息以及会用到的一些图片资源
 *
 * 打包的时候，这些信息会被加入到程序里面
 */

module.exports = {
    name: "huipu",     // oem 名称
    vendor: "huipu", // 提供商英文名称
    copyright: "", // 版权信息
    website: "http://www.huipu.com/", // 提供商官网
    logo: "img/winLogo.png", // logo 的默认路径，由于 armLogo, winLogo 不统一，所以优先使用这里
    password: "hptc123", // 客户端密码
    winTitle: "惠普", // nwjs 窗口标题
    shortcutText: "惠普", // windows 端快捷方式名称
    // 不同于之前的版本，下面的图片仅仅记录图片路径，而不是 base64
    images: {
        armLogo: "img/armLogo.png", // 端 logo
        winLogo: "img/winLogo.png", // 端 logo，同方版本里，这个和 armLogo 有区别，其它版本没区别
        winIcon: "img/winIcon.png", // nwjs 窗口图标
        desktop: "img/desktop.ico"  // windows 快捷方式图标
    }
};

# new-vdi-client

从 vdi 4.4.3 后开始，vdi 客户端使用 vue 重构。这个仓库就是重构的新地址。

**注意：项目自带了很多 `README.md`，一定要看！**

**注意：项目自带了很多 `README.md`，一定要看！**

**注意：项目自带了很多 `README.md`，一定要看！**

> 至少，这两个是必看的！
* [业务说明](docs/业务说明.md)
* [调试指南](docs/调试指南.md)

## 常用命令

* `npm start <OEM>` 启动开发服务器，如果没有指定 OEM，默认使用 e-vdi
* `npm run build -- [--init] <OEM>` 打包指定的 OEM
* `npm run min -- [--init] <OEM>` 打包并压缩指定的 OEM 

`build` 是打包，不压缩代码；`min` 是打包并压缩，版本稳定后，建议使用 `min` 打包。`min` 打包后会在 `output` 目录生成 sourcemap，要处理好 sourcemap 和压缩代码的关系，确保在发生问题后能够使用 sourcemap 调试。

由于 `npm run` 命令会忽略所有 `-` 开头的额外参数，所以打包的时候一定要注意，不能使用这种方式：`npm run --init <OEM>`

## 远程调试

打包并压缩代码后，直接调试代码难以定位问题源头。项目内置了 sourcemap，可供远程调试之用。

要开启远程调试，首先需要设置 `config.json` 中 `sourceMapRoot` 选项，代码压缩时，会使用这个选项生成 sourceMappingURL（如果不明白可以参考[这里](https://npm.taobao.org/package/gulp-sourcemaps)）。 这个选项的值长这样：`"http://127.0.0.1:4560"`，你可以将里面的 `127.0.0.1`, `4560` 换成任何你希望的 IP 和端口，一般设置成自己的开发机 IP，端口自己定。注意：如果设置了自己的 IP，调试的时候，必须确保调试机可以访问自己的 IP，否则浏览器无法加载 sourcemap，自然就无法调试。

需要调试的时候，在 `output` 目录启动 HTTP 服务器即可。如果没有 HTTP 服务器，可以考虑安装 [http-server](https://npm.taobao.org/package/http-server)，`http-server` 的默认端口为 8080

打包后，output 目录内容如下：

```
output
 |- sourcemap
 |   |- 2017-12-07
 |   |   |- client.bundle.[hash].js.map
 |   |   |- initial.bundle.[hash].js.map
```
随着打包次数的增加，此目录内的文件必定增多，文件以打包日期整理，同一天多次打包，其 hash 值定然不一样，也无需担心新版本会覆盖就版本。建议将此目录内容同步到自己的云盘中，避免文件丢失；或者新建一个仓库，用于保存这些 sourcemap。

**注意：output 目录已经设置为 gitignore 了，请不要删除 `.gitignore` 中对应的行。**

## 常见问题

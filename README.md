# 微光 · Glimmer

供日常自用的浏览器工具箱，包含 JSON 格式化与结构查看、分表定位、照片裁剪和 SQL IN 条件生成。

在线入口：https://lianliankan007.github.io/IPUtils/

工具也可以通过首页地址片段直接打开：`#json`、`#sharding`、`#photo`、`#sql`。

## 使用方式

打开在线入口或本地 `index.html`，通过左侧标签切换工具。输入内容和照片在浏览器内处理，当前实现不将这些内容上传到服务器；SQL 工具只生成文本，不连接数据库或执行语句。

## 发布方式

GitHub Pages 使用 `master` 分支的根目录作为发布源。在仓库的 **Settings → Pages** 中，选择 **Deploy from a branch**、`master` 和 **/ (root)**。

项目是纯静态页面，无需安装依赖或编译。根目录的 `.nojekyll` 用于跳过 Jekyll 处理，让 HTML、CSS 和 JavaScript 按原文件发布。推送到 `master` 后，GitHub 会自动重新部署；部署状态可在仓库的 **Actions** 或 **Settings → Pages** 中查看。

首页和工具页使用相对资源路径，新增工具时也应保持这一约定，以适配 `/IPUtils/` 项目路径。

Pages 网站公开可访问。处理工具输入时不上传内容，不代表仓库和发布文件具有私有访问控制。

## 验证 SQL 转换规则

安装 Node.js 后，在项目根目录执行：

```shell
node --test tests/sql-helper.test.cjs
```

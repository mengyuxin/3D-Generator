# Depthloom

在线裸眼立体画（Autostereogram）制作与作品展示平台。

## 本地运行

```bash
npm install
npm run dev
```

- 前端：http://localhost:5173
- API：http://localhost:8787

图片裁剪、深度图转换和立体画生成均在浏览器本地完成。只有用户保留公开展示勾选，并在确认窗口中点击发布后，最终成品才会上传。

## 验证

```bash
npm test
npm run build
```

公开作品元数据保存在 `server/data/works.json`，作品文件保存在 `server/uploads/`。当前存储方案适合本地演示和单机部署；正式上线时应替换为数据库、对象存储、图片缩略图服务及内容审核服务。

## 线上环境

生产站点：[https://myx-3d.netlify.app](https://myx-3d.netlify.app)

Netlify 环境使用 Functions 提供 `/api` 接口，并使用站点级 Netlify Blobs
持久保存作品元数据、高清图片和缩略图。本地开发仍使用 Express 和本地文件存储。

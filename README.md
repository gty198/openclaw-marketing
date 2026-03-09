# 龙虾运行数据面板

这是一个纯静态的运营数据面板，适合直接部署到 GitHub Pages。

## 目录结构

- `index.html`: 页面骨架
- `styles.css`: 视觉样式
- `app.js`: 前端渲染逻辑
- `data/lobster-metrics.json`: 示例数据源
- `.github/workflows/deploy.yml`: GitHub Pages 自动发布

## 本地预览

直接双击 `index.html` 无法读取本地 JSON，建议用静态服务器：

```bash
python3 -m http.server 4173
```

然后访问 `http://localhost:4173/`。

## GitHub Pages 发布

仓库已经带好 Actions 工作流，推送到 `main` 会自动发布。

首次启用时需要在 GitHub 仓库设置里确认：

1. 打开 `Settings > Pages`
2. `Source` 选择 `GitHub Actions`
3. 推送 `main` 分支

## 替换成真实数据

当前页面默认读取 `data/lobster-metrics.json`。接入真实数据时有两种常见方式：

1. 用 CI 定时生成这个 JSON 文件并提交到仓库
2. 把 `app.js` 里的数据地址改成你的只读 API

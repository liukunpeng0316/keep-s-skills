# keep的skills库

公开的个人 Skills 展示页。每项提供「复制链接」和「下载」，上传由仓库所有者在 GitHub 后台完成。所有源码和 Skills 放在同一个仓库；发布时自动生成列表及独立 ZIP 包。

## 本地查看

直接双击根目录的 `index.html` 可以查看空页面。

添加 Skills 后，在本目录运行（需要 Node.js 22 或更高版本）：

```sh
npm ci
npm run build
npm run preview
```

浏览器访问 http://127.0.0.1:4173 。也可以双击生成的 `dist/index.html`。修改内容后重新运行构建命令。

## 添加 Skill

支持直接把 ZIP 上传到 `skills/`，也支持独立文件夹。ZIP 内的 `SKILL.md` 可以在根目录，也可以在包内的单个 Skill 文件夹里。每个 ZIP 对应一个 Skill；名称和简介自动读取，下载保留原始 ZIP。复制链接指向仓库中的 ZIP 文件。

文件夹方式应具有 `SKILL.md`：

```text
skills/
  my-skill/
    SKILL.md
    scripts/
    templates/
```

`SKILL.md` 示例：

```markdown
---
name: 我的 Skill
description: 简短介绍这个 Skill 的用途。
---

# 我的 Skill

这里写具体使用说明。
```

支持多行 YAML description。不带元信息时以文件夹名称展示。请仅放入要公开的文件；打包会保留 Skill 文件夹内的全部普通文件，包括配套脚本和模板。符号链接会被拒绝。

## 发布到 GitHub Pages

1. 创建公开仓库，将本项目文件推送到 `main` 分支，包含 `.github` 和 `package-lock.json`，不要上传 `node_modules`、`work` 或 `dist`。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Actions → Publish skills library → Run workflow** 启动首次发布。后续提交到 `main` 会自动更新。
4. 等任务成功，访问 Settings → Pages 给出的网站地址。

发布流程自动读取当前仓库名和分支，不需要填写或在网页存储 Token。GitHub 内置的临时授权用于 Pages 发布。

在 GitHub 仓库中打开 `skills/`，选择 Add file → Upload files。请把 ZIP 压缩包或含有 SKILL.md 的整个 Skill 文件夹拖入页面，再提交到 main。需要登录有仓库写入权限的账号。上传后需等待 Actions 发布完成，再刷新网站。

「复制链接」复制 GitHub Skill 文件夹或 ZIP 文件地址，不保证所有 AI 工具都可以一键安装。「下载」下载完整 ZIP。删除 Skill 文件夹并提交后，下一次发布会同步移除它。

本地预览要启用真实仓库链接时，修改 `site.config.json` 的 `repository` 为 `用户名/仓库名` 后重新构建。尚未设置时，复制显示未配置提示，不产生虚假链接。工作流默认监听 main；如果改用其他分支，请同步修改工作流。

GitHub 官方说明：https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

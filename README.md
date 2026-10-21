# GamePeng 试玩成品

本仓库只保存经核验的公开浏览器运行文件，不是游戏开发源码仓库。源码、Issue 和改版继续在各自私有产品仓库维护。浏览器脚本与运行资源本身可被访问者下载。

Pages 绑定 `main` 分支的 `/docs` 目录。每款游戏的 `release.json` 与 `docs/catalog.json` 记录源码仓库、提交、版本、运行 ZIP 和每个运行文件 SHA-256。仅导出采用的运行成员，不上传源码包、测试、开发配置、参考原作或私人素材。

试玩入口：https://idoku.github.io/gamepeng-playground/

- 霓虹冰球 0.6.0：https://idoku.github.io/gamepeng-playground/neon-hockey/
- 霓虹连线 1.2.0：https://idoku.github.io/gamepeng-playground/neon-flow-connect/
- 霓虹圈地 0.1.1：https://idoku.github.io/gamepeng-playground/neon-gridlock/

## 更新与回退

先在各自私有仓库完成开发、提交、推送和验收，再通过 FP 上传明确版本的运行包。此处只接收分发成品，不在此修游戏。成品提交和 Pages 部署成功分别核验。回退通过正常新提交恢复已验证版本，不改写历史。

这次是三款试玩试点，尚未建立跨仓库自动同步；不能把修改源码或推送源码视为自动更新试玩站。

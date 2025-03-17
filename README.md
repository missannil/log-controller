# log-controller

这是一个 VS Code 插件，用于管理控制台日志注释。

## 支持的语言

“JavaScript”、“TypeScript”、“Python”

## 功能

- 使用快捷键 `Ctrl+R Ctrl+E` 或 `Cmd+R Cmd+E` 注释或解除注释。
- 使用快捷键 `Ctrl+R Ctrl+A` 或 `Cmd+R Cmd+A` 添加注释。
- 使用快捷键 `Ctrl+R Ctrl+R` 或 `Cmd+R Cmd+R` 删除当前文件最大索引的日志。
- 使用快捷键 `Ctrl+R Ctrl+R` 或 `Cmd+R Cmd+F` 删除当前文件所有添加的日志。

## 安装

1. 克隆此仓库到本地：
   ```sh
   git clone https://github.com/missannil/log-controller.git
   ```
2. 进入项目目录：
   ```sh
   cd log-controller
   ```
3. 安装依赖：
   ```sh
   npm install
   ```

## 使用

1. 打开 VS Code，按 `F5` 启动插件。
2. 使用以下快捷键管理日志注释：
   - `Ctrl+R Ctrl+E` 或 `Cmd+R Cmd+E`：注释或解除注释 `console.log` 或 `print` 语句。
   - `Ctrl+R Ctrl+A` 或 `Cmd+R Ctrl+A`：添加 `console.log` 注释。
   - `Ctrl+R Ctrl+R` 或 `Cmd+R Cmd+R`：删除 `console.log` 注释。
3. 通过命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）运行以下命令：
   - `logController.toggleComments`：注释或解除注释日志。
   - `logController.addLog`：添加日志。
   - `logController.removeLog`：删除最后一个添加的日志。
   - `logController.removeAllLogs`：删除所有添加的日志。


## 贡献

欢迎提交问题和拉取请求来改进此项目。

## 许可证

此项目使用 [MIT 许可证](LICENSE)。
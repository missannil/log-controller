import * as os from "os";
import * as vscode from "vscode";
type FsPath = string;
type LineNumber = number;
type LogEntry = { lineNumber: LineNumber, logIndex: number };
type LogInfo = Record<FsPath, Set<LogEntry>>;

class LogController {
  private commentedFiles: Set<FsPath> = new Set();
  private logInfo: LogInfo = {};

  public init(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.commands.registerCommand("logController.toggleComments", this.toggleComments, this),
      vscode.commands.registerCommand("logController.addLog", this.addLog, this),
      vscode.commands.registerCommand("logController.removeLog", this.removeLog, this),
      vscode.commands.registerCommand("logController.removeAllLogs", this.removeAllLogs, this), // 注册新命令
      vscode.workspace.onDidCloseTextDocument(this.onDidCloseTextDocument, this), // 监听文件关闭事件
      vscode.workspace.onDidOpenTextDocument(this.onDidOpenTextDocument, this), // 监听文件打开事件
      vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this) // 监听文件内容变化事件
    );

    // 初始化时扫描已打开的文档
    vscode.workspace.textDocuments.forEach(this.onDidOpenTextDocument, this);
  }

  /**
   * 处理文件关闭事件，清除相应的logInfo记录
   */
  private onDidCloseTextDocument(document: vscode.TextDocument): void {
    const fsPath = document.uri.fsPath;
    if (this.logInfo[fsPath]) {
      delete this.logInfo[fsPath];
    }
    if (this.commentedFiles.has(fsPath)) {
      this.commentedFiles.delete(fsPath);
    }
  }

  /**
   * 处理文件打开事件，扫描并记录打印行
   */
  private onDidOpenTextDocument(document: vscode.TextDocument): void {
    this.updateLogInfo(document);
  }

  /**
   * 处理文件内容变化事件，刷新logInfo记录
   */
  private onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent): void {
    this.updateLogInfo(event.document);
  }

  /**
   * 更新logInfo记录
   */
  private updateLogInfo(document: vscode.TextDocument): void {
    const fsPath = document.uri.fsPath;
    const languageId = document.languageId;
    const supportedLanguages = ["javascript", "typescript", "python"];

    if (!supportedLanguages.includes(languageId)) {
      return;
    }

    if (!this.logInfo[fsPath]) {
      this.logInfo[fsPath] = new Set();
    } else {
      this.logInfo[fsPath].clear();
    }

    const logLines = this.logInfo[fsPath];
    const text = document.getText();
    const lines = text.split("\n");

    lines.forEach((line, index) => {
      const lineText = line.trim();
      const isConsoleLog = languageId !== "python" && (/^console\.log\("hry \d+"/.test(lineText) || /^\/\/console\.log\("hry \d+"/.test(lineText));
      const isPrint = languageId === "python" && (/^print\("hry \d+"/.test(lineText) || /^#print\("hry \d+"/.test(lineText));

      if (isConsoleLog || isPrint) {
        const match = lineText.match(/hry (\d+)/);
        if (match) {
          const logIndex = parseInt(match[1], 10);
          logLines.add({ lineNumber: index, logIndex });
        }
      }
    });

    // 按照 logIndex 大小排序
    this.logInfo[fsPath] = new Set(Array.from(logLines).sort((a, b) => a.logIndex - b.logIndex));
  }

  /**
   * 删除当前文件最后一个添加的log的整行,光标回到上一行的最后
   */
  private async removeLog(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    const fsPath = document.uri.fsPath;
    const languageId = document.languageId;

    const logLines = this.logInfo[fsPath];
    if (!logLines || logLines.size === 0) {
      return;
    }
    const lastLog = Array.from(logLines).pop()!;
    const edit = new vscode.WorkspaceEdit();
    const line = document.lineAt(lastLog.lineNumber);
    const lineRange = line.rangeIncludingLineBreak; // 包含换行符的整行范围
    edit.delete(document.uri, lineRange);
    await vscode.workspace.applyEdit(edit);
    logLines.delete(lastLog);

    // 设置光标位置到上一行的最后
    const previousLine = lastLog.lineNumber - 1;
    if (previousLine >= 0) {
      const previousLineText = document.lineAt(previousLine).text;
      const newPosition = new vscode.Position(previousLine, previousLineText.length);
      editor.selection = new vscode.Selection(newPosition, newPosition);
    }
  }

  /**
   * 删除所有通过addLog添加的console.log或print整行
   */
  private async removeAllLogs(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    const fsPath = document.uri.fsPath;
    const languageId = document.languageId;

    const logLines = this.logInfo[fsPath];
    if (!logLines || logLines.size === 0) {
      return;
    }

    const edit = new vscode.WorkspaceEdit();
    const linesToDelete = Array.from(logLines).sort((a, b) => b.logIndex - a.logIndex); // 按照索引号从大到小排序

    for (const logEntry of linesToDelete) {
      const line = document.lineAt(logEntry.lineNumber);
      const lineText = line.text.trim();
      const isConsoleLog = languageId !== "python" && (/^console\.log\("hry \d+",/.test(lineText) || /^\/\/console\.log\("hry \d+",/.test(lineText));
      const isPrint = languageId === "python" && (/^print\("hry \d+",/.test(lineText) || /^#print\("hry \d+",/.test(lineText));

      if (isConsoleLog || isPrint) {
        const lineRange = line.rangeIncludingLineBreak; // 包含换行符的整行范围
        edit.delete(document.uri, lineRange);
        logLines.delete(logEntry);
      }
    }

    await vscode.workspace.applyEdit(edit);
  }

  /**
   * 添加log
   * 在光标位置
   * 如果光标所在的行内容为空,则在光标所在行添加`console.log("hry index" ,`或`print("hry index" ,`，否则下一行加入空行再添加,但要加上上一行的缩进
   * 添加`console.log("hry index" ,`或`print("hry index" ,`，故意没有闭合,方便copilot补全。index是当前文件已经添加的log数量+1并记录到logInfo中
   */
  private async addLog(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    const selection = editor.selection;
    const languageId = document.languageId;

    const cursorPosition = selection.active;
    const cursorLine = cursorPosition.line;
    const fsPath = document.uri.fsPath;
    if (!this.logInfo[fsPath]) {
      this.logInfo[fsPath] = new Set();
    }
    const logLines = this.logInfo[fsPath];
    const edit = new vscode.WorkspaceEdit();
    const cursorLineText = document.lineAt(cursorLine).text;
    const lineRange = document.lineAt(cursorLine).range;
    let newPosition: vscode.Position;

    // 计算新的 log 索引
    const maxLogIndex = Array.from(logLines).reduce((max, logEntry) => {
      return Math.max(max, logEntry.logIndex);
    }, 0);
    const newLogIndex = maxLogIndex + 1;

    const logStatement = languageId === "python" ? `print("hry ${newLogIndex}",` : `console.log("hry ${newLogIndex}",`;
    if (cursorLineText.trim() === "") {
      // 从光标所在位置后面开始插入
      edit.insert(document.uri, lineRange.end, logStatement);
      newPosition = lineRange.end.translate(0, logStatement.length);
    }
    else {
      // 在下一行增加新行，然后插入,并且保持缩进(取当前行的缩进),插入后光标在插入行的最后
      const indent = cursorLineText.match(/^\s*/)![0];
      const nextLine = cursorLine + 1;
      const nextLinePosition = new vscode.Position(nextLine, 0);
      edit.insert(document.uri, nextLinePosition, `${indent}${logStatement}${os.EOL}`);
      newPosition = new vscode.Position(nextLine, indent.length + logStatement.length);
    }
    await vscode.workspace.applyEdit(edit);
    // 设置光标位置到插入行的最后
    editor.selection = new vscode.Selection(newPosition, newPosition);
    logLines.add({ lineNumber: cursorLine + 1, logIndex: newLogIndex });
  }

  private async toggleComments(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const document = editor.document;
    const languageId = document.languageId;
    const supportedLanguages = ["javascript", "typescript", "python"];

    // 只针对 JavaScript, TypeScript 和 Python 文件
    if (!supportedLanguages.includes(languageId)) { return; }
    const filePath = document.uri.fsPath;
    const isCommented = this.commentedFiles.has(filePath);

    const edit = new vscode.WorkspaceEdit();
    const text = document.getText();
    const lines = text.split("\n");

    lines.forEach((line, index) => {
      const lineRange = document.lineAt(index).range;
      if (isCommented) {
        // 取消注释
        if (languageId === "python" && line.trim().startsWith("#print")) {
          const uncommentedLine = line.replace("#print", "print");
          edit.replace(document.uri, lineRange, uncommentedLine);
        } else if ((languageId === "javascript" || languageId === "typescript") && line.trim().startsWith("//console")) {
          const uncommentedLine = line.replace("//console", "console");
          edit.replace(document.uri, lineRange, uncommentedLine);
        }
      } else {
        // 添加注释
        if (languageId === "python" && line.trim().startsWith("print")) {
          const commentedLine = line.replace("print", "#print");
          edit.replace(document.uri, lineRange, commentedLine);
        } else if ((languageId === "javascript" || languageId === "typescript") && line.trim().startsWith("console")) {
          const commentedLine = line.replace("console", "//console");
          edit.replace(document.uri, lineRange, commentedLine);
        }
      }
    });

    await vscode.workspace.applyEdit(edit);

    if (isCommented) {
      this.commentedFiles.delete(filePath);
    } else {
      this.commentedFiles.add(filePath);
    }
  }
}

export const logController = new LogController();

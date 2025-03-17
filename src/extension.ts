// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { logController } from './logController';
// import { runTests } from './test/testRunner';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	logController.init(context);
	console.log('"log-controller" 插件已激活');
	// 调用测试函数
	// runTests();
}

// This method is called when your extension is deactivated
export function deactivate() { }

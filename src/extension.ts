import * as vscode from 'vscode';

import { genConstructor } from './genConstructor';
import { genInterfaceStub } from './genInterfaceStub';
import { genGetterSetter } from './genGetterSetter';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('go.sourceAction.accessor', genGetterSetter));
	context.subscriptions.push(vscode.commands.registerCommand('go.sourceAction.constructor', genConstructor));
	context.subscriptions.push(vscode.commands.registerCommand('go.sourceAction.interfaceStub', genInterfaceStub));
}

// This method is called when your extension is deactivated
export function deactivate() { }

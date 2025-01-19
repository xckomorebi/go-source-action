import * as vscode from 'vscode';

import { genConstructor } from './genConstructor';
import { genInterfaceStub } from './genInterfaceStub';
import { genGetterSetter } from './genGetterSetter';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('go-source-action.getter-and-setter', genGetterSetter));
	context.subscriptions.push(vscode.commands.registerCommand('go-source-action.constructor', genConstructor));
	context.subscriptions.push(vscode.commands.registerCommand('go-source-action.interface-stub', genInterfaceStub));
}

// This method is called when your extension is deactivated
export function deactivate() { }

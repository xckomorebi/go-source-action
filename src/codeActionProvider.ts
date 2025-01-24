import * as vscode from "vscode";

export const golangCodeActionProvider = {
    provideCodeActions(): vscode.ProviderResult<vscode.CodeAction[]> {
        return [
            {
                title: 'Generate getter and setter',
                kind: vscode.CodeActionKind.Source,
                command: { command: 'go.sourceAction.accessor', title: 'Generate getter and setter' },
            },
            {
                title: 'Generate constructor',
                kind: vscode.CodeActionKind.Source,
                command: { command: 'go.sourceAction.constructor', title: 'Generate constructor' },
            },
            {
                title: 'Generate string method',
                kind: vscode.CodeActionKind.Source,
                command: { command: 'go.sourceAction.stringer', title: 'Generate string method' },
            },
            {
                title: 'Generate interface stub',
                kind: vscode.CodeActionKind.Source,
                command: { command: 'go.sourceAction.interfaceStub', title: 'Generate interface stub' },
            },
        ];
    }
};
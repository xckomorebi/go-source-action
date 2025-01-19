import path from 'path';
import fs from 'fs';
import cp from 'child_process';

import { window } from 'vscode';
import { getStructInfo } from './goStruct';

export const genInterfaceStub = async () => {
    const editor = window.activeTextEditor;
    if (!editor) {
        window.showErrorMessage('No active editor found.');
        return;
    }
    const structInfo = await getStructInfo(editor, true);

    if (!structInfo) {
        window.showErrorMessage('No struct found.');
        return;
    }

    let insertPosLine = editor.selection.end.line;
    if (structInfo.start <= insertPosLine && insertPosLine < structInfo.end) {
        insertPosLine = structInfo.end;
    }
    const insertPos = editor.document.lineAt(insertPosLine).range.end;

    window.showInputBox({
        placeHolder: 'io.Closer',
        prompt: 'Enter interface to implement.'
    }).then((value) => {
        if (!value) {
            window.showErrorMessage('No interface found.');
            return;
        }

        const args = [`${structInfo.receiverName} *${structInfo.structName}`, value];

        const gopath = process.env['GOPATH'];
        if (!gopath) {
            window.showErrorMessage('Cannot find GOPATH.');
            return;
        }

        const implBinPath = path.join(gopath, 'bin', getBinName('impl'));
        if (!fs.existsSync(implBinPath)) {
            window.showErrorMessage('Cannot find impl. Please install it by running `go get -u github.com/josharian/impl`');
            return;
        }

        const p = cp.execFile(
            implBinPath,
            args,
            { cwd: path.dirname(editor.document.fileName) },
            (err, stdout, stderr) => {
                if (err && (<any>err).code === 'ENOENT') {
                    window.showErrorMessage('Cannot find impl. Please install it by running `go get -u github.com/josharian/impl`');
                    return;
                }

                if (err) {
                    window.showErrorMessage(`Cannot stub interface: ${stderr}`);
                    return;
                }
                editor.edit((editBuilder) => {
                    editBuilder.insert(insertPos, '\n');
                    editBuilder.insert(insertPos, stdout);
                });
            }
        );
        if (p.pid) {
            p.stdin?.end();
        }
    });
};

const getBinName = (binName: string): string => {
    return process.platform === 'win32' ? `${binName}.exe` : binName;
};
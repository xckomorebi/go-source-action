import * as assert from 'assert';
import * as vscode from 'vscode';

import { getStructInfo } from '../goStruct';


const openEditorWithContent = async (content: string) => {
    const document = await vscode.workspace.openTextDocument({
        content: content
    });
    await vscode.window.showTextDocument(document);
};

suite('Parse Struct Test Suite', () => {
    test('parse basic struct', async () => {
        await openEditorWithContent(`package main
    type Test struct {
        a int
        b string
        c float64
    }`);

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            assert.fail('No active editor found.');
        }
        const structInfo = await getStructInfo(editor);
        if (!structInfo) {
            assert.fail('No struct found.');
        }

        const { structName: name, start: start, end: end } = structInfo;
        assert.deepEqual(
            [name, start, end],
            ['Test', 1, 5]
        );
    });

    test('parse basic struct no field', async () => {
        await openEditorWithContent(`package main

type Test struct{}`);

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            assert.fail('No active editor found.');
        }
        const structInfo = await getStructInfo(editor);
        assert.equal(structInfo, undefined);

        const structInfo2 = await getStructInfo(editor, true);
        if (!structInfo2) {
            assert.fail('No struct found.');
        }
    });
});

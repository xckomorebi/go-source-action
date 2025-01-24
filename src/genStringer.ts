import { window } from 'vscode';
import { getStructInfo } from './goStruct';
import { StringBuilder } from './stringBuilder';

export const genStringer = async () => {
    const editor = window.activeTextEditor;
    if (!editor) {
        window.showErrorMessage('No active editor found.');
        return;
    }
    const structInfo = await getStructInfo(editor);

    if (!structInfo) {
        return;
    }

    structInfo.parseFields(editor);

    let insertPosLine = editor.selection.end.line;
    if (structInfo.start <= insertPosLine && insertPosLine < structInfo.end) {
        insertPosLine = structInfo.end;
    }
    const insertPos = editor.document.lineAt(insertPosLine).range.end;

    window.showQuickPick(
        structInfo.fieldsName.map((fieldName) => {
            return {
                label: fieldName,
                description: structInfo.fields.get(fieldName),
                picked: true
            };
        }),
        {
            placeHolder: 'Select fields to initialize.',
            canPickMany: true
        }
    ).then((selectedFields) => {
        if (!selectedFields || selectedFields.length === 0) {
            return;
        }

        const sb = new StringBuilder();
        sb.appendLine(`\nfunc (${structInfo.receiverName} ${structInfo.structName}) String() string {`);
        sb.append(`    return fmt.Sprintf(\"${structInfo.structName} {`);

        sb.append(selectedFields.map((field) => `${field.label}: %v`).join(', '));
        sb.append("}\"");
        selectedFields.forEach((field) => {
            sb.append(`, ${structInfo.receiverName}.${field.label}`);
        });
        sb.appendLine(")");
        sb.appendLine("}");

        editor.edit((editBuilder) => {
            editBuilder.insert(insertPos, sb.toString());
        });
    });

};
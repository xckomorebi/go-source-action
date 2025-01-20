import { window } from 'vscode';
import { getStructInfo } from './goStruct';
import { StringBuilder } from './stringBuilder';

export const genConstructor = async () => {
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
        const sb = new StringBuilder();
        if (!selectedFields || selectedFields.length === 0) {
            sb.appendLine(`\nfunc New${structInfo.structName}() *${structInfo.structName} {`);
            sb.appendLine(`    return &${structInfo.structName}{}`);
            sb.appendLine('}');
        } else {
            sb.append(`\nfunc New${structInfo.structName}(`);

            let longestFieldLength = 0;
            for (let i = 0; i < selectedFields.length; i++) {
                const fieldName = selectedFields[i].label;
                if (fieldName.length > longestFieldLength) {
                    longestFieldLength = fieldName.length;
                }
                sb.append(`${fieldName} `);
                sb.append(`${structInfo.fields.get(fieldName)}`);
                if (i < selectedFields.length - 1) {
                    sb.append(', ');
                }
            }

            sb.appendLine(`) *${structInfo.structName} {`);

            sb.appendLine(`    return &${structInfo.structName}{`);
            for (const field of selectedFields) {
                const fieldName = field.label;
                sb.append(`        ${fieldName}: `);
                sb.append(' '.repeat(longestFieldLength - fieldName.length));
                sb.appendLine(`${fieldName},`);
            }
            sb.appendLine('    }');
            sb.appendLine('}');
        }


        editor.edit((editBuilder) => {
            editBuilder.insert(insertPos, sb.toString());
        });
    });

};
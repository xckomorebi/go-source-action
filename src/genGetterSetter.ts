import { window, workspace } from 'vscode';
import { getStructInfo } from './goStruct';
import { StringBuilder } from './util';


export const genGetterSetter = async () => {
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
        structInfo.fieldsName,
        {
            placeHolder: 'Select fields to generate getter and setter.',
            canPickMany: true
        }
    ).then((selectedFields) => {
        if (!selectedFields || selectedFields.length === 0) {
            return;
        }

        const nilProtection = workspace.getConfiguration('go.sourceAction.accessor').get('nilProtection', true);

        const sb = new StringBuilder();
        for (const field of selectedFields) {
            const structName = structInfo.structName;
            const receiver = structInfo.receiverName;
            const fieldType = structInfo.fields.get(field) || '<unknown>';

            appendGetter(sb, receiver, structName, field, fieldType, nilProtection);
            appendSetter(sb, receiver, structName, field, fieldType, nilProtection);
        }
        editor.edit(editBuilder => {
            editBuilder.insert(insertPos, sb.toString());
        });

    });
};

const appendGetter = (
    sb: StringBuilder,
    receiver: string,
    structName: string,
    field: string,
    fieldType: string,
    nilProection: boolean
) => {
    const fieldToCap = field.charAt(0).toUpperCase() + field.slice(1);
    if (!nilProection) {
        sb.appendLine();
        sb.appendLine(`func (${receiver} *${structName}) Get${fieldToCap}() ${fieldType} {`);
        sb.appendLine(`    return ${receiver}.${field}`);
        sb.appendLine('}');
        return;
    }

    const [defaultValue, isTypeResolved] = getDefaultValue(fieldType);
    if (!isTypeResolved) {
        sb.appendLine();
        sb.appendLine(`// TODO: default value for ${fieldType} is not resolved.`);
        sb.appendLine(`func (${receiver} *${structName}) Get${fieldToCap}() ${fieldType} {`);
        sb.appendLine(`    var ret ${fieldType}`);
        sb.appendLine(`    if ${receiver} != nil {`);
        sb.appendLine(`        ret = ${receiver}.${field}`);
        sb.appendLine('    }');
        sb.appendLine(`    return ret`);
        sb.appendLine('}');
        return;
    }

    sb.appendLine();
    sb.appendLine(`func (${receiver} *${structName}) Get${fieldToCap}() ${fieldType} {`);
    sb.appendLine(`    if ${receiver} != nil {`);
    sb.appendLine(`        return ${receiver}.${field}`);
    sb.appendLine('    }');
    sb.appendLine(`    return ${defaultValue}`);
    sb.appendLine('}');

};

const appendSetter = (
    sb: StringBuilder,
    receiver: string,
    structName: string,
    field: string,
    fieldType: string,
    nilProtection: boolean
) => {
    const fieldToCap = field.charAt(0).toUpperCase() + field.slice(1);
    sb.appendLine();
    sb.appendLine(`func (${receiver} *${structName}) Set${fieldToCap}(${field} ${fieldType}) {`);
    if (!nilProtection) {
        sb.appendLine(`    ${receiver}.${field} = ${field}`);
        sb.appendLine('}');
        return;
    }

    sb.appendLine(`    if ${receiver} != nil {`);
    sb.appendLine(`        ${receiver}.${field} = ${field}`);
    sb.appendLine('    }');
    sb.appendLine('}');
};

function getDefaultValue(type?: string): [string, boolean] {
    if (!type) {
        return ['nil', true];
    }
    if (numericTypes.has(type)) {
        return ['0', true];
    }
    if (type === 'string') {
        return ['""', true];
    }
    if (type === 'bool') {
        return ['false', true];
    }
    if (isReferenceType(type)) {
        return ['nil', true];
    }
    return ['', false];
}

const numericTypes = new Set([
    'int', 'int8', 'int16', 'int32', 'int64',
    'uint', 'uint8', 'uint16', 'uint32', 'uint64',
    'float32', 'float64',
]);

const isReferenceType = (type: string): boolean => {
    if (type.startsWith('*')) {
        return true;
    }
    if (type.startsWith('[]')) {
        return true;
    }
    if (type.startsWith('map[')) {
        return true;
    }
    return false;
};
import { window, workspace } from 'vscode';
import { TextEditor } from 'vscode';
import { getStructInfo } from './goStruct';
import { StringBuilder } from './stringBuilder';

const getterRegex = /^func \(\w+\s+\*?(\w+)\)\s+Get(\w+)\(.*\)/;
const setterRegex = /^func \(\w+\s+\*?(\w+)\)\s+Set(\w+)\(.*\)/;

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

    const [getterSet, setterSet] = parseStructMethodInfo(editor, structInfo.structName);

    window.showQuickPick(
        structInfo.fieldsName.
            map((fieldName) => {
                const hasGetter = getterSet.has(toCaptial(fieldName));
                const hasSetter = setterSet.has(toCaptial(fieldName));
                const detail = hasGetter ? '⚠️ getter exist' : hasSetter ? '⚠️ setter exist' : '';

                return {
                    label: fieldName,
                    description: structInfo.fields.get(fieldName),
                    picked: true,
                    hasGetter: hasGetter,
                    hasSetter: hasSetter,
                    detail: detail
                };
            }).
            filter((field) => !field.hasGetter || !field.hasSetter),
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
            const fieldName = field.label;
            const structName = structInfo.structName;
            const receiver = structInfo.receiverName;
            const fieldType = structInfo.fields.get(fieldName) || '<unknown>';

            if (!field.hasGetter) {
                appendGetter(sb, receiver, structName, fieldName, fieldType, nilProtection);
            }
            if (!field.hasSetter) {
                appendSetter(sb, receiver, structName, fieldName, fieldType, nilProtection);
            }
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

    const cfgValue = getDefaultValueFromCfg(type);
    if (cfgValue) {
        return [cfgValue, true];
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

const getDefaultValueFromCfg = (type: string): string | undefined => {
    const cfg = workspace.getConfiguration('go.sourceAction.accessor.defaultValueForType');
    return cfg.get(type);
};

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

const parseStructMethodInfo = (editor: TextEditor, structName: string): [Set<string>, Set<string>] => {
    const getterSet = new Set<string>();
    const setterSet = new Set<string>();

    for (let i = 0; i < editor.document.lineCount; i++) {
        let line = editor.document.lineAt(i).text;
        line = line.split("//")[0].trim();

        let getterMatch = getterRegex.exec(line);
        if (getterMatch && getterMatch[1] === structName) {
            getterSet.add(getterMatch[2]);
        }

        let setterMatch = setterRegex.exec(line);
        if (setterMatch && setterMatch[1] === structName) {
            setterSet.add(setterMatch[2]);
            continue;
        }
    }

    return [getterSet, setterSet];
};

const toCaptial = (s: string): string => {
    return s.charAt(0).toUpperCase() + s.slice(1);
};
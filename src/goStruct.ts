import { window } from 'vscode';
import { TextEditor } from 'vscode';
import { QuickPickItem } from 'vscode';

const structRegex = /^type\s+(\w+)\s+struct\s*{/;
// fieldName fieldType `tag`
const fieldRegex = /^\s*(?<fieldName>\w+)\s+(?<fieldType>((<-chan|chan<-|chan)\s+)?[\{\}\*\[\]\w+_\.]+)(\s+`[\w\s,_":]+`)?/;

export const getStructInfo = async (editor: TextEditor, noFields?: boolean): Promise<StructInfo | undefined> => {
    const structInfoArray: StructInfo[] = [];

    let i = 0;
    while (i < editor.document.lineCount) {
        let line = editor.document.lineAt(i).text;
        line = line.split("//")[0].trim();

        const match = structRegex.exec(line);
        if (match) {
            if (line.endsWith('}')) {
                if (noFields) {
                    structInfoArray.push(new StructInfo(match[1], i, i));
                }
                i++;
                continue;
            }
            const structName = match[1];
            const start = i;
            let end = i;
            let j = i + 1;
            while (j < editor.document.lineCount) {
                line = editor.document.lineAt(j).text;
                line = line.split("//")[0].trim();
                if (line === '}') {
                    end = j;
                    break;
                }
                j++;
            }
            const structInfo = new StructInfo(structName, start, end);
            structInfoArray.push(structInfo);
            i = j + 1;
        }
        i++;
    }

    if (structInfoArray.length === 0) {
        window.showErrorMessage('No struct found.');
        return undefined;
    }

    if (structInfoArray.length === 1) {
        return structInfoArray[0];
    }

    return await window.showQuickPick(
        structInfoArray,
        {
            placeHolder: 'Select a struct.',
        }
    );
};

class StructInfo implements QuickPickItem {
    structName: string;
    receiverName: string;
    label: string;
    start: number;
    end: number;
    fields: Map<string, string>;
    fieldsName: string[];

    constructor(structName: string, start: number, end: number) {
        this.structName = structName;
        this.receiverName = structName[0].toLowerCase();
        this.label = structName;
        this.start = start;
        this.end = end;
        this.fields = new Map<string, string>();
        this.fieldsName = [];
    }

    parseFields = (editor: TextEditor) => {
        for (let i = this.start + 1; i < this.end; i++) {
            let line = editor.document.lineAt(i).text;

            line = line.split("//")[0].trim();

            if (!line) {
                continue;
            }

            if (line.startsWith('}')) {
                break;
            }

            const parts = fieldRegex.exec(line);
            if (!parts || !parts.groups) {
                continue;
            }

            const { fieldName: fieldName, fieldType: fieldType } = parts.groups;
            if (!fieldName || !fieldType) {
                continue;
            }

            this.fields.set(fieldName, fieldType);
            this.fieldsName.push(fieldName);
        };
    };
}
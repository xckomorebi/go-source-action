export class StringBuilder {
    private lines: string[] = [];

    append(line: string): void {
        this.lines.push(line);
    }

    appendLine(line?: string): void {
        if (!line) {
            this.lines.push("\n");
            return;
        }
        this.lines.push(line + "\n");
    }

    toString(): string {
        return this.lines.join("");
    }
}
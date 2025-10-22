import { ParsedCode, CodeFunction, DataStructure, CodeComment } from '../types';

export class CodeParser {
  parseFile(content: string, fileType: 'COBOL' | 'VB.NET' | 'C#'): ParsedCode {
    switch (fileType) {
      case 'COBOL':
        return this.parseCobol(content);
      case 'VB.NET':
        return this.parseVBNet(content);
      case 'C#':
        return this.parseCSharp(content);
      default:
        return { functions: [], dataStructures: [], dependencies: [], comments: [] };
    }
  }

  private parseCobol(content: string): ParsedCode {
    const functions: CodeFunction[] = [];
    const dataStructures: DataStructure[] = [];
    const dependencies: string[] = [];
    const comments: CodeComment[] = [];

    const lines = content.split('\n');

    // Parse COBOL sections and paragraphs
    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Comments (asterisk in column 7)
      if (line.trim().startsWith('*')) {
        comments.push({
          line: lineNum,
          text: line.substring(7).trim(),
          type: 'single-line',
        });
      }

      // CALL statements
      const callMatch = line.match(/CALL\s+['"]([^'"]+)['"]/i);
      if (callMatch) {
        dependencies.push(callMatch[1]);
      }

      // COPY statements
      const copyMatch = line.match(/COPY\s+([^\s.]+)/i);
      if (copyMatch) {
        dependencies.push(copyMatch[1]);
      }

      // Section/Paragraph definitions
      const sectionMatch = line.match(/^\s*([A-Z0-9-]+)\s+SECTION\./i);
      if (sectionMatch) {
        functions.push({
          name: sectionMatch[1],
          startLine: lineNum,
          endLine: lineNum, // Will be updated when we find the next section
          calls: [],
        });
      }

      const paragraphMatch = line.match(/^\s*([A-Z0-9-]+)\./i);
      if (paragraphMatch && !sectionMatch) {
        functions.push({
          name: paragraphMatch[1],
          startLine: lineNum,
          endLine: lineNum,
          calls: [],
        });
      }

      // Data structures (01 level)
      const dataMatch = line.match(/^\s*01\s+([A-Z0-9-]+)/i);
      if (dataMatch) {
        dataStructures.push({
          name: dataMatch[1],
          type: 'RECORD',
        });
      }
    });

    // Find CALL statements for each function
    functions.forEach(func => {
      const functionLines = lines.slice(func.startLine - 1, func.endLine);
      functionLines.forEach(line => {
        const callMatch = line.match(/CALL\s+['"]([^'"]+)['"]/i);
        if (callMatch && !func.calls.includes(callMatch[1])) {
          func.calls.push(callMatch[1]);
        }

        const performMatch = line.match(/PERFORM\s+([A-Z0-9-]+)/i);
        if (performMatch && !func.calls.includes(performMatch[1])) {
          func.calls.push(performMatch[1]);
        }
      });
    });

    return { functions, dataStructures, dependencies, comments };
  }

  private parseVBNet(content: string): ParsedCode {
    const functions: CodeFunction[] = [];
    const dataStructures: DataStructure[] = [];
    const dependencies: string[] = [];
    const comments: CodeComment[] = [];

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Comments
      if (line.trim().startsWith("'")) {
        comments.push({
          line: lineNum,
          text: line.substring(line.indexOf("'") + 1).trim(),
          type: 'single-line',
        });
      }

      // Imports
      const importMatch = line.match(/Imports\s+([\w.]+)/i);
      if (importMatch) {
        dependencies.push(importMatch[1]);
      }

      // Function/Sub definitions
      const funcMatch = line.match(/(Public|Private|Protected|Friend)?\s*(Shared)?\s*(Function|Sub)\s+(\w+)/i);
      if (funcMatch) {
        functions.push({
          name: funcMatch[4],
          startLine: lineNum,
          endLine: lineNum,
          calls: [],
        });
      }

      // Class/Structure definitions
      const classMatch = line.match(/(Public|Private|Protected)?\s*(Class|Structure)\s+(\w+)/i);
      if (classMatch) {
        dataStructures.push({
          name: classMatch[3],
          type: classMatch[2],
        });
      }
    });

    return { functions, dataStructures, dependencies, comments };
  }

  private parseCSharp(content: string): ParsedCode {
    const functions: CodeFunction[] = [];
    const dataStructures: DataStructure[] = [];
    const dependencies: string[] = [];
    const comments: CodeComment[] = [];

    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Single-line comments
      if (line.trim().startsWith('//')) {
        comments.push({
          line: lineNum,
          text: line.substring(line.indexOf('//') + 2).trim(),
          type: 'single-line',
        });
      }

      // Using statements
      const usingMatch = line.match(/using\s+([\w.]+);/);
      if (usingMatch) {
        dependencies.push(usingMatch[1]);
      }

      // Method definitions
      const methodMatch = line.match(/(public|private|protected|internal)?\s*(static)?\s*(async)?\s*\w+\s+(\w+)\s*\(/i);
      if (methodMatch && !line.includes('class') && !line.includes('interface')) {
        functions.push({
          name: methodMatch[4],
          startLine: lineNum,
          endLine: lineNum,
          calls: [],
        });
      }

      // Class/Interface/Struct definitions
      const classMatch = line.match(/(public|private|protected|internal)?\s*(class|interface|struct)\s+(\w+)/i);
      if (classMatch) {
        dataStructures.push({
          name: classMatch[3],
          type: classMatch[2],
        });
      }
    });

    return { functions, dataStructures, dependencies, comments };
  }

  extractCalledPrograms(parsedCode: ParsedCode): string[] {
    const calls = new Set<string>();

    parsedCode.functions.forEach(func => {
      func.calls.forEach(call => calls.add(call));
    });

    parsedCode.dependencies.forEach(dep => calls.add(dep));

    return Array.from(calls);
  }
}

export default new CodeParser();

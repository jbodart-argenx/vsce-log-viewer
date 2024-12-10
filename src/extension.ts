import * as vscode from "vscode";
import * as fs from "fs";
import * as readline from "readline";

export function activate(context: vscode.ExtensionContext) {
   let disposable = vscode.commands.registerCommand(
      "vsce-log-viewer.scanLogFile",
      () => {
         const editor = vscode.window.activeTextEditor;
         if (editor) {
            const document = editor.document;
            const filePath = document.uri.fsPath;

            const diagnostics: vscode.Diagnostic[] = [];
            const diagnosticCollection =
               vscode.languages.createDiagnosticCollection("logDiagnostics");
            diagnosticCollection.set(document.uri, diagnostics);

            const errorRegex = /^ERROR(?::|\d+-\d+)\s*(.*)$/;
            const warningRegex = /^WARNING\s+(.*)$/;
            const infoRegex = /^(INFO|NOTE):\s+(.*)$/;
            const hintRegex = /^Notice:\s+(.*)$/;
            const continuationRegex = /^\s+(.*)$/;

            const rl = readline.createInterface({
               input: fs.createReadStream(filePath),
               crlfDelay: Infinity,
            });

            let lineNumber = 0;
            let currentMessage: string | null = null;
            let currentSeverity: vscode.DiagnosticSeverity | null = null;
            let startLineNumber: number | null = null;

            rl.on("line", (line) => {
               let match;
               if ((match = errorRegex.exec(line))) {
                  if (currentMessage) {
                     const range = new vscode.Range(
                        startLineNumber!,
                        0,
                        lineNumber - 1,
                        line.length
                     );
                     const diagnostic = new vscode.Diagnostic(
                        range,
                        currentMessage,
                        currentSeverity!
                     );
                     diagnostics.push(diagnostic);
                     diagnosticCollection.set(document.uri, diagnostics);
                  }
                  currentMessage = match[1];
                  currentSeverity = vscode.DiagnosticSeverity.Error;
                  startLineNumber = lineNumber;
               } else if ((match = warningRegex.exec(line))) {
                  if (currentMessage) {
                     const range = new vscode.Range(
                        startLineNumber!,
                        0,
                        lineNumber - 1,
                        line.length
                     );
                     const diagnostic = new vscode.Diagnostic(
                        range,
                        currentMessage,
                        currentSeverity!
                     );
                     diagnostics.push(diagnostic);
                     diagnosticCollection.set(document.uri, diagnostics);
                  }
                  currentMessage = match[1];
                  currentSeverity = vscode.DiagnosticSeverity.Warning;
                  startLineNumber = lineNumber;
               } else if ((match = infoRegex.exec(line))) {
                  if (currentMessage) {
                     const range = new vscode.Range(
                        startLineNumber!,
                        0,
                        lineNumber - 1,
                        line.length
                     );
                     const diagnostic = new vscode.Diagnostic(
                        range,
                        currentMessage,
                        currentSeverity!
                     );
                     diagnostics.push(diagnostic);
                     diagnosticCollection.set(document.uri, diagnostics);
                  }
                  currentMessage = match[1];
                  currentSeverity = vscode.DiagnosticSeverity.Information;
                  startLineNumber = lineNumber;
               } else if ((match = hintRegex.exec(line))) {
                  if (currentMessage) {
                     const range = new vscode.Range(
                        startLineNumber!,
                        0,
                        lineNumber - 1,
                        line.length
                     );
                     const diagnostic = new vscode.Diagnostic(
                        range,
                        currentMessage,
                        currentSeverity!
                     );
                     diagnostics.push(diagnostic);
                     diagnosticCollection.set(document.uri, diagnostics);
                  }
                  currentMessage = match[1];
                  currentSeverity = vscode.DiagnosticSeverity.Hint;
                  startLineNumber = lineNumber;
               } else if ((match = continuationRegex.exec(line))) {
                  if (currentMessage) {
                     currentMessage += "\n" + match[1];
                  }
               } else {
                  if (currentMessage) {
                     const range = new vscode.Range(
                        startLineNumber!,
                        0,
                        lineNumber - 1,
                        line.length
                     );
                     const diagnostic = new vscode.Diagnostic(
                        range,
                        currentMessage,
                        currentSeverity!
                     );
                     diagnostics.push(diagnostic);
                     diagnosticCollection.set(document.uri, diagnostics);
                     currentMessage = null;
                     currentSeverity = null;
                     startLineNumber = null;
                  }
               }
               lineNumber++;
            });

            rl.on("close", () => {
               if (currentMessage) {
                  const range = new vscode.Range(
                     startLineNumber!,
                     0,
                     lineNumber - 1,
                     0
                  );
                  const diagnostic = new vscode.Diagnostic(
                     range,
                     currentMessage,
                     currentSeverity!
                  );
                  diagnostics.push(diagnostic);
                  diagnosticCollection.set(document.uri, diagnostics);
               }
            });
         }
      }
   );

   context.subscriptions.push(disposable);
}

export function deactivate() {}

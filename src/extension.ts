import * as vscode from "vscode";
import * as fs from "fs";
import * as readline from "readline";
import { PassThrough } from 'stream';

export function activate(context: vscode.ExtensionContext) {
   const diagnosticCollection =
      vscode.languages.createDiagnosticCollection("logDiagnostics");
   context.subscriptions.push(diagnosticCollection);

   const scanLogFile = async (document: vscode.TextDocument) => {
      if (document.languageId !== "log") {
         return;
      }

      const diagnostics: vscode.Diagnostic[] = [];
      
      const errorRegex = /^ERROR(?::|\d+-\d+)\s*(.*)$/;
      const warningRegex = /^WARNING:\s*(.*)$/;
		const infoRegex = /^(NOTE:\s*.*)$/;
      const issueRegEx =
      /(Variable \w+ is uninitialized.|Missing values were generated|Invalid|Groups are not created|MERGE statement has more than one data set with repeats of BY values|W\.D format was too small|SAS set option OBS=0|The SAS System stopped processing this step because of errors|The log axis cannot support zero or negative values|The meaning of an identifier after a quoted string\b|\w+ values have been converted| \w+ was not found or could not be loaded.|The macro \w+ completed compilation with errors\.)/;
      // const fileRegEx =
      //       /^NOTE: (The (in)?file|Writing ODS \w+(\(\w+\))|Writing (HTML Body|EXCEL) file:|ODS \w+(\(\w+\))? printed\s+)/;
      // const libRegEx = /^NOTE: (Libref \w+ )/;
		const hintRegex = /^((?:INFO|Notice):\s+.*)$/;
      const continuationRegex = /^\s+(.*)$/;

      let errors = 0;
      let warnings = 0;
      let notesIssues = 0;
      let filePath :String = '<not assigned>';
      
      let rl;
      try {
         if (document.uri.scheme === 'file') {
            filePath = document.uri.fsPath;
            console.warn(`(log-viewer) scanLogFile starting Scan of file: ${filePath}`);
            rl = readline.createInterface({ input: fs.createReadStream(document.uri.fsPath), crlfDelay: Infinity, });
         } else {
            filePath = `${document.uri}`;
            console.warn(`(log-viewer) scanLogFile starting Scan of file: ${filePath}`);
            const fileData = await vscode.workspace.fs.readFile(document.uri);
            const passThrough = new PassThrough();
            passThrough.end(fileData);
            rl = readline.createInterface({
               input: passThrough,
               crlfDelay: Infinity
            });
         }

         let lineNumber = 0;
         let currentMessage: string | null = null;
         let currentSeverity: vscode.DiagnosticSeverity | null = null;
         let startLineNumber: number | null = null;
         let lineLength: number = 0;


         rl.on("line", (line) => {
            let match;
            if ((match = errorRegex.exec(line))) {
               if (currentMessage) {
                  const range = new vscode.Range(
                     startLineNumber!,
                     0,
                     lineNumber - 1,
                     lineLength  || line.length
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
               errors++;
               startLineNumber = lineNumber;
               lineLength = line.length;
            } else if ((match = warningRegex.exec(line))) {
               if (currentMessage) {
                  const range = new vscode.Range(
                     startLineNumber!,
                     0,
                     lineNumber - 1,
                     lineLength  || line.length
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
               warnings++;
               startLineNumber = lineNumber;
               lineLength = line.length;
            } else if ((match = infoRegex.exec(line))) {
               if (currentMessage) {
                  const range = new vscode.Range(
                     startLineNumber!,
                     0,
                     lineNumber - 1,
                     lineLength  || line.length
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
               if (issueRegEx.test(line)) {
                  currentSeverity = vscode.DiagnosticSeverity.Information;
                  notesIssues++;
               } else {
                  currentSeverity = vscode.DiagnosticSeverity.Hint;
               }
               startLineNumber = lineNumber;
               lineLength = line.length;
            } else if ((match = hintRegex.exec(line))) {
               if (currentMessage) {
                  const range = new vscode.Range(
                     startLineNumber!,
                     0,
                     lineNumber - 1,
                     lineLength  || line.length
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
               lineLength = line.length;
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
                     lineLength  || line.length
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
                  lineLength = 0;
               }
            }
            lineNumber++;
         });

         rl.on("close", () => {
            console.warn(`(log-viewer) scanLogFile successfully completed reading log file "${filePath}"`);
            if (errors) {
               console.error(`(log-viewer) scanLogFile Fond ${errors} errors.`);
            } else {
               console.log(`(log-viewer) scanLogFile Fond ${errors} errors.`);
            }
            if (warnings) {
               console.warn(`(log-viewer) scanLogFile Fond ${warnings} warnings.`);
            } else {
               console.log(`(log-viewer) scanLogFile Fond ${warnings} warnings.`);
            }
            if (notesIssues) {
               console.warn(`(log-viewer) scanLogFile Fond ${notesIssues} notes issues.`);
            } else {
               console.log(`(log-viewer) scanLogFile Fond ${notesIssues} notes issues.`);
            }
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
         
      } catch (error :any) {
         console.error(`(log-viewer) scanLogFile Error reading log file "${filePath}": ${error.message}`);
         console.error(`(log-viewer) scanLogFile Fond ${errors} errors`);
         console.error(`(log-viewer) scanLogFile Fond ${warnings} warnings`);
         console.error(`(log-viewer) scanLogFile Fond ${notesIssues} notes issues`);
      }
   };

	const clearDiagnostics = () => {
		diagnosticCollection.clear();
	};

	// Automatically scan log file opened in editor
   vscode.workspace.onDidOpenTextDocument(async (document) => {
      try {
         await scanLogFile(document);
      } catch(err :any) {
         console.error(`scanLogFile error: ${err.message}`);
      }
   });

   // Clear the diagnostics from the Problems panel when the .log file is closed
   vscode.workspace.onDidCloseTextDocument(clearDiagnostics);

   // Trigger a new scan whenever the active editor changes to a new log file
   vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.languageId === 'log') {
         try {
            await scanLogFile(editor.document);
         } catch(err :any) {
            console.error(`scanLogFile error: ${err.message}`);
         }   
      }
   });

   context.subscriptions.push(
      vscode.commands.registerCommand("jbodart-argenx-log-viewer.scanLogFile", async () => {
         const editor = vscode.window.activeTextEditor;
         if (editor) {
            try {
               await scanLogFile(editor.document);
            } catch(err :any) {
               console.error(`scanLogFile error: ${err.message}`);
            }
         }
      })
   );

	context.subscriptions.push(
		vscode.commands.registerCommand('jbodart-argenx-log-viewer.clearLogDiagnostics', clearDiagnostics)
	);
}

export function deactivate() {}

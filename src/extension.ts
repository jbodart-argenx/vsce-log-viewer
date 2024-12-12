import * as fs from "fs";
import path from "path";
import * as readline from "readline";
import { PassThrough } from 'stream';
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
   const diagnosticCollection =
      vscode.languages.createDiagnosticCollection("logDiagnostics");
   context.subscriptions.push(diagnosticCollection);

   const scanLogFile = async (document: vscode.Uri | vscode.TextDocument) => {
      let documentUri :vscode.Uri | null  = null;
      if (document instanceof vscode.Uri) {
         documentUri = document;
      } else if (document && document.hasOwnProperty('uri')) {
         documentUri = document.uri;
      }
      if (! documentUri) {
         return;
      }
      if (! /\.log/.test(documentUri.path)) {
         return;
      }
      const diagnostics: vscode.Diagnostic[] = [];

      const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
      context.subscriptions.push(statusBarItem);

      const errorRegex = /^ERROR(?::|\d+-\d+)\s*(.*)$/;
      const warningRegex = /^WARNING:\s*(.*)$/;
		const infoRegex = /^(NOTE:\s*.*)$/;
      const issueRegEx =
      /(Variable \w+ is uninitialized.|Missing values were generated|Invalid|Groups are not created|MERGE statement has more than one data set with repeats of BY values|W\.D format was too small|SAS set option OBS=0|The SAS System stopped processing this step because of errors|The log axis cannot support zero or negative values|The meaning of an identifier after a quoted string\b|\w+ values have been converted| \w+ was not found or could not be loaded.|The macro \w+ completed compilation with errors\.)/;
		const hintRegex = /^((?:INFO|Notice):\s+.*)$/;
      const continuationRegex = /^\s+(.*)$/;

      let errors = 0;
      let warnings = 0;
      let notesIssues = 0;
      let problems = 0;
      let filePath :String = '<not assigned>';
      let fileStats :any = null;
      
      let rl: readline.Interface;
      try {
         if (documentUri.scheme === 'file') {
            filePath = documentUri.fsPath;
            fileStats = fs.statSync(documentUri.fsPath);
            if (fileStats.size > 50 * 1024 * 1024) { 
               console.log("(log-viewer) Large file detected.");
               // vscode.window.showInformationMessage("(log-viewer) Large file detected.");
            }
            console.warn(`(log-viewer) Starting scan of: ${filePath}`);
            // vscode.window.showInformationMessage(`(log-viewer) Starting scan of: ${filePath}`);
            // $(sync~spin) sync |$(loading~spin) loading| gear| $(check) check |$(close) close |
            // $(warning) warning |$(error) error|$(clear-all) clear-all|$(info) info
            statusBarItem.text = "$(gear~spin) Log Scanning.."; 
            statusBarItem.tooltip = `Scanning ${filePath}`;
            statusBarItem.show();
            rl = readline.createInterface({ input: fs.createReadStream(documentUri.fsPath), crlfDelay: Infinity, });
         } else {
            filePath = `${documentUri}`;
            console.warn(`(log-viewer) Starting Scan of file: ${filePath}`);
            statusBarItem.text = "$(gear~spin) Log Scanning.."; 
            statusBarItem.tooltip = `Scanning ${filePath}`;
            statusBarItem.show();
            const fileData = await vscode.workspace.fs.readFile(documentUri);
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
            if (problems>=499) {
               console.warn(`(log-viewer) scanLogFile: File "${path.basename(documentUri.path)}" has >= ${problems} problems; scan will stop.`);
               diagnostics.push(new vscode.Diagnostic(
                  new vscode.Range(lineNumber, 0, lineNumber, lineLength  || line.length),
                  `Scan stopped after finding ${problems}.`,
                  vscode.DiagnosticSeverity.Information
               ));
               diagnosticCollection.set(documentUri, diagnostics);
               statusBarItem.command = "jbodart-argenx-log-viewer.clearStatusBarItem";
               statusBarItem.text = `$(close) close ${errors ? "$(error)" : warnings ? "$(warning)" : "$(info)"}`;
               statusBarItem.tooltip = `(log-viewer): File "${path.basename(documentUri.path)}" scan stopped after finding ${problems}.`;
               // Register the command to clear the status bar item
               context.subscriptions.push(
                  vscode.commands.registerCommand('jbodart-argenx-log-viewer.clearStatusBarItem', () => {
                     statusBarItem.dispose();
                  })
               );
               console.log(`(log-viewer) scanLogFile: stopping scan after ${problems} problems.`);
               rl.close();
               return;
            }
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
                  diagnosticCollection.set(documentUri, diagnostics);
               }
               currentMessage = match[1];
               currentSeverity = vscode.DiagnosticSeverity.Error;
               errors++;
               problems++;
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
                  diagnosticCollection.set(documentUri, diagnostics);
               }
               currentMessage = match[1];
               currentSeverity = vscode.DiagnosticSeverity.Warning;
               warnings++;
               problems++;
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
                  diagnosticCollection.set(documentUri, diagnostics);
               }
               currentMessage = match[1];
               if (issueRegEx.test(line)) {
                  currentSeverity = vscode.DiagnosticSeverity.Information;
                  notesIssues++;
                  problems++;
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
                  diagnosticCollection.set(documentUri, diagnostics);
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
                  diagnosticCollection.set(documentUri, diagnostics);
                  currentMessage = null;
                  currentSeverity = null;
                  startLineNumber = null;
                  lineLength = 0;
               }
            }
            lineNumber++;
         });

         rl.on("close", () => {
            console.log('Stream closed.');
            setTimeout(() => {
               statusBarItem.dispose();
            }, 1500);
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
               diagnosticCollection.set(documentUri, diagnostics);
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
   // vscode.workspace.onDidOpenTextDocument(async (document) => {
   //    if (!/\.log$/.test(document.uri.path)) {
   //       return;
   //    }
   //    vscode.window.showInformationMessage(`(onDidOpenTextDocument) Opening document "${document.uri}" ...`);
   //    const fileStats = await vscode.workspace.fs.stat(document.uri);
   //    vscode.window.showInformationMessage(`(onDidOpenTextDocument) "${document.uri}" size: ${fileStats.size}`);
   //    if (fileStats.size > 50 * 1024 * 1024) {
   //       vscode.window.showInformationMessage("(onDidOpenTextDocument) Large file detected.");
   //    }
   //    try {
   //       await scanLogFile(document);
   //    } catch(err :any) {
   //       console.error(`scanLogFile error: ${err.message}`);
   //    }
   // });

   // Clear the diagnostics from the Problems panel when the .log file is closed
   vscode.workspace.onDidCloseTextDocument(clearDiagnostics);

   // Trigger a new scan whenever the active editor changes to a new log file
   vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.languageId === 'log') {
         console.warn(`(onDidChangeActiveTextEditor) Scanning document "${editor.document.uri}" ...`);
            try {
            await scanLogFile(editor.document);
         } catch(err :any) {
            console.error(`scanLogFile error: ${err.message}`);
         }   
      }
   });

   context.subscriptions.push(
      vscode.commands.registerCommand("jbodart-argenx-log-viewer.scanLogFile", async (document) => {
         const editor = vscode.window.activeTextEditor;
         if (editor) {
            document = document || editor.document;
         }
         try {
            if (document) {
               console.warn(`(scanLogFile) Scanning document "${document}" ...`);
               await scanLogFile(document);
            }
         } catch(err :any) {
            console.error(`scanLogFile error: ${err.message}`);
         }
      })
   );

	context.subscriptions.push(
		vscode.commands.registerCommand('jbodart-argenx-log-viewer.clearLogDiagnostics', clearDiagnostics)
	);
}

export function deactivate() {}

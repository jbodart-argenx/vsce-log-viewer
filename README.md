# jbodart-argenx-log-viewer README

This extension automatically scans any .log file open in a VScode Editor, for Errors, Warnings, and problematic Notes for SAS log files format, and writes diagnostics to the VScode "Problems" panel.

## Features

Custom / remote filesystems are supported.

Errors and Warnings are automatically highlighted in the Editor. Problematic Notes highliting is more discrete.

Consider installing extension '**Log File Highlighter**' to identify more easily Errors, Warnings, Notes, and other messages of interest in SAS log files.  With that extension, the following customizations are suggested (in `settings.json` file):
```JSON
   "editor.tokenColorCustomizations": {
      "textMateRules": [
         {
            "scope": "markup.underline.link",
            "settings": {
               "foreground": "#9a2b84",
               "fontStyle": "underline"
            }
         },
         {
            "scope": "log.error",
            "settings": {
               "foreground": "#af1f1f",
               "fontStyle": "bold",
            }
         },
         {
            "scope": "log.warning",
            "settings": {
               "foreground": "#f4ad42",
               "fontStyle": ""
            }
         },
         {"scope": "log.constant", "settings": {"fontStyle": "",  "foreground": "#888888"}},
         {"scope": "log.date", "settings": {"fontStyle": "",  "foreground": "#888888"}},
         {"scope": "log.string", "settings": {"fontStyle": "",  "foreground": "#888888"}},
         {"scope": "log.debug", "settings": {"fontStyle": ""}},
         {"scope": "log.exception", "settings": {"fontStyle": ""}},
         {"scope": "log.exceptiontype", "settings": {"fontStyle": ""}},
         {"scope": "log.info", "settings": {"fontStyle": ""}},
         {"scope": "log.verbose", "settings": {"fontStyle": ""}},
      ],
   },
   "logFileHighlighter.customPatterns": [ 
      {
         "pattern": "^ERROR(:| \\d+-\\d+).*([\r\n]+\\s{2,28}\\S.*)*",
         "patternFlags": "",
         "highlightEntireLine": true,
         "foreground": "#af1f1f",
         "fontWeight": "bold",
      },
      {
        "pattern": "^WARNING:.*([\r\n]+\\s{2,29}\\S.*)*",
        "patternFlags": "",
        "highlightEntireLine": true,
        "foreground": "#f4ad42",
        "fontWeight": "bold",
      },
      {
      "pattern": "^NOTE: Libref \\w+.*([\r\n]+\\s{2,6}\\S.*)*",
      "patternFlags": "",
      "highlightEntireLine": true,
      "foreground": "#42f46b",
      },
      {
      "pattern": "^NOTE: (The (in)?file|Writing ODS \\w+(\\(\\w+\\))|Writing (HTML Body|EXCEL) file:|ODS \\w+(\\(\\w+\\))? printed\\s+).*([\r\n]+\\s{2,16}\\S.*)*",
      "patternFlags": "",
      "highlightEntireLine": true,
      "foreground": "#55c56f",
      },
      {
         "pattern": "^NOTE:.*([\r\n]+\\s{2,6}\\S.*)*",
         "patternFlags": "",
         "highlightEntireLine": true,
         "foreground": "#426bf4",
      },
      {
         "pattern": "^Notice:.*([\r\n]+\\s{2,6}\\S.*)*",
         "patternFlags": "",
         "highlightEntireLine": true,
         "foreground": "#9542f4",
      },
   ],
   "[log]": {
      "editor.largeFileOptimizations": false,
   },
```

## Requirements

N/A.

## Extension Settings

N/A.

## Known Issues

It may take a while to scan very large log files. 

## Release Notes

### 1.0.0

Initial release.

---

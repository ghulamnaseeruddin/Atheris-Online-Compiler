// Central language catalog for Atheris Online Compiler.
// NOTE: no version numbers are ever shown in the UI — every language always
// runs on whatever the execution engine resolves as "latest stable".
// `monacoId` maps to Monaco's built-in language grammars for syntax highlighting.
// `runner` maps to the backend execution engine key (see backend/src/execution/runners).

export const LANGUAGE_GROUPS = [
  {
    id: "popular",
    label: "Popular",
    languages: ["python", "javascript", "java", "cpp", "c", "csharp", "go", "typescript"],
  },
  {
    id: "high-level",
    label: "High-Level Languages",
    languages: [
      "python",
      "javascript",
      "typescript",
      "java",
      "csharp",
      "go",
      "ruby",
      "php",
      "kotlin",
      "swift",
      "dart",
      "r",
      "scala",
      "elixir",
      "haskell",
      "lua",
      "perl",
      "julia",
    ],
  },
  {
    id: "low-level",
    label: "Low-Level Languages",
    languages: ["c", "cpp", "rust", "assembly", "fortran", "ada"],
  },
  {
    id: "web",
    label: "Web",
    languages: ["html-css-js"],
  },
  {
    id: "databases",
    label: "Databases",
    languages: ["mysql", "postgresql", "sqlite", "mongodb-shell"],
  },
  {
    id: "shell",
    label: "Shell & Scripting",
    languages: ["bash", "powershell"],
  },
];

export const LANGUAGES = {
  python: { name: "Python", monacoId: "python", runner: "python", stdin: true, extension: "py" },
  javascript: { name: "JavaScript", monacoId: "javascript", runner: "javascript", stdin: true, extension: "js" },
  typescript: { name: "TypeScript", monacoId: "typescript", runner: "typescript", stdin: true, extension: "ts" },
  java: { name: "Java", monacoId: "java", runner: "java", stdin: true, extension: "java" },
  csharp: { name: "C#", monacoId: "csharp", runner: "csharp", stdin: true },
  go: { name: "Go", monacoId: "go", runner: "go", stdin: true, extension: "go" },
  ruby: { name: "Ruby", monacoId: "ruby", runner: "ruby", stdin: true, extension: "rb" },
  php: { name: "PHP", monacoId: "php", runner: "php", stdin: true, extension: "php" },
  kotlin: { name: "Kotlin", monacoId: "kotlin", runner: "kotlin", stdin: true },
  swift: { name: "Swift", monacoId: "swift", runner: "swift", stdin: true },
  dart: { name: "Dart", monacoId: "dart", runner: "dart", stdin: true },
  r: { name: "R", monacoId: "r", runner: "r", stdin: true },
  scala: { name: "Scala", monacoId: "scala", runner: "scala", stdin: true },
  elixir: { name: "Elixir", monacoId: "elixir", runner: "elixir", stdin: true },
  haskell: { name: "Haskell", monacoId: "haskell", runner: "haskell", stdin: true },
  lua: { name: "Lua", monacoId: "lua", runner: "lua", stdin: true },
  perl: { name: "Perl", monacoId: "perl", runner: "perl", stdin: true },
  julia: { name: "Julia", monacoId: "julia", runner: "julia", stdin: true },
  c: { name: "C", monacoId: "c", runner: "c", stdin: true, extension: "c" },
  cpp: { name: "C++", monacoId: "cpp", runner: "cpp", stdin: true, extension: "cpp" },
  rust: { name: "Rust", monacoId: "rust", runner: "rust", stdin: true, extension: "rs" },
  assembly: { name: "Assembly", monacoId: "asm", runner: "assembly", stdin: false },
  fortran: { name: "Fortran", monacoId: "fortran", runner: "fortran", stdin: true },
  ada: { name: "Ada", monacoId: "plaintext", runner: "ada", stdin: true },
  "html-css-js": { name: "HTML / CSS / JS", monacoId: "html", runner: "web", stdin: false, livePreview: true },
  mysql: { name: "MySQL", monacoId: "sql", runner: "mysql", stdin: false },
  postgresql: { name: "PostgreSQL", monacoId: "sql", runner: "postgresql", stdin: false },
  sqlite: { name: "SQLite", monacoId: "sql", runner: "sqlite", stdin: false },
  "mongodb-shell": { name: "MongoDB Shell", monacoId: "javascript", runner: "mongodb", stdin: false },
  bash: { name: "Bash", monacoId: "shell", runner: "bash", stdin: true, extension: "sh" },
  powershell: { name: "PowerShell", monacoId: "powershell", runner: "powershell", stdin: true },
};

export const DEFAULT_LANGUAGE = "python";

export const STARTER_SNIPPETS = {
  python: 'print("Hello from Atheris Online Compiler")',
  javascript: 'console.log("Hello from Atheris Online Compiler");',
  typescript: 'const greeting: string = "Hello from Atheris Online Compiler";\nconsole.log(greeting);',
  java:
    "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from Atheris Online Compiler\");\n    }\n}",
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello from Atheris Online Compiler\\n");\n    return 0;\n}',
  cpp:
    '#include <iostream>\n\nint main() {\n    std::cout << "Hello from Atheris Online Compiler" << std::endl;\n    return 0;\n}',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello from Atheris Online Compiler")\n}',
  "html-css-js":
    "<!doctype html>\n<html>\n  <head>\n    <style>\n      body { font-family: sans-serif; color: #16c98d; }\n    </style>\n  </head>\n  <body>\n    <h1>Hello from Atheris Online Compiler</h1>\n    <script>console.log('live preview ready');</script>\n  </body>\n</html>",
};

export function getStarter(langKey) {
  return STARTER_SNIPPETS[langKey] || `// Start coding in ${LANGUAGES[langKey]?.name || langKey}\n`;
}

// Default filename shown in the editor's filename field — "main.<ext>" for
// any language the backend recognizes an extension for, otherwise just
// "main" (execution will fail with a clear message for anything not wired
// up on the backend at all, same as before this field existed).
export function defaultFileName(langKey) {
  const ext = LANGUAGES[langKey]?.extension;
  return ext ? `main.${ext}` : "main";
}

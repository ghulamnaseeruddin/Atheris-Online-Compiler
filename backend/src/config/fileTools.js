export const fileTools = [
  {
    type: "function",
    function: {
      name: "create_excel_file",
      description: "Create an Excel spreadsheet from tabular data and give the user a download link.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "File name without extension" },
          data: {
            type: "array",
            description: "Array of row objects, e.g. [{name: 'Ali', score: 90}]",
            items: { type: "object" },
          },
        },
        required: ["filename", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_word_file",
      description: "Create a Word document from text content and give the user a download link.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "File name without extension" },
          content: { type: "string", description: "The document text, use \\n for new lines" },
        },
        required: ["filename", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_pdf_file",
      description: "Create a PDF document from text content and give the user a download link.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "File name without extension" },
          content: { type: "string", description: "The document text" },
        },
        required: ["filename", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_zip_file",
      description: "Bundle multiple text files into a ZIP archive and give the user a download link.",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "Zip file name without extension" },
          files: {
            type: "array",
            description: "Files to include",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                content: { type: "string" },
              },
              required: ["name", "content"],
            },
          },
        },
        required: ["filename", "files"],
      },
    },
  },
];
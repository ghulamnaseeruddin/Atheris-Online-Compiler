import ExcelJS from "exceljs";
import { Document, Packer, Paragraph } from "docx";
import PDFDocument from "pdfkit";
import * as archiverModule from "archiver";
const archiver = archiverModule.default || archiverModule;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "..", "..", "data", "generated");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

export async function createExcelFile({ filename, data }) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  if (data.length > 0) {
    sheet.addRow(Object.keys(data[0]));
    data.forEach((row) => sheet.addRow(Object.values(row)));
  }
  const id = uuidv4();
  const filePath = path.join(OUTPUT_DIR, `${id}-${filename}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  return { id, filePath, downloadName: `${filename}.xlsx` };
}

export async function createWordFile({ filename, content }) {
  const doc = new Document({
    sections: [{ children: content.split("\n").map((line) => new Paragraph(line)) }],
  });
  const buffer = await Packer.toBuffer(doc);
  const id = uuidv4();
  const filePath = path.join(OUTPUT_DIR, `${id}-${filename}.docx`);
  fs.writeFileSync(filePath, buffer);
  return { id, filePath, downloadName: `${filename}.docx` };
}

export async function createPdfFile({ filename, content }) {
  return new Promise((resolve) => {
    const id = uuidv4();
    const filePath = path.join(OUTPUT_DIR, `${id}-${filename}.pdf`);
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));
    doc.text(content);
    doc.end();
    doc.on("end", () => resolve({ id, filePath, downloadName: `${filename}.pdf` }));
  });
}

export async function createZipFile({ filename, files }) {
  return new Promise((resolve) => {
    const id = uuidv4();
    const filePath = path.join(OUTPUT_DIR, `${id}-${filename}.zip`);
    const output = fs.createWriteStream(filePath);
    const archive = archiver("zip");
    archive.pipe(output);
    files.forEach((f) => archive.append(f.content, { name: f.name }));
    archive.finalize();
    output.on("close", () => resolve({ id, filePath, downloadName: `${filename}.zip` }));
  });
}

export { OUTPUT_DIR };
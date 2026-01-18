import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
// Vite will bundle the worker and give us a URL.
// eslint-disable-next-line import/no-unresolved
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerSrc;

export type ExtractPdfTextOptions = {
  maxPages?: number;
  maxChars?: number;
};

export async function extractPdfText(file: File, options: ExtractPdfTextOptions = {}) {
  const maxPages = options.maxPages ?? 2;
  const maxChars = options.maxChars ?? 8000;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pagesToRead = Math.max(1, Math.min(maxPages, pdf.numPages));

  let text = "";
  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = (content.items as Array<{ str?: string }>).map((it) => it.str ?? "").join(" ");
    const cleaned = pageText.replace(/\s+/g, " ").trim();

    if (cleaned) {
      text += (text ? "\n\n" : "") + cleaned;
    }

    if (text.length >= maxChars) {
      text = text.slice(0, maxChars);
      break;
    }
  }

  return text.trim();
}

declare module "pdfjs-dist" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: unknown): { promise: Promise<any> };
}

declare module "pdfjs-dist/build/pdf" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: unknown): { promise: Promise<any> };
}

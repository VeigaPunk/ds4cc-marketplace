import contentDisposition from "content-disposition";
// eslint-disable-next-line unicorn/prefer-node-protocol
import fs from "fs";
import { DownloadResult } from "../models/download-result";

interface downloadFileArguments {
  downloadStream: Response;
  onStart: (filename: string, total: number) => void;
  onData: (filename: string, chunk: Buffer, total: number) => void;
  outputDir?: string;
}

export const downloadFile = async ({
  downloadStream,
  onStart,
  onData,
  outputDir,
}: downloadFileArguments): Promise<DownloadResult> => {
  const MAX_FILE_NAME_LENGTH = 128;

  const downloadContentDisposition = downloadStream.headers.get("content-disposition");
  if (!downloadContentDisposition) {
    throw new Error("No content-disposition header found");
  }

  const parsedContentDisposition = contentDisposition.parse(downloadContentDisposition);
  const fullFileName = parsedContentDisposition.parameters.filename;
  const slicedFileName = fullFileName.slice(
    Math.max(fullFileName.length - MAX_FILE_NAME_LENGTH, 0)
  ).normalize("NFC");
  const baseDir = outputDir || ".";
  const path = `${baseDir}/${slicedFileName}`;
  const tmpPath = `${path}.partial.${process.pid}.${Date.now()}`;

  const total = Number(downloadStream.headers.get("content-length") || 0);
  const filename = parsedContentDisposition.parameters.filename;

  if (!downloadStream.body) {
    throw new Error("No response body");
  }

  if (fs.existsSync(path)) {
    throw new Error(`(${filename}) Refusing to overwrite existing file at ${path}`);
  }

  onStart(filename, total);

  const file = fs.createWriteStream(tmpPath, { flags: "wx" });
  const reader = downloadStream.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = Buffer.from(value);
      file.write(chunk);
      onData(filename, chunk, total);
    }

    file.end();

    await new Promise<void>((resolve, reject) => {
      file.on("finish", resolve);
      file.on("error", reject);
    });

    await fs.promises.rename(tmpPath, path);

    const downloadResult: DownloadResult = {
      path,
      filename,
      total,
    };

    return downloadResult;
  } catch {
    file.destroy();
    try { await fs.promises.unlink(tmpPath); } catch { /* tmp may not exist */ }
    throw new Error(`(${filename}) Error occurred while downloading file`);
  }
};

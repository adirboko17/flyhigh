/**
 * ZIP STORE (ללא דחיסה) — להורדת כמה קבצים כארכיון אחד בלי תלות חיצונית.
 */

export type ZipEntry = {
  name: string;
  data: Uint8Array;
};

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let crc = i;
  for (let bit = 0; bit < 8; bit++) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  CRC_TABLE[i] = crc;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(0, date.getFullYear() - 1980);
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date: (year << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

export function uniqueZipNames(names: string[]): string[] {
  const used = new Map<string, number>();
  return names.map((raw) => {
    const name = raw.replace(/[\\/]/g, "_").trim() || "file";
    const count = used.get(name) ?? 0;
    used.set(name, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf(".");
    if (dot <= 0) return `${name} (${count + 1})`;
    return `${name.slice(0, dot)} (${count + 1})${name.slice(dot)}`;
  });
}

export function createZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const now = dosDateTime(new Date());
  const files = entries.map((entry) => {
    const nameBytes = encoder.encode(entry.name.replace(/[\\/]/g, "_") || "file");
    return {
      nameBytes,
      data: entry.data,
      crc: crc32(entry.data),
      size: entry.data.byteLength,
    };
  });

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const local = new Uint8Array(30 + file.nameBytes.byteLength);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, now.time);
    writeUint16(localView, 12, now.date);
    writeUint32(localView, 14, file.crc);
    writeUint32(localView, 18, file.size);
    writeUint32(localView, 22, file.size);
    writeUint16(localView, 26, file.nameBytes.byteLength);
    writeUint16(localView, 28, 0);
    local.set(file.nameBytes, 30);
    localParts.push(local, file.data);

    const central = new Uint8Array(46 + file.nameBytes.byteLength);
    const centralView = new DataView(central.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, now.time);
    writeUint16(centralView, 14, now.date);
    writeUint32(centralView, 16, file.crc);
    writeUint32(centralView, 20, file.size);
    writeUint32(centralView, 24, file.size);
    writeUint16(centralView, 28, file.nameBytes.byteLength);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    central.set(file.nameBytes, 46);
    centralParts.push(central);

    offset += local.byteLength + file.size;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);

  const parts = [...localParts, ...centralParts, end];
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const combined = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    combined.set(part, cursor);
    cursor += part.byteLength;
  }

  return new Blob([combined], { type: "application/zip" });
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

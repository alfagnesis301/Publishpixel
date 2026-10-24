/**
 * Conservative, browser-side EXIF reader for JPEG APP1/TIFF metadata.
 * It reads only basic camera/date fields and GPS tag presence; it never
 * uploads files, geocodes coordinates, or treats an unreadable file as safe.
 */
export type ExifInfo = {
  status: "absent" | "detected" | "unreadable";
  cameraMake?: string;
  cameraModel?: string;
  capturedAt?: string;
  gpsPresent: boolean | null;
};

export async function readExifInfo(file: File): Promise<ExifInfo> {
  try {
    const buffer = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return { status: "unreadable", gpsPresent: null };
    }

    let cursor = 2;
    while (cursor + 4 <= bytes.length) {
      if (bytes[cursor] !== 0xff) break;
      while (bytes[cursor] === 0xff) cursor++;
      const marker = bytes[cursor++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (cursor + 2 > bytes.length) break;
      const length = view.getUint16(cursor, false);
      if (length < 2) break;
      const payload = cursor + 2;
      const end = cursor + length;
      if (end > bytes.length) break;
      if (
        marker === 0xe1 && length >= 8 &&
        bytes[payload] === 0x45 && bytes[payload + 1] === 0x78 &&
        bytes[payload + 2] === 0x69 && bytes[payload + 3] === 0x66 &&
        bytes[payload + 4] === 0 && bytes[payload + 5] === 0
      ) {
        return parseTiff(view, payload + 6, end);
      }
      cursor = end;
    }
    return { status: "absent", gpsPresent: false };
  } catch {
    return { status: "unreadable", gpsPresent: null };
  }
}

function parseTiff(view: DataView, start: number, end: number): ExifInfo {
  try {
    const inRange = (offset: number, size: number) =>
      Number.isInteger(offset) && offset >= start && size >= 0 && offset + size <= end;
    if (!inRange(start, 8)) throw new Error("Invalid TIFF header");
    const order = view.getUint16(start, false);
    if (order !== 0x4949 && order !== 0x4d4d) throw new Error("Unknown byte order");
    const little = order === 0x4949;
    const u16 = (pos: number) => {
      if (!inRange(pos, 2)) throw new Error("Out of range");
      return view.getUint16(pos, little);
    };
    const u32 = (pos: number) => {
      if (!inRange(pos, 4)) throw new Error("Out of range");
      return view.getUint32(pos, little);
    };
    if (u16(start + 2) !== 42) throw new Error("Invalid TIFF signature");

    type Entry = { type: number; count: number; position: number; value: number };
    const readIfd = (relative: number): Map<number, Entry> => {
      const offset = start + relative;
      const count = u16(offset);
      if (count > 256 || !inRange(offset + 2, count * 12)) throw new Error("Invalid IFD");
      const result = new Map<number, Entry>();
      for (let i = 0; i < count; i++) {
        const position = offset + 2 + i * 12;
        result.set(u16(position), {
          type: u16(position + 2),
          count: u32(position + 4),
          position,
          value: u32(position + 8)
        });
      }
      return result;
    };
    const readAscii = (entry?: Entry): string | undefined => {
      if (!entry || entry.type !== 2 || entry.count < 1 || entry.count > 256) return undefined;
      const position = entry.count <= 4 ? entry.position + 8 : start + entry.value;
      if (!inRange(position, entry.count)) return undefined;
      const text = new TextDecoder("ascii").decode(
        new Uint8Array(view.buffer, position, entry.count)
      ).replace(/\0.*$/, "").trim();
      return text || undefined;
    };

    const base = readIfd(u32(start + 4));
    const cameraMake = readAscii(base.get(0x010f));
    const cameraModel = readAscii(base.get(0x0110));
    const exifPointer = base.get(0x8769);
    let capturedAt = readAscii(base.get(0x0132));
    if (exifPointer?.type === 4 && exifPointer.count === 1) {
      const exif = readIfd(exifPointer.value);
      capturedAt = readAscii(exif.get(0x9003)) || capturedAt;
    }
    const gpsPointer = base.get(0x8825);
    let gpsPresent = false;
    if (gpsPointer?.type === 4 && gpsPointer.count === 1) {
      const gps = readIfd(gpsPointer.value);
      gpsPresent = gps.has(0x0002) || gps.has(0x0004);
    }
    return { status: "detected", cameraMake, cameraModel, capturedAt, gpsPresent };
  } catch {
    return { status: "unreadable", gpsPresent: null };
  }
}

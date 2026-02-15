// ─── BLP to PNG Converter ──────────────────────────────────────
// WHY: WoW stores textures in BLP format. We convert them to PNG
// for display in CompApp's UI (item tooltips, spell icons, etc.).
// Uses 'sharp' for image processing.

const fs = require('fs');
const path = require('path');

class BLPConverter {
  constructor() {
    this.sharp = null;
  }

  // Lazy-load sharp (it's a native module, may not be installed yet)
  async getSharp() {
    if (!this.sharp) {
      this.sharp = require('sharp');
    }
    return this.sharp;
  }

  // Convert a single BLP buffer to PNG buffer
  async convertToPng(blpBuffer) {
    // BLP files have a simple header we can detect
    // Format: 'BLP2' magic, then type/encoding/alpha fields
    if (!blpBuffer || blpBuffer.length < 4) {
      throw new Error('Invalid BLP data');
    }

    const magic = blpBuffer.toString('ascii', 0, 4);
    if (magic !== 'BLP2') {
      throw new Error(`Not a BLP2 file (got: ${magic})`);
    }

    // BLP2 header structure:
    // 0-3: magic ('BLP2')
    // 4: type (0=JPEG, 1=DirectX)
    // 5: encoding (1=uncompressed, 2=DXT, 3=uncompressed+alpha)
    // 6: alphaDepth
    // 7: alphaEncoding
    // 8: hasMips
    // 12-15: width
    // 16-19: height
    const type = blpBuffer.readUInt8(4);
    const encoding = blpBuffer.readUInt8(5);
    const width = blpBuffer.readUInt32LE(12);
    const height = blpBuffer.readUInt32LE(16);

    // For uncompressed paletted BLP2:
    if (type === 1 && encoding === 1) {
      return this.decodePaletted(blpBuffer, width, height);
    }

    // For DXT-compressed BLP2:
    if (type === 1 && encoding === 2) {
      return this.decodeDXT(blpBuffer, width, height);
    }

    throw new Error(`Unsupported BLP encoding: type=${type}, encoding=${encoding}`);
  }

  // Decode paletted (256-color) BLP
  async decodePaletted(buffer, width, height) {
    const sharp = await this.getSharp();
    // Palette starts at offset 148 (256 * 4 bytes BGRA)
    const paletteOffset = 148;
    const palette = [];
    for (let i = 0; i < 256; i++) {
      const off = paletteOffset + i * 4;
      palette.push({
        b: buffer.readUInt8(off),
        g: buffer.readUInt8(off + 1),
        r: buffer.readUInt8(off + 2),
        a: buffer.readUInt8(off + 3),
      });
    }

    // Mipmap offsets at 28-91 (16 uint32s), sizes at 92-155
    const dataOffset = buffer.readUInt32LE(28);
    const dataSize = buffer.readUInt32LE(92);

    const pixels = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height && i < dataSize; i++) {
      const idx = buffer.readUInt8(dataOffset + i);
      const c = palette[idx];
      const off = i * 4;
      pixels[off] = c.r;
      pixels[off + 1] = c.g;
      pixels[off + 2] = c.b;
      pixels[off + 3] = 255;
    }

    return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  }

  // Decode DXT-compressed BLP (basic DXT1/DXT3/DXT5)
  async decodeDXT(buffer, width, height) {
    const sharp = await this.getSharp();
    const alphaDepth = buffer.readUInt8(6);
    const alphaEncoding = buffer.readUInt8(7);
    const dataOffset = buffer.readUInt32LE(28);

    // Determine DXT variant
    let dxtType = 1; // DXT1
    if (alphaDepth > 0) {
      dxtType = alphaEncoding === 1 ? 3 : 5; // DXT3 or DXT5
    }

    const pixels = Buffer.alloc(width * height * 4);
    const blockW = Math.max(1, Math.ceil(width / 4));
    const blockH = Math.max(1, Math.ceil(height / 4));
    const blockSize = dxtType === 1 ? 8 : 16;
    let offset = dataOffset;

    for (let by = 0; by < blockH; by++) {
      for (let bx = 0; bx < blockW; bx++) {
        if (offset + blockSize > buffer.length) break;
        this.decodeDXTBlock(buffer, offset, pixels, bx * 4, by * 4, width, height, dxtType);
        offset += blockSize;
      }
    }

    return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  }

  // Decode a single 4x4 DXT block
  decodeDXTBlock(src, srcOff, dst, x, y, w, h, dxtType) {
    let colorOff = srcOff;
    if (dxtType !== 1) colorOff += 8; // Alpha block comes first in DXT3/5

    const c0 = src.readUInt16LE(colorOff);
    const c1 = src.readUInt16LE(colorOff + 2);
    const bits = src.readUInt32LE(colorOff + 4);

    const colors = [
      this.rgb565(c0),
      this.rgb565(c1),
      [0, 0, 0, 255],
      [0, 0, 0, 255],
    ];

    if (c0 > c1 || dxtType !== 1) {
      colors[2] = [
        Math.round((2 * colors[0][0] + colors[1][0]) / 3),
        Math.round((2 * colors[0][1] + colors[1][1]) / 3),
        Math.round((2 * colors[0][2] + colors[1][2]) / 3),
        255
      ];
      colors[3] = [
        Math.round((colors[0][0] + 2 * colors[1][0]) / 3),
        Math.round((colors[0][1] + 2 * colors[1][1]) / 3),
        Math.round((colors[0][2] + 2 * colors[1][2]) / 3),
        255
      ];
    } else {
      colors[2] = [
        Math.round((colors[0][0] + colors[1][0]) / 2),
        Math.round((colors[0][1] + colors[1][1]) / 2),
        Math.round((colors[0][2] + colors[1][2]) / 2),
        255
      ];
      colors[3] = [0, 0, 0, 0]; // Transparent
    }

    for (let py = 0; py < 4; py++) {
      for (let px = 0; px < 4; px++) {
        const dx = x + px, dy = y + py;
        if (dx >= w || dy >= h) continue;
        const idx = (bits >> (2 * (4 * py + px))) & 3;
        const c = colors[idx];
        const off = (dy * w + dx) * 4;
        dst[off] = c[0]; dst[off + 1] = c[1]; dst[off + 2] = c[2]; dst[off + 3] = c[3];
      }
    }
  }

  rgb565(v) {
    return [
      ((v >> 11) & 0x1f) * 255 / 31,
      ((v >> 5) & 0x3f) * 255 / 63,
      (v & 0x1f) * 255 / 31,
      255
    ].map(Math.round);
  }

  // Convert all BLP files in a directory to PNG
  async convertDirectory(srcDir, destDir, progressCallback) {
    if (!fs.existsSync(srcDir)) throw new Error(`Source directory not found: ${srcDir}`);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.blp'));
    let converted = 0, errors = 0;

    for (const file of files) {
      try {
        const blp = fs.readFileSync(path.join(srcDir, file));
        const png = await this.convertToPng(blp);
        const outName = file.replace(/\.blp$/i, '.png');
        fs.writeFileSync(path.join(destDir, outName), png);
        converted++;
      } catch { errors++; }

      if (progressCallback && converted % 50 === 0) {
        progressCallback(`Converting: ${converted}/${files.length}`);
      }
    }

    return { converted, errors, total: files.length };
  }
}

module.exports = BLPConverter;

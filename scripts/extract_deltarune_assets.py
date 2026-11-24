"""Extract selected Deltarune pixel sprites (Castle Town + Ralsei + Save Point)
from local GameMaker data.win into public/assets/deltarune/ as crisp PNGs.

Read-only on game files. Supports GameMaker 2zoq (BZip2 + GM-QOI) and raw PNG textures.
"""

from __future__ import annotations

import bz2
import io
import os
import struct
from pathlib import Path
from PIL import Image

DATA_WIN_CH2 = Path(r"D:\steam\steamapps\common\DELTARUNE\chapter2_windows\data.win")
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "assets" / "deltarune"

# GameMaker QOI (early QOI draft used by GM2022+ / UndertaleModTool QoiConverter.cs)
QOI_INDEX = 0x00
QOI_RUN_8 = 0x40
QOI_RUN_16 = 0x60
QOI_DIFF_8 = 0x80
QOI_DIFF_16 = 0xC0
QOI_DIFF_24 = 0xE0
QOI_COLOR = 0xF0

QOI_MASK_2 = 0xC0
QOI_MASK_3 = 0xE0
QOI_MASK_4 = 0xF0


def sbit(val: int, bits: int) -> int:
    sign = 1 << (bits - 1)
    return (val & (sign - 1)) - (val & sign)


def decode_gm_qoi(data: bytes) -> Image.Image:
    magic, width, height, length = struct.unpack_from("<4sHHI", data, 0)
    if magic != b"fioq":
        raise ValueError(f"Expected fioq magic, got {magic!r}")

    pos = 12
    end = 12 + length
    total_pixels = width * height
    out = bytearray(total_pixels * 4)

    r = g = b = 0
    a = 255
    index = [(0, 0, 0, 0)] * 64
    run = 0
    px_i = 0

    while px_i < total_pixels:
        if run > 0:
            run -= 1
        elif pos < end:
            b1 = data[pos]
            pos += 1

            if (b1 & QOI_MASK_2) == QOI_INDEX:
                r, g, b, a = index[b1 & 0x3F]
            elif (b1 & QOI_MASK_3) == QOI_RUN_8:
                run = b1 & 0x1F
            elif (b1 & QOI_MASK_3) == QOI_RUN_16:
                b2 = data[pos]
                pos += 1
                run = (((b1 & 0x1F) << 8) | b2) + 32
            elif (b1 & QOI_MASK_2) == QOI_DIFF_8:
                r = (r + sbit((b1 >> 4) & 0x3, 2)) & 0xFF
                g = (g + sbit((b1 >> 2) & 0x3, 2)) & 0xFF
                b = (b + sbit(b1 & 0x3, 2)) & 0xFF
            elif (b1 & QOI_MASK_3) == QOI_DIFF_16:
                b2 = data[pos]
                pos += 1
                merged = (b1 << 8) | b2
                r = (r + sbit((merged >> 8) & 0x1F, 5)) & 0xFF
                g = (g + sbit((merged >> 4) & 0x0F, 4)) & 0xFF
                b = (b + sbit(merged & 0x0F, 4)) & 0xFF
            elif (b1 & QOI_MASK_4) == QOI_DIFF_24:
                b2 = data[pos]
                b3 = data[pos + 1]
                pos += 2
                merged = (b1 << 16) | (b2 << 8) | b3
                r = (r + sbit((merged >> 15) & 0x1F, 5)) & 0xFF
                g = (g + sbit((merged >> 10) & 0x1F, 5)) & 0xFF
                b = (b + sbit((merged >> 5) & 0x1F, 5)) & 0xFF
                a = (a + sbit(merged & 0x1F, 5)) & 0xFF
            elif (b1 & QOI_MASK_4) == QOI_COLOR:
                if b1 & 8:
                    r = data[pos]
                    pos += 1
                if b1 & 4:
                    g = data[pos]
                    pos += 1
                if b1 & 2:
                    b = data[pos]
                    pos += 1
                if b1 & 1:
                    a = data[pos]
                    pos += 1

            index[(r ^ g ^ b ^ a) & 63] = (r, g, b, a)

        o = px_i * 4
        out[o] = r
        out[o + 1] = g
        out[o + 2] = b
        out[o + 3] = a
        px_i += 1

    if pos != end:
        print(f"  [warn] QOI stream ended at {pos}, expected {end}")
    return Image.frombytes("RGBA", (width, height), bytes(out))


class DataWinReader:
    def __init__(self, path: Path) -> None:
        self.raw = path.read_bytes()
        magic, size = struct.unpack_from("<4sI", self.raw, 0)
        assert magic == b"FORM", f"Invalid IFF header: {magic!r}"
        self.chunks: dict[str, tuple[int, int]] = {}
        pos = 8
        while pos < size + 8:
            cname, csize = struct.unpack_from("<4sI", self.raw, pos)
            self.chunks[cname.decode("ascii", "ignore")] = (pos + 8, csize)
            pos += 8 + csize

        self._txtr_entries = self._parse_txtr_entries()
        self._sheet_cache: dict[int, Image.Image] = {}
        self._sprites = self._parse_sprites()

    def _read_cstr(self, ptr: int) -> str:
        end = self.raw.index(b"\x00", ptr)
        return self.raw[ptr:end].decode("utf-8", "ignore")

    def _parse_txtr_entries(self) -> list[tuple[int, int]]:
        pos, _ = self.chunks["TXTR"]
        count = struct.unpack_from("<I", self.raw, pos)[0]
        ptrs = struct.unpack_from(f"<{count}I", self.raw, pos + 4)
        entries = []
        for p in ptrs:
            # 28B layout: scaled, genMips, blockSize, w, h, idx, dataOffset
            _, _, block_size, _, _, _, data_offset = struct.unpack_from("<7I", self.raw, p)
            entries.append((data_offset, block_size))
        return entries

    def get_texture_sheet(self, sheet_id: int) -> Image.Image:
        if sheet_id in self._sheet_cache:
            return self._sheet_cache[sheet_id]
        offset, block_size = self._txtr_entries[sheet_id]
        magic = self.raw[offset : offset + 4]
        if magic == b"\x89PNG":
            img = Image.open(io.BytesIO(self.raw[offset : offset + block_size])).convert("RGBA")
        elif magic == b"2zoq":
            bz2_stream = self.raw[offset + 12 : offset + block_size]
            qoi_bytes = bz2.decompress(bz2_stream)
            img = decode_gm_qoi(qoi_bytes)
        elif magic == b"fioq":
            img = decode_gm_qoi(self.raw[offset : offset + block_size])
        else:
            raise ValueError(f"Unsupported texture magic {magic!r} at sheet {sheet_id}")
        self._sheet_cache[sheet_id] = img
        return img

    def _parse_sprites(self) -> dict[str, tuple[int, int, list[int]]]:
        pos, _ = self.chunks["SPRT"]
        count = struct.unpack_from("<I", self.raw, pos)[0]
        ptrs = struct.unpack_from(f"<{count}I", self.raw, pos + 4)
        sprites: dict[str, tuple[int, int, list[int]]] = {}
        for p in ptrs:
            name_ptr, w, h = struct.unpack_from("<3I", self.raw, p)
            name = self._read_cstr(name_ptr)
            # Based on probed GM2022+ layout: tex_count at int index 21 (byte offset 84)
            tex_count = struct.unpack_from("<I", self.raw, p + 84)[0]
            tpag_ptrs = list(struct.unpack_from(f"<{tex_count}I", self.raw, p + 88)) if tex_count < 512 else []
            sprites[name] = (w, h, tpag_ptrs)
        return sprites

    def extract_sprite_frame(self, name: str, frame: int = 0) -> Image.Image:
        if name not in self._sprites:
            raise KeyError(f"Sprite {name!r} not found")
        w, h, tpag_ptrs = self._sprites[name]
        tpag_ptr = tpag_ptrs[frame]
        sx, sy, sw, sh, tx, ty, tw, th, bw, bh, sheet_id = struct.unpack_from("<11H", self.raw, tpag_ptr)
        sheet = self.get_texture_sheet(sheet_id)
        crop = sheet.crop((sx, sy, sx + sw, sy + sh))
        if (tw, th) != (sw, sh):
            crop = crop.resize((tw, th), Image.Resampling.NEAREST)
        canvas = Image.new("RGBA", (max(bw, w), max(bh, h)), (0, 0, 0, 0))
        canvas.paste(crop, (tx, ty))
        # Trim transparent border only? Keep tight bounding box for clean web layout
        bbox = canvas.getbbox()
        return canvas.crop(bbox) if bbox else canvas


SPRITE_EXPORTS = [
    ("ralsei-ch1.png", "spr_ralseid", 0),
    ("ralsei-ch1-blush.png", "spr_ralseid_blush", 0),
    ("ralsei-ch2.png", "spr_ralsei_walk_down", 0),
    ("ralsei-ch2-blush.png", "spr_ralsei_walk_down_blush", 0),
    ("ralsei-sit.png", "spr_ralsei_sit", 0),
    ("savepoint.png", "spr_savepoint", 0),
    ("castle-fountain.png", "spr_castle_fountain", 0),
    ("castle-house.png", "spr_castle_house", 0),
    ("castle-cafe.png", "spr_castle_cafe", 0),
    ("castle-torch.png", "spr_castle_torch", 0),
    ("castle-book-pillar.png", "spr_castle_book_pillar", 0),
]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    reader = DataWinReader(DATA_WIN_CH2)
    for filename, sprite_name, frame in SPRITE_EXPORTS:
        img = reader.extract_sprite_frame(sprite_name, frame)
        out_path = OUT_DIR / filename
        img.save(out_path)
        print(f"Exported {filename:24s} <- {sprite_name}[{frame}] ({img.width}x{img.height})")


if __name__ == "__main__":
    main()

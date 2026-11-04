"""Generate the extension's PNG icons (a cookie) with only the stdlib."""
import math, os, struct, zlib

def png(size, path):
    rows = []
    c = (size - 1) / 2
    r = size * 0.46
    chips = [(-0.35, -0.25), (0.25, -0.35), (0.05, 0.1), (-0.3, 0.35), (0.38, 0.28)]
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            dx, dy = x - c, y - c
            d = math.hypot(dx, dy)
            # bite out of top-right
            bite = math.hypot(x - (c + r * 0.8), y - (c - r * 0.8)) < r * 0.38
            if d <= r and not bite:
                col = (0xD9, 0x9A, 0x4E, 255)
                for cx, cy in chips:
                    if math.hypot(dx - cx * r, dy - cy * r) < r * 0.13:
                        col = (0x5A, 0x34, 0x17, 255)
                if d > r - max(1, size * 0.04):
                    col = (0xB5, 0x65, 0x1D, 255)
            else:
                col = (0, 0, 0, 0)
            row += bytes(col)
        rows.append(bytes(row))
    raw = zlib.compress(b"".join(rows), 9)
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    data = (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", raw) + chunk(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(data)

out = os.path.join(os.path.dirname(__file__), "..", "icons")
for s in (16, 32, 48, 128):
    png(s, os.path.join(out, f"icon{s}.png"))

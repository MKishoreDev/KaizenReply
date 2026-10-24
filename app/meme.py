from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fastapi import HTTPException


def create_reality_vs_linkedin_meme(reality: str, linkedin: str) -> bytes:
    """
    Renders a high-resolution (2048x1364 Retina) Japanese ink-wash comparison meme card
    contrasting everyday reality with grand corporate framing.
    """
    template_candidates = [
        Path(__file__).resolve().parent.parent / "static" / "linkedin-meme-template.jpg",
        Path("static/linkedin-meme-template.jpg"),
    ]
    template_path = None
    for cand in template_candidates:
        if cand.exists():
            template_path = str(cand)
            break

    if not template_path:
        raise HTTPException(status_code=500, detail="Meme template image not found")

    img = Image.open(template_path).convert("RGB")
    draw = ImageDraw.Draw(img)

    # Scale dynamically according to template resolution (1.0 for 1024, 2.0 for 2048)
    scale = img.width / 1024.0

    r_text = reality.strip()
    if r_text.lower().startswith("reality:"):
        r_text = r_text[8:].strip()
    r_text = r_text.replace("**", "").strip()

    l_text = linkedin.strip()
    if l_text.lower().startswith("linkedin:"):
        l_text = l_text[9:].strip()
    l_text = l_text.replace("**", "").strip()

    # Locate bundled or system serif font for crisp editorial rendering
    font_candidates = [
        Path(__file__).resolve().parent.parent / "static" / "fonts" / "NotoSerif-Regular.ttf",
        Path("static/fonts/NotoSerif-Regular.ttf"),
        "georgia.ttf",
        "DejaVuSerif.ttf",
    ]
    font_source = None
    for fc in font_candidates:
        if isinstance(fc, Path) and fc.exists():
            font_source = str(fc)
            break
        elif isinstance(fc, str):
            try:
                ImageFont.truetype(fc, 12)
                font_source = fc
                break
            except Exception:
                pass

    def get_font_and_lines(text: str, max_w: int, max_h: int):
        base_sizes = [24, 22, 20, 18, 16]
        for base_size in base_sizes:
            size = int(round(base_size * scale))
            if font_source:
                try:
                    font = ImageFont.truetype(font_source, size)
                except Exception:
                    font = ImageFont.load_default()
            else:
                font = ImageFont.load_default()

            line_height = int(round(size * 1.48))
            words = text.split()
            lines = []
            cur_line = ""
            for w in words:
                test = (cur_line + " " + w).strip()
                bbox = draw.textbbox((0, 0), test, font=font)
                if (bbox[2] - bbox[0]) <= max_w:
                    cur_line = test
                else:
                    if cur_line:
                        lines.append(cur_line)
                    cur_line = w
            if cur_line:
                lines.append(cur_line)
            total_h = len(lines) * line_height
            if total_h <= max_h or base_size == 16:
                return font, lines, line_height, total_h
        fallback_size = int(round(20 * scale))
        return ImageFont.load_default(), [text], fallback_size, fallback_size

    box_y = int(round(245 * scale))
    box_h = int(round(290 * scale))
    rx = int(round(92 * scale))
    rw = int(round(365 * scale))
    r_font, r_lines, r_lh, r_th = get_font_and_lines(r_text, rw, box_h)
    r_start_y = box_y + max(int(round(10 * scale)), (box_h - r_th) // 3)
    for line in r_lines:
        draw.text((rx, r_start_y), line, fill="#1b2621", font=r_font)
        r_start_y += r_lh

    lx = int(round(565 * scale))
    lw = int(round(365 * scale))
    l_font, l_lines, l_lh, l_th = get_font_and_lines(l_text, lw, box_h)
    l_start_y = box_y + max(int(round(10 * scale)), (box_h - l_th) // 3)
    for line in l_lines:
        draw.text((lx, l_start_y), line, fill="#1b2621", font=l_font)
        l_start_y += l_lh

    buf = BytesIO()
    # High-quality JPEG with 4:4:4 chroma (subsampling=0) so dark text against washi paper stays crystal-sharp
    img.save(buf, format="JPEG", quality=98, subsampling=0, optimize=True)
    return buf.getvalue()

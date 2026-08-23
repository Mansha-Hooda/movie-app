#!/usr/bin/env python3
"""Build PWA icons and iOS splash screens from the app logo."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PURPLE = (108, 0, 248, 255)  # #6C00F8
WHITE = (255, 255, 255, 255)
ROOT = Path('/Users/mansha.hooda/movie app')
PUBLIC = ROOT / 'public'
APP = ROOT / 'src' / 'app'
SOURCE = Path(
    '/Users/mansha.hooda/.cursor/projects/Users-mansha-hooda-movie-app/assets/logo-d485a524-5d29-4460-ad0d-3b98e9361f40.png'
)

IOS_SPLASHES = [
    # (w, h, media)
    (640, 1136, '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)'),
    (750, 1334, '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)'),
    (828, 1792, '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)'),
    (1125, 2436, '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)'),
    (1170, 2532, '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)'),
    (1179, 2556, '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)'),
    (1284, 2778, '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)'),
    (1290, 2796, '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)'),
    (1320, 2868, '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)'),
]


def load_glyph() -> Image.Image:
    """Extract the white bookmark/play mark on a transparent background."""
    source = Image.open(SOURCE).convert('RGBA')
    pixels = source.load()
    width, height = source.size

    def is_white(x: int, y: int, threshold: int = 200) -> bool:
        r, g, b, _a = pixels[x, y]
        return r > threshold and g > threshold and b > threshold

    xs, ys = [], []
    for y in range(height):
        for x in range(width):
            if not is_white(x, y, 230):
                xs.append(x)
                ys.append(y)
    if not xs:
        return source

    x0, x1 = min(xs), max(xs) + 1
    y0, y1 = min(ys), max(ys) + 1
    crop = source.crop((x0, y0, x1, y1))
    w, h = crop.size
    crop_px = crop.load()

    def white_at(x: int, y: int) -> bool:
        r, g, b, _a = crop_px[x, y]
        return r > 200 and g > 200 and b > 200

    # Flood-fill white connected to the crop edge — that's the old JPEG canvas.
    seen = [[False] * w for _ in range(h)]
    queue: list[tuple[int, int]] = []
    for x in range(w):
        for y in (0, h - 1):
            if white_at(x, y):
                queue.append((x, y))
                seen[y][x] = True
    for y in range(h):
        for x in (0, w - 1):
            if white_at(x, y) and not seen[y][x]:
                queue.append((x, y))
                seen[y][x] = True

    i = 0
    while i < len(queue):
        x, y = queue[i]
        i += 1
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and white_at(nx, ny):
                seen[ny][nx] = True
                queue.append((nx, ny))

    glyph = Image.new('RGBA', crop.size, (0, 0, 0, 0))
    glyph_px = glyph.load()
    for y in range(h):
        for x in range(w):
            if white_at(x, y) and not seen[y][x]:
                glyph_px[x, y] = (255, 255, 255, 255)

    bbox = glyph.getbbox()
    return glyph.crop(bbox) if bbox else glyph


def fit_glyph(glyph: Image.Image, box: int) -> Image.Image:
    g = glyph.copy()
    g.thumbnail((box, box), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (box, box), (0, 0, 0, 0))
    canvas.paste(g, ((box - g.width) // 2, (box - g.height) // 2), g)
    return canvas


def make_icon(glyph: Image.Image, size: int, inset_ratio: float = 0.22) -> Image.Image:
    icon = Image.new('RGBA', (size, size), PURPLE)
    inner = int(size * (1 - inset_ratio * 2))
    mark = fit_glyph(glyph, inner)
    icon.paste(mark, ((size - mark.width) // 2, (size - mark.height) // 2), mark)
    return icon.convert('RGB')


def load_font(size: int) -> ImageFont.ImageFont:
    for path in (
        '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
        '/System/Library/Fonts/SFNS.ttf',
        '/Library/Fonts/Arial Bold.ttf',
        '/System/Library/Fonts/Helvetica.ttc',
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def make_splash(glyph: Image.Image, width: int, height: int) -> Image.Image:
    img = Image.new('RGBA', (width, height), PURPLE)
    draw = ImageDraw.Draw(img)
    mark_size = int(min(width, height) * 0.22)
    mark = fit_glyph(glyph, mark_size)
    font_size = max(28, int(width * 0.055))
    font = load_font(font_size)
    text = 'BOOKMARK'
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_w, text_h = text_bbox[2] - text_bbox[0], text_bbox[3] - text_bbox[1]
    gap = int(height * 0.035)
    stack_h = mark.height + gap + text_h
    top = (height - stack_h) // 2
    img.paste(mark, ((width - mark.width) // 2, top), mark)
    draw.text(
        ((width - text_w) / 2, top + mark.height + gap),
        text,
        font=font,
        fill=WHITE,
    )
    return img.convert('RGB')


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, 'PNG', optimize=True)
    print('wrote', path, image.size)


def main() -> None:
    glyph = load_glyph()
    save_png(glyph, PUBLIC / 'logo-mark.png')

    icon_1024 = make_icon(glyph, 1024)
    save_png(icon_1024, PUBLIC / 'icon.png')
    save_png(make_icon(glyph, 180), PUBLIC / 'apple-touch-icon.png')
    save_png(make_icon(glyph, 192), PUBLIC / 'pwa-192x192.png')
    save_png(make_icon(glyph, 512), PUBLIC / 'pwa-512x512.png')
    save_png(make_icon(glyph, 512), APP / 'icon.png')
    save_png(make_icon(glyph, 180), APP / 'apple-icon.png')

    ico_sizes = [16, 32, 48]
    icos = [make_icon(glyph, s) for s in ico_sizes]
    icos[0].save(PUBLIC / 'favicon.ico', format='ICO', sizes=[(s, s) for s in ico_sizes])
    print('wrote', PUBLIC / 'favicon.ico')

    # Default splash used by in-app overlay and a generic apple startup image
    save_png(make_splash(glyph, 1170, 2532), PUBLIC / 'splash.png')
    for w, h, _media in IOS_SPLASHES:
        save_png(make_splash(glyph, w, h), PUBLIC / f'splash-{w}x{h}.png')


if __name__ == '__main__':
    main()

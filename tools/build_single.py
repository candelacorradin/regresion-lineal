"""Genera una versión de la presentación en un solo archivo HTML.

Uso:  python3 tools/build_single.py
Salida: presentacion-regresion-correlacion.html (en la raíz del repo)

Incrusta estilos, tipografías (base64), scripts y el modo presentador.
"""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'presentacion-regresion-correlacion.html'


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def inline_css():
    css = read('css/styles.css')

    def font(m):
        data = base64.b64encode((ROOT / 'fonts' / m.group(1)).read_bytes()).decode()
        return f"url('data:font/woff2;base64,{data}')"

    return re.sub(r"url\('\.\./fonts/([^']+)'\)", font, css)


def script_tag(code):
    # Evita que un "</script>" dentro del código cierre la etiqueta antes de tiempo
    return '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>'


def main():
    css = inline_css()
    style = f'<style>\n{css}\n</style>'

    # Ventana del presentador: mismo HTML, con estilos y config incrustados
    pres = read('presenter.html')
    pres = re.sub(r'<link rel="stylesheet" href="css/styles\.css[^"]*">', lambda m: style, pres)
    pres = re.sub(r'<script src="js/config\.js[^"]*"></script>', lambda m: script_tag(read('js/config.js')), pres)
    pres = pres.replace('src="index.html?embed"', 'src="__SELF__?embed"')
    pres_js = 'window.PRESENTER_HTML = ' + repr_js(pres) + ';'

    html = read('index.html')
    html = re.sub(r'<link rel="stylesheet" href="css/styles\.css[^"]*">', lambda m: style, html)
    for name in ['vendor/xlsx.mini.min', 'excel-data', 'config', 'data', 'charts', 'slides', 'deck']:
        code = read(f'js/{name}.js')
        if name == 'config':
            code += '\n' + pres_js
        html = re.sub(rf'<script src="js/{re.escape(name)}\.js[^"]*"></script>', lambda m, c=code: script_tag(c), html)

    # Solo etiquetas reales al inicio de línea: el código incrustado puede contener texto parecido
    leftovers = re.findall(r'^\s*<(?:script|link|img|iframe)\b[^>]*(?:src|href)="(?!https?:|data:|#)[^"]+"', html, re.M)
    assert not leftovers, f'Quedaron referencias externas: {leftovers}'
    OUT.write_text(html, encoding='utf-8')
    print(f'{OUT.name}: {OUT.stat().st_size / 1024:.0f} KB')


def repr_js(s):
    import json
    return json.dumps(s, ensure_ascii=False).replace('</script', '<\\/script')


if __name__ == '__main__':
    main()

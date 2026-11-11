"""Incrusta el Excel en js/excel-data.js para que la presentación lo muestre sin servidor.

Uso:  python3 tools/embed_excel.py   (después de cambiar datos/Regresion_Salarios_Inflacion_INDEC.xlsx)
"""
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NAME = 'Regresion_Salarios_Inflacion_INDEC.xlsx'
b64 = base64.b64encode((ROOT / 'datos' / NAME).read_bytes()).decode()
(ROOT / 'js' / 'excel-data.js').write_text(
    f"// Generado por tools/embed_excel.py a partir de datos/{NAME}. No editar a mano.\n"
    f"window.EXCEL = {{ nombre: '{NAME}', base64: '{b64}' }};\n", encoding='utf-8')
print(f'js/excel-data.js: {len(b64) / 1024:.0f} KB')

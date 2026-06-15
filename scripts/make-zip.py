import zipfile, os

base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root = os.path.join(base, 'dist')
out = os.path.join(base, 'mundialsimulador-site.zip')
if os.path.exists(out):
    os.remove(out)

with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for dirpath, _dirs, files in os.walk(root):
        for f in files:
            full = os.path.join(dirpath, f)
            rel = os.path.relpath(full, root).replace(os.sep, '/')  # barras correctas
            z.write(full, rel)

with zipfile.ZipFile(out) as z:
    names = z.namelist()
    print('archivos:', len(names))
    print('muestra:', names[:6])
    print('alguna barra invertida?:', any('\\' in n for n in names))
    print('tamano KB:', round(os.path.getsize(out) / 1024, 1))

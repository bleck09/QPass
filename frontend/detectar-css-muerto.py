"""Detector de CSS muerto (PLAN §2.0.7).

No borra comentarios con regex (eso se comía código real cuando un '/*'
aparecía dentro de una cadena). En su lugar junta los sitios donde el JSX
PUEDE poner una clase: className=..., class=..., y cualquier cadena de
texto ('...', "...", `...`), que es donde viven los nombres construidos a
mano. Un nombre que aparezca SOLO en un comentario no cuenta, porque los
comentarios no son cadenas ni className.
"""
import re
import glob
import os

os.chdir('D:/UMA/QPass/frontend/src')

CADENA = re.compile(r'"([^"\n]*)"|\'([^\'\n]*)\'|`([^`]*)`', re.S)

texto_jsx = []
dinamicos = set()
for f in glob.glob('**/*.jsx', recursive=True) + glob.glob('**/*.js', recursive=True):
    s = open(f, encoding='utf-8').read()
    # quitar comentarios de línea que empiezan la línea (documentación)
    for m in CADENA.finditer(s):
        val = m.group(1) or m.group(2) or m.group(3) or ''
        texto_jsx.append(val)
        # prefijos armados dinámicamente: `qp-btn--${variante}`
        for d in re.findall(r'([\w-]{3,})\$\{', val):
            dinamicos.add(d)

blob = '\n'.join(texto_jsx)

css_todo = ''
for f in glob.glob('**/*.css', recursive=True):
    css_todo += open(f, encoding='utf-8').read()

total = 0
for f in sorted(glob.glob('**/*.css', recursive=True)):
    ruta = f.replace(os.sep, '/')
    s = open(f, encoding='utf-8').read()
    cuerpo = re.sub(r'/\*.*?\*/', ' ', s, flags=re.S)  # acá sí: el CSS no tiene cadenas con /*
    clases = sorted(set(re.findall(r'\.([a-zA-Z][\w-]*)', cuerpo)))
    muertas = []
    for c in clases:
        if re.search(r'(?<![\w-])' + re.escape(c) + r'(?![\w-])', blob):
            continue
        if any(c.startswith(d) for d in dinamicos):
            continue
        otros = len(re.findall(r'(?<![\w-])' + re.escape(c) + r'(?![\w-])', css_todo))
        propios = len(re.findall(r'(?<![\w-])' + re.escape(c) + r'(?![\w-])', cuerpo))
        if otros > propios:
            continue
        muertas.append(c)
    if muertas:
        total += len(muertas)
        print('%s  (%d)' % (ruta, len(muertas)))
        for c in muertas:
            print('    .' + c)
print('TOTAL:', total)

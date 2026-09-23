"""Contraste (WCAG 2.1) de las combinaciones texto/fondo del sistema.

Lee los tokens de styles/index.css, resuelve los var() encadenados y calcula
el ratio de las combinaciones que la app usa de verdad. AA pide 4.5:1 para
texto normal y 3:1 para texto grande (>=18.66px bold o >=24px).
"""
import re
import os

os.chdir('D:/UMA/QPass/frontend/src')

s = open('styles/index.css', encoding='utf-8').read()


def tokens_de(bloque):
    return dict(re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', bloque))


# tema claro: el primer :root
m_claro = re.search(r':root\s*\{(.*?)\n\}', s, re.S)
claro = tokens_de(m_claro.group(1))

# tema oscuro: bloque [data-theme="dark"]
m_osc = re.search(r'\[data-theme="dark"\]\s*\{(.*?)\n\}', s, re.S)
oscuro = dict(claro)
if m_osc:
    oscuro.update(tokens_de(m_osc.group(1)))


def resolver(valor, tabla, prof=0):
    valor = valor.strip()
    if prof > 10:
        return None
    m = re.fullmatch(r'var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)', valor)
    if m:
        v = tabla.get(m.group(1))
        return resolver(v, tabla, prof + 1) if v else None
    if re.fullmatch(r'#[0-9a-fA-F]{6}', valor):
        return tuple(int(valor[i:i + 2], 16) for i in (1, 3, 5))
    if re.fullmatch(r'#[0-9a-fA-F]{3}', valor):
        return tuple(int(c * 2, 16) for c in valor[1:])
    return None


def luminancia(rgb):
    def canal(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (canal(x) for x in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = luminancia(a), luminancia(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


PARES = [
    ('--text-primary', '--bg-page'), ('--text-primary', '--bg-surface'),
    ('--text-secondary', '--bg-page'), ('--text-secondary', '--bg-surface'),
    ('--text-secondary', '--bg-sunken'), ('--text-muted', '--bg-surface'),
    ('--ok-text', '--ok-bg'), ('--warn-text', '--warn-bg'),
    ('--danger-text', '--danger-bg'), ('--action', '--bg-surface'),
    ('--text-on-accent', '--action'), ('--text-primary', '--bg-hover'),
]

for nombre, tabla in (('CLARO', claro), ('OSCURO', oscuro)):
    print('=== TEMA %s ===' % nombre)
    for fg, bg in PARES:
        c1, c2 = resolver('var(%s)' % fg, tabla), resolver('var(%s)' % bg, tabla)
        if not c1 or not c2:
            print('   %-22s sobre %-16s  (no se pudo resolver)' % (fg, bg))
            continue
        r = ratio(c1, c2)
        estado = 'OK ' if r >= 4.5 else ('grande' if r >= 3 else 'BAJO')
        print('   %-22s sobre %-16s %5.2f:1  %s' % (fg, bg, r, estado))
    print()

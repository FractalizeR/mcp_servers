import json, os, re, subprocess, sys
from collections import OrderedDict

ROOT = '/Users/fractalizer/PhpstormProjects/github.com/FractalizeR/mcp_servers'
PKG = os.path.join(ROOT, 'packages/servers/yandex-tracker')

REPORT_COMMIT = {
    'tests/live-runs/2_LIVE_RUN_REPORT_2026-08-25c.md': ('8e223af3', '2026-08-25 21:38:28 +0300'),
    'tests/live-runs/0_LIVE_RUN_REPORT_2026-08-26.md': ('4da90142', '2026-08-26 08:34:54 +0300'),
}

src = open(os.path.join(PKG, 'tests/coverage-exceptions/live-observations.ts'), encoding='utf8').read()
block = src[src.index('export const LIVE_OBSERVATIONS'):src.index('export const LIVE_UNREACHABLE')]
recs = re.findall(r"tool: '([a-z_]+)',\s*\n\s*property: '([^']+)',\s*\n\s*runLabel: '([^']+)',\s*\n\s*report: '([^']+)',[\s\S]*?schemaFingerprint: '([0-9a-f]+)',", block)
tools = OrderedDict()
for tool, prop, label, report, fp in recs:
    tools.setdefault(tool, {'props': [], 'report': report, 'label': label, 'fp': fp})
    tools[tool]['props'].append(prop)
    assert tools[tool]['report'] == report and tools[tool]['fp'] == fp, tool

def one(tool, suffix):
    fname = tool.replace('_', '-') + suffix
    hits = [os.path.join(dp, fname) for dp, dn, fn in os.walk(os.path.join(PKG, 'src/tools')) if fname in fn]
    assert len(hits) == 1, (tool, suffix, hits)
    return hits[0]

IMPORT_RE = re.compile(r"""from\s+['"]([^'"]+)['"]""")
UNRESOLVED = set()

def resolve(spec, fromfile):
    if spec.startswith('.'):
        p = os.path.normpath(os.path.join(os.path.dirname(fromfile), spec))
    elif spec.startswith('#'):
        body = spec[1:]
        if body == 'constants':
            body = 'constants.js'
        p = os.path.join(PKG, 'src', body)
    else:
        UNRESOLVED.add(spec)
        return None
    if p.endswith('.js'):
        p = p[:-3] + '.ts'
    if os.path.isdir(p):
        p = os.path.join(p, 'index.ts')
    if not p.endswith('.ts'):
        p += '.ts'
    if not os.path.exists(p):
        UNRESOLVED.add(spec + ' @' + os.path.relpath(fromfile, PKG))
        return None
    return p

def closure(entries):
    seen, stack = set(), list(entries)
    while stack:
        f = stack.pop()
        if f in seen:
            continue
        seen.add(f)
        try:
            txt = open(f, encoding='utf8').read()
        except OSError:
            continue
        for spec in IMPORT_RE.findall(txt):
            r = resolve(spec, f)
            if r and r not in seen:
                stack.append(r)
    return sorted(seen)

def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True).stdout

rows = []
for tool, info in tools.items():
    schema_closure = closure([one(tool, '.schema.ts')])
    contributing = sorted(set(schema_closure) | {one(tool, '.tool.ts')})
    rel = [os.path.relpath(f, ROOT) for f in contributing]
    report_commit, report_date = REPORT_COMMIT[info['report']]
    changed = git('diff', '--name-only', report_commit, 'HEAD', '--', *rel).split()
    changed_wt = git('diff', '--name-only', report_commit, '--', *rel).split()
    hist = []
    for f, r in zip(contributing, rel):
        lc = git('log', '-1', '--format=%h|%ci|%s', '--', r).strip()
        hist.append((os.path.relpath(f, PKG), *(lc.split('|', 2) if lc else ('(нет в git)', '', ''))))
    rows.append({
        'tool': tool, 'props': info['props'], 'label': info['label'], 'fp': info['fp'],
        'report': info['report'], 'report_commit': report_commit, 'report_date': report_date,
        'n_contributing': len(contributing),
        'changed_since_report': sorted(set(changed) | set(changed_wt)),
        'newest': max(hist, key=lambda h: h[2]),
        'hist': hist,
    })

out = {'rows': rows, 'unresolved': sorted(UNRESOLVED)}
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=1)
print('tools:', len(rows), '| unresolved specs:', sorted(UNRESOLVED))
for r in rows:
    mark = 'ИЗМЕНЕНО' if r['changed_since_report'] else 'чисто   '
    print(f"{mark} {r['tool']:<26} файлов={r['n_contributing']:<3} послед.правка={r['newest'][2][:19]} ({r['newest'][1]}) отчёт={r['report_date'][:19]}")
    for c in r['changed_since_report']:
        print('      ->', c)

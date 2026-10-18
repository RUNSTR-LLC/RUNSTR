"""
List src files unreachable from index.js, following static imports,
export-from, require() and dynamic import(). Relative paths only (the repo
has no live path aliases). Run: python3 scripts/diagnostics/find-unreachable-files.py [out.txt]
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXTS = ['.ts', '.tsx', '.js', '.jsx']
SPEC = re.compile(
    r"""(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]"""  # import x from / export * from
    r"""|import\s*['"]([^'"]+)['"]"""                           # side-effect import
    r"""|(?:require|import)\(\s*['"]([^'"]+)['"]\s*\)""",       # require() / import()
    re.S,
)


def resolve(base_dir, spec):
    if not spec.startswith('.'):
        return None
    target = os.path.normpath(os.path.join(base_dir, spec))
    candidates = [target] + [target + e for e in EXTS] + [os.path.join(target, 'index' + e) for e in EXTS]
    for c in candidates:
        if os.path.isfile(c) and os.path.splitext(c)[1] in EXTS:
            return c
    return None


def reachable(entry):
    seen, stack = set(), [entry]
    while stack:
        path = stack.pop()
        if path in seen:
            continue
        seen.add(path)
        try:
            src = open(path, encoding='utf-8').read()
        except OSError:
            continue
        for m in SPEC.finditer(src):
            spec = next(g for g in m.groups() if g)
            dep = resolve(os.path.dirname(path), spec)
            if dep:
                stack.append(dep)
    return seen


def main():
    seen = reachable(os.path.join(ROOT, 'index.js'))
    files = []
    for root, _, names in os.walk(os.path.join(ROOT, 'src')):
        if '__tests__' in root:
            continue
        for n in names:
            if os.path.splitext(n)[1] in EXTS and not n.endswith('.d.ts') and '.test.' not in n:
                files.append(os.path.join(root, n))
    dead = sorted(os.path.relpath(f, ROOT) for f in files if f not in seen)
    print(f'{len(files)} src files, {len(dead)} unreachable from index.js')
    if len(sys.argv) > 1:
        open(sys.argv[1], 'w').write('\n'.join(dead) + '\n')
    else:
        print('\n'.join(dead))


if __name__ == '__main__':
    main()

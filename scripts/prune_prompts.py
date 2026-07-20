#!/usr/bin/env python3
import json, hashlib
from pathlib import Path
p=Path('data/prompts.json')
if not p.exists():
    print('no prompts.json')
    raise SystemExit(1)
items=json.loads(p.read_text())
seen={} 
kept=[]
for it in sorted(items, key=lambda x: x.get('id',0)):
    content=it.get('content','') or ''
    # normalize content
    key=' '.join(content.split()).lower()
    h=hashlib.sha256(key.encode()).hexdigest()
    # skip very short items
    if len(key) < 60:
        print('Pruning short prompt id', it.get('id'))
        continue
    if h in seen:
        print('Duplicate content: skipping id', it.get('id'))
        continue
    seen[h]=it
    kept.append(it)
# write output to new file
out=Path('data/prompts.pruned.json')
out.write_text(json.dumps(kept, indent=2, ensure_ascii=False))
print('Original', len(items), 'pruned', len(kept))

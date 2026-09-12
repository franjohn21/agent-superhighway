"""Pull every agent on imessage.store into src/components/connections/directory.json with logos in public/agents/directory.
Run: python3 scripts/scrape-imessage-store.py. Names and logos belong to their owners; this is a directory, not an endorsement."""
import html, json, os, re, sys, time, urllib.request
BASE = "https://www.imessage.store"
UA = {"User-Agent": "Mozilla/5.0 (agent-superhighway directory builder)"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO_DIR = os.path.join(ROOT, "public", "agents", "directory")
OUT = os.path.join(ROOT, "src", "components", "connections", "directory.json")

def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
        return (data, r.headers.get("Content-Type", "")) if binary else data.decode("utf-8", "replace")

home = get(BASE + "/")
slugs = set(re.findall(r'data-agent-slug="([^"]+)"', home))
for cat in set(re.findall(r'href="(/category/[^"]+)"', home)):
    try:
        slugs |= set(re.findall(r'data-agent-slug="([^"]+)"', get(BASE + cat)))
    except Exception as e:
        print("category failed", cat, e, file=sys.stderr)
print("slugs", len(slugs), file=sys.stderr)

def text(pattern, s):
    m = re.search(pattern, s, re.S)
    return html.unescape(re.sub(r"\s+", " ", m.group(1))).strip() if m else ""

entries = []
for slug in sorted(slugs):
    try:
        page = get(f"{BASE}/agent/{slug}")
    except Exception as e:
        print("agent failed", slug, e, file=sys.stderr); continue
    name = text(r'<h1 class="ag-name">(.*?)</h1>', page)
    if not name: continue
    tagline = text(r'<p class="ag-tag">(.*?)</p>', page)
    about = text(r'<p class="ag-body">(.*?)</p>', page)
    website = text(r'<a class="ag-dev" href="([^"]+)"', page)
    categories = [html.unescape(c) for c in re.findall(r'<a class="ag-chip" href="/category/[^"]+">(.*?)</a>', page)]
    number = text(r'<p class="ag-num">(.*?)</p>', page)
    logo_url = text(r'<span class="ag-id-icon"><img src="([^"]+)"', page)
    logo = ""
    if logo_url:
        if logo_url.startswith("/"): logo_url = BASE + logo_url
        try:
            data, ctype = get(logo_url, binary=True)
            ext = "png" if "png" in ctype else "jpg" if "jpe" in ctype else "webp" if "webp" in ctype else "svg" if "svg" in ctype else "png"
            logo = f"{slug}.{ext}"
            with open(os.path.join(LOGO_DIR, logo), "wb") as f: f.write(data)
        except Exception as e:
            print("logo failed", slug, e, file=sys.stderr)
    entries.append({"slug": slug, "name": name, "tagline": tagline, "about": about, "website": website, "categories": categories, "number": number, "logo": logo, "store": f"{BASE}/agent/{slug}"})
    time.sleep(0.15)
with open(OUT, "w") as f:
    json.dump(entries, f, indent=2, ensure_ascii=False)
print("wrote", len(entries), "entries", file=sys.stderr)

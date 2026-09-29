"""Build a self-contained downloadable Host PC test directory."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
names = ['system-policy.js','system-config.json','SYSTEM_CONFIG_GUIDE.md','host/system_config.py','CONFIG_GUIDE.md','config.js','settings.js','admin.html','admin.js','admin.css','host/scenario-config.json','host/build_scenarios.cjs','index.html','styles.css','app.js','engine.js','host-client.js','host/server.py','host/scenarios.json','host/README.md']
with ZipFile(root / 'host-test.zip', 'w', ZIP_DEFLATED) as z:
    for name in names:
        z.write(root / name, 'robot3-host-test/' + name)
    for p in sorted((root / 'assets').iterdir()):
        if p.is_file():
            z.write(p, 'robot3-host-test/assets/' + p.name)
print('Created host-test.zip')

"""Bundle the local site, photos and font into one offline HTML file."""
from pathlib import Path
import base64,json
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text()
css=(root/'styles.css').read_text()
font=base64.b64encode((root/'assets/PretendardVariable.woff2').read_bytes()).decode()
css=css.replace('assets/PretendardVariable.woff2','data:font/woff2;base64,'+font)
photos={p.stem:'data:image/jpeg;base64,'+base64.b64encode(p.read_bytes()).decode() for p in (root/'assets').glob('*.jpg')}
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>'+css+'</style>')
html=html.replace('src="assets/route.jpg"','src="'+photos['route']+'"')
html=html.replace('<script src="engine.js"></script>','<script>window.EMBEDDED_PHOTOS='+json.dumps(photos)+';</script><script>'+(root/'engine.js').read_text()+'</script>')
html=html.replace('<script src="app.js"></script>','<script>'+(root/'app.js').read_text()+'</script>')
(root/'robot3-simulation.html').write_text(html)
print('Offline HTML created:',(root/'robot3-simulation.html').stat().st_size,'bytes')

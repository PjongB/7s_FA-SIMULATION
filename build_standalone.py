"""Bundle the local site, photos and font into one offline HTML file."""
from pathlib import Path
import base64,json,re
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text()
css=(root/'styles.css').read_text()
font=base64.b64encode((root/'assets/PretendardVariable.woff2').read_bytes()).decode()
css=css.replace('assets/PretendardVariable.woff2','data:font/woff2;base64,'+font)
photos={p.stem:'data:image/jpeg;base64,'+base64.b64encode(p.read_bytes()).decode() for p in (root/'assets').glob('*.jpg')}
html=re.sub(r'<link rel="stylesheet" href="styles\.css(?:\?[^"]*)?">',lambda _: '<style>'+css+'</style>',html)
for key,data in photos.items():
    html=html.replace('src="assets/'+key+'.jpg"','src="'+data+'"')
html=re.sub(r'<script src="engine\.js(?:\?[^"]*)?"></script>',lambda _: '<script>window.EMBEDDED_PHOTOS='+json.dumps(photos)+';</script><script>'+(root/'engine.js').read_text()+'</script>',html)
html=re.sub(r'<script src="host-client\.js(?:\?[^"]*)?"></script>',lambda _: '<script>'+(root/'host-client.js').read_text()+'</script>',html)
html=re.sub(r'<script src="app\.js(?:\?[^"]*)?"></script>',lambda _: '<script>'+(root/'app.js').read_text()+'</script>',html)
(root/'robot3-simulation.html').write_text(html)
print('Offline HTML created:',(root/'robot3-simulation.html').stat().st_size,'bytes')

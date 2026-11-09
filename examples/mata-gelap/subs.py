import re
SEG=[(0.27,2.19,"Setiap kali kamu masuk ke tempat gelap,"),(2.41,4.88,"matamu sebenarnya sedang merakit ulang dirinya."),
(5.28,6.74,"Bayangkan kamu masuk bioskop."),(7.07,8.02,"Semuanya hitam."),(8.32,9.29,"Kamu meraba-raba,"),(9.52,10.85,"lalu menginjak kaki orang."),
(11.42,12.29,"Di detik pertama,"),(12.50,13.38,"pupil melebar,"),(13.58,15.27,"supaya cahaya yang masuk lebih banyak."),(15.66,16.87,"Tapi itu belum cukup."),
(17.56,18.34,"Di belakang mata,"),(18.68,19.95,"ada dua pasukan sel."),(20.24,23.05,"Sel kerucut untuk warna, dan sel batang untuk gelap."),
(23.67,24.43,"Masalahnya,"),(24.77,28.40,"cahaya terang di luar tadi memudarkan zat bernama rodopsin di sel batang."),(28.74,29.49,"Tanpa rodopsin,"),(29.70,31.09,"sel batang tidak bisa bekerja."),
(31.52,33.64,"Jadi mata mulai membuat rodopsin baru,"),(33.92,35.88,"pelan-pelan, dibantu vitamin A."),
(36.63,37.56,"Lima menit pertama,"),(37.85,39.22,"sel kerucut bekerja duluan."),(39.48,40.61,"Kursi mulai kelihatan,"),(40.84,41.49,"tapi samar."),
(42.00,42.97,"Sekitar sepuluh menit,"),(43.22,44.35,"sel batang mengambil alih."),(44.62,45.79,"Dunia jadi abu-abu,"),(46.02,46.92,"tapi makin jelas."),
(47.35,50.98,"Setelah tiga puluh menit, matamu bisa ribuan kali lebih peka dari awal."),
(51.30,54.31,"Tapi ketika orang di sebelahmu menyalakan layar HP yang terang..."),(54.74,56.43,"rodopsinmu pudar lagi dalam sekejap."),
(56.79,57.45,"Dan matamu"),(57.71,58.87,"harus mulai dari nol.")]
KEY={"gelap","merakit","hitam","kaki","pupil","melebar","kerucut","batang","rodopsin","rodopsinmu","vitamin","a","lima","sepuluh","samar","abu-abu","jelas","tiga","puluh","ribuan","hp","pudar","nol","warna","pasukan"}
syl=lambda w: max(1,len(re.findall(r'[aiueoAIUEO]+',w)) if not w[0].isdigit() else 4)
def chunks(words):
    out=[];cur=[]
    for w in words:
        cur.append(w)
        if len(cur)>=4 or (len(' '.join(cur))>=18 and len(cur)>=2) or w.endswith((',','.')) and len(cur)>=2: out.append(cur);cur=[]
    if cur:
        if out and len(cur)==1 and len(' '.join(out[-1]+cur))<=24: out[-1]+=cur
        else: out.append(cur)
    return out
ev=[]
for a,b,t in SEG:
    cs=chunks(t.split()); tot=sum(syl(w) for w in t.split()); acc=0
    for c in cs:
        s=a+(b-a)*acc/tot; acc+=sum(syl(w) for w in c); e=a+(b-a)*acc/tot; ev.append([s,e,c])
for i,e in enumerate(ev):
    nxt=ev[i+1][0] if i+1<len(ev) else 59.15
    e[1]=min(nxt-0.02, max(e[1]+0.25, e[0]+0.55)); e[1]=min(e[1],nxt-0.02)
ts=lambda x:f"{int(x//3600)}:{int(x%3600//60):02d}:{x%60:05.2f}"
def fmt(ws):
    o=[]
    for w in ws:
        core=re.sub(r'[^\w-]','',w).lower()
        o.append(r"{\c&H3AD8FF&}"+w+r"{\c&HFFFFFF&}" if core in KEY else w)
    return ' '.join(o)
hdr="""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter Black,78,&H00FFFFFF,&H00FFFFFF,&H00261724,&H80000000,-1,0,0,0,100,100,0,0,1,7,3,2,90,90,520,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
with open('work/subs.ass','w') as f:
    f.write(hdr)
    for s,e,c in ev:
        f.write(f"Dialogue: 0,{ts(s)},{ts(e)},Cap,,0,0,0,,{{\\fscx80\\fscy80\\t(0,90,\\fscx104\\fscy104)\\t(90,160,\\fscx100\\fscy100)}}{fmt(c)}\n")
print(len(ev),'cues')
for s,e,c in ev[:8]: print(f"{s:.2f}-{e:.2f}", ' '.join(c))

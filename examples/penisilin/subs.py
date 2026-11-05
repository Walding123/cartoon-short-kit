import re
SEG=[(0.29,0.61,"Obat"),(0.76,2.44,"paling penting abad kedua puluh"),(2.62,4.43,"ditemukan karena seorang ilmuwan"),(4.51,5.25,"pergi liburan."),
(6.66,7.11,"London,"),(7.38,9.55,"tahun 1928."),
(10.10,11.11,"Alexander Fleming"),(11.20,12.07,"terkenal jenius…"),(12.24,13.61,"dan terkenal berantakan."),
(14.60,15.88,"Sebelum cuti dua minggu,"),(16.18,18.34,"ia meninggalkan tumpukan cawan berisi bakteri"),(18.44,19.28,"di meja lab."),
(19.66,20.52,"Tidak dirapikan."),(20.83,21.52,"Tidak dibuang."),
(22.63,23.51,"Saat ia pergi,"),(23.68,25.13,"spora jamur melayang masuk,"),(25.35,26.94,"mungkin dari lab di lantai bawah."),
(27.77,28.59,"Begitu kembali,"),(28.83,31.57,"ia memilah cawan satu per satu, siap mencucinya."),(31.90,32.84,"Lalu ia berhenti."),
(33.91,34.72,"Di satu cawan,"),(34.84,36.20,"ada jamur hijau kebiruan."),(36.52,38.31,"Dan di sekelilingnya, bakteri"),(38.59,38.97,"lenyap."),
(39.25,40.92,"Bersih. Seperti ada lingkaran pelindung."),
(41.93,43.97,"Ilmuwan lain mungkin langsung membuangnya."),(44.25,45.61,"Fleming malah penasaran."),
(46.67,48.14,"Ia menumbuhkan jamur itu,"),(48.34,50.17,"dan menyebut cairannya \"jus jamur\"."),
(50.55,52.26,"Jamur itu bernama Penicillium."),(52.54,54.68,"Cairannya kita kenal sebagai penisilin."),
(55.63,56.18,"Kamu tahu,"),(56.41,59.39,"jamur itu seperti tetangga yang tidak mau berbagi halaman."),
(59.70,60.70,"Ia mengeluarkan zat"),(60.78,61.74,"yang membuat bakteri"),(61.83,63.23,"tak bisa tumbuh di dekatnya."),
(64.25,65.47,"Belasan tahun kemudian,"),(65.58,67.38,"ilmuwan lain berhasil memurnikannya,"),(67.57,69.69,"dan penisilin menyelamatkan jutaan nyawa."),
(70.68,72.76,"Jadi kalau ibumu menyuruh merapikan meja…"),(72.98,73.66,"bilang saja,"),(73.85,75.62,"kamu sedang menunggu hadiah Nobel.")]
KEY={"liburan","berantakan","jenius","bakteri","spora","berhenti","jamur","lenyap","bersih","pelindung","penasaran","penicillium","penisilin","tetangga","halaman","nyawa","nobel","1928","london","fleming","membuangnya"}
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
    nxt=ev[i+1][0] if i+1<len(ev) else 76.0
    e[1]=min(nxt-0.02, max(e[1]+0.25, e[0]+0.55)); e[1]=min(e[1],nxt-0.02)
ts=lambda x:f"{int(x//3600)}:{int(x%3600//60):02d}:{x%60:05.2f}"
def fmt(ws):
    o=[]
    for w in ws:
        core=re.sub(r'[^\w]','',w).lower()
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

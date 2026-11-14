import re
SEG=[(0.20,0.97,'Di tengah laut,'),
(1.28,2.21,'tidak ada jalan,'),
(2.50,3.26,'tidak ada rambu,'),
(3.58,4.35,'tidak ada sinyal.'),
(4.82,7.32,'Tapi HP-mu tetap tahu persis kamu di mana.'),
(7.61,8.56,'Bagaimana caranya?'),
(8.82,9.81,'Pak Udin, nelayan,'),
(9.81,11.94,'hanyut setelah mesin perahunya mati.'),
(12.29,13.77,'Sejauh mata memandang,'),
(13.77,14.40,'hanya air.'),
(14.82,16.07,'Ia membuka peta di HP.'),
(16.43,17.36,'Titik biru muncul,'),
(17.67,18.86,'tepat di tengah lautan.'),
(19.14,22.48,'Rahasianya ada dua puluh ribu kilometer di atas kepalanya.'),
(22.87,24.51,'Sekitar tiga puluh satelit GPS'),
(24.51,25.47,'mengelilingi bumi,'),
(25.71,26.60,'dua kali sehari.'),
(27.03,28.66,'Setiap satelit membawa jam atom,'),
(28.93,30.21,'dan terus berteriak ke bumi:'),
(30.60,31.29,'aku di sini,'),
(31.48,32.59,'sekarang jam sekian.'),
(32.78,34.60,'Teriakan itu melesat secepat cahaya,'),
(34.91,36.84,'tapi tetap terlambat sepersekian detik.'),
(37.17,38.45,'Dari keterlambatan itu,'),
(38.45,39.58,'HP menghitung jaraknya.'),
(39.99,42.20,'Satu satelit memberi satu lingkaran kemungkinan.'),
(42.54,43.12,'Dua satelit,'),
(43.31,44.41,'lingkarannya berpotongan.'),
(44.71,45.35,'Tiga satelit,'),
(45.57,46.46,'tinggal satu titik.'),
(46.75,48.08,'Itulah posisi Pak Udin.'),
(48.08,49.85,'Satelit keempat membetulkan jam HP,'),
(50.08,51.54,'yang tidak sepresisi jam atom.'),
(51.93,53.60,'Tapi ketika pulsa Pak Udin habis'),
(53.60,54.85,'dan sinyal operator hilang,'),
(54.85,56.24,'titik birunya tetap berkedip.'),
(56.60,58.85,'Ternyata HP-mu tidak pernah bicara ke satelit.'),
(59.15,60.05,'Ia hanya mendengarkan.')]
KEY={"laut","sinyal","hp-mu","hp","udin","mati","air","peta","biru","dua","puluh","ribu","kilometer","tiga","satelit","gps","atom","berteriak","cahaya","terlambat","jaraknya","lingkaran","satu","titik","keempat","pulsa","habis","hilang","berkedip","mendengarkan","bicara"}
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
    nxt=ev[i+1][0] if i+1<len(ev) else 60.15
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

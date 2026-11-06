import re
SEG=[(0.31,2.18,"Jajanan beku paling laris di dunia,"),(2.44,5.46,"konon ditemukan oleh anak yang lupa membereskan gelasnya."),
(6.25,7.79,"Tahun 1905,"),(8.12,10.19,"seorang bocah sebelas tahun bernama Frank"),(10.49,12.12,"mencampur bubuk soda dengan air."),
(12.76,14.83,"Ia mengaduknya dengan sebatang kayu kecil."),(15.34,16.70,"Lalu perhatiannya teralih,"),(17.00,18.62,"dan gelas itu tertinggal di teras."),
(19.22,19.86,"Malam itu,"),(20.12,21.35,"udara turun sangat dingin."),(21.87,22.59,"Pagi harinya,"),(22.80,23.99,"minumannya membeku keras,"),
(24.26,26.16,"dengan batang kayu masih menancap di tengah."),(26.76,27.63,"Frank menariknya,"),(27.85,29.18,"dan esnya ikut terangkat utuh."),
(29.71,30.58,"Ia menjilatnya."),(30.92,31.35,"Manis."),(31.90,34.06,"Bertahun-tahun ia membuatnya untuk teman,"),(34.31,35.75,"lalu untuk anak-anaknya sendiri."),
(36.24,37.84,"Baru delapan belas tahun kemudian,"),(38.10,39.49,"ia mendaftarkan hak patennya."),
(40.12,43.07,"Tapi nama yang kini terkenal di seluruh dunia itu bukan darinya."),(43.54,45.23,"Nama itu diberikan anak-anaknya,"),
(45.48,46.17,"yang menyebutnya:"),(46.50,47.32,"es punya Papa.")]
KEY={"beku","laris","lupa","1905","frank","soda","kayu","teras","dingin","membeku","keras","utuh","manis","teman","anak-anaknya","delapan","belas","patennya","terkenal","bukan","darinya","papa","es","punya"}
syl=lambda w: max(1,len(re.findall(r'[aiueoAIUEO]+',w)) if not w[0].isdigit() else 8)
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
    nxt=ev[i+1][0] if i+1<len(ev) else 47.5
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

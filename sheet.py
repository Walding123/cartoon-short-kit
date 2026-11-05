import sys,glob,os
from PIL import Image,ImageDraw
d,out=sys.argv[1],sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 8
fs=sorted(glob.glob(d+'/*.jpg')); tw,th=216,384
rows=(len(fs)+cols-1)//cols; S=Image.new('RGB',(cols*tw,rows*(th+18)),'#222'); D=ImageDraw.Draw(S)
for i,f in enumerate(fs):
  im=Image.open(f).resize((tw,th)); x,y=(i%cols)*tw,(i//cols)*(th+18); S.paste(im,(x,y)); D.text((x+4,y+th+3),os.path.basename(f)[1:5],fill='#fff')
S.save(out,quality=88)

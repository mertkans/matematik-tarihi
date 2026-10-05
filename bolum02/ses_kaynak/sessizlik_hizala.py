import json,re,math
S=json.load(open('/home/user/matematik-tarihi/bolum02/scenes.json'))
instr=open('/tmp/claude-0/instr.txt').read().strip()
units=[]  # (text, tag)
def sents(t): return [x for x in re.split(r'(?<=[.!?:;])\s+',t.strip()) if x]
parts=[(0,5),(5,10),(10,15)]
for a,b in parts:
    for x in sents(instr): units.append((x,'TALIMAT'))
    for i in range(a,b):
        for k,x in enumerate(sents(S[i]['text'])): units.append((x,'S%02d'%(i+1) + ('*' if k==0 else '')))
sil=[tuple(map(float,l.split())) for l in open('sil2.txt')]
END=538.32
# aday sınırlar: (konuşma bitişi, konuşma başlangıcı)
C=[(0.0,0.0)]+[(s,e) for s,e in sil]+[(END,END)]
if sil[0][0]<0.05: C=[(0.0,sil[0][1])]+[(s,e) for s,e in sil[1:]]+[(END,END)]
w=[len(t)+3*len(re.findall('[,;:]',t)) for t,_ in units]
N,M=len(units),len(C)
def solve(r):
    INF=1e18; D=[[INF]*M for _ in range(N+1)]; P=[[-1]*M for _ in range(N+1)]
    D[0][0]=0
    for i in range(1,N+1):
        for b in range(1,M):
            best=INF;arg=-1
            for a in range(max(0,b-25),b):
                if D[i-1][a]>=INF: continue
                dur=C[b][0]-C[a][1]
                if dur<=0.2: continue
                inner=sum(max(0,(C[k][1]-C[k][0])-0.55) for k in range(a+1,b))
                gap=C[b][1]-C[b][0]
                c=D[i-1][a]+math.log(dur/(w[i-1]*r))**2+4*inner**2-0.3*min(gap,1.2)
                if c<best: best=c;arg=a
            D[i][b]=best;P[i][b]=arg
    b=M-1; path=[b]
    for i in range(N,0,-1): b=P[i][b]; path.append(b)
    return D[N][M-1],path[::-1]
r=(END-0.5*100)/sum(w)
for it in range(3):
    cost,path=solve(r)
    durs=[C[path[i+1]][0]-C[path[i]][1] for i in range(N)]
    r=sum(durs)/sum(w)
    print('iter',it,'cost',round(cost,2),'rate',round(1/r,2),'char/s')
res=[]
for i,(t,tag) in enumerate(units):
    st=C[path[i]][1]; en=C[path[i+1]][0]; ratio=(en-st)/(w[i]*r)
    res.append(dict(tag=tag,s=round(st,3),e=round(en,3),ratio=round(ratio,2),t=t[:50]))
json.dump(res,open('hiza.json','w'),ensure_ascii=False,indent=0)
for x in res: print(f"{x['tag']:8s} {x['s']:7.2f}-{x['e']:7.2f} {x['ratio']:5.2f} {x['t']}")

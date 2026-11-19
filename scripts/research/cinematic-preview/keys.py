from vpython import *
notes = ['C4', 'D4', 'E4', 'G4', 'A4']
colors = [vector(.30,.65,1), vector(.15,.85,.80), vector(.54,.92,.47), vector(1,.60,.26), vector(.90,.33,.61)]
keys = []
for i in range(5):
    keys.append(box(pos=vector((i-2)*1.45,0,0), size=vector(1.12,.32,2.7), color=colors[i]))
# 숫자 1~5를 눌러 연주하세요.
while True:
    event = scene.waitfor('keydown')
    if event.key in ['1','2','3','4','5']:
        i = int(event.key)-1
        keys[i].emissive = True
        play_note(notes[i], duration=0.7)
        sleep(0.7)
        keys[i].emissive = False

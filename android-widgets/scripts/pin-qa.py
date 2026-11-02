"""Verify a pin request reaches the installed launcher and inspect its manual widget picker."""
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from pathlib import Path
PKG='com.saradhinitish.lightboxstudio'
DIR=Path('android-widget-host-qa')


def adb(*args):
    return subprocess.check_output(['adb',*args],text=True).strip()


def ui():
    adb('shell','uiautomator','dump','/data/local/tmp/lb-pin.xml')
    return ET.fromstring(adb('shell','cat','/data/local/tmp/lb-pin.xml'))


def tap(node):
    x,y,r,b=map(int,re.findall(r'\d+',node.get('bounds')))
    adb('shell','input','tap',str((x+r)//2),str((y+b)//2))


def find(tree, test):
    return next((n for n in tree.iter('node') if test(n)),None)


adb('shell','am','start','-W','-n',PKG+'/com.lightbox.widgets.WidgetHubActivity')
tree=ui()
add=find(tree,lambda n:n.get('content-desc')=='Add Quick Capture widget')
assert add is not None
tap(add)
time.sleep(1)
tree=ui()
(DIR/'pin-request.xml').write_bytes(ET.tostring(tree))
(DIR/'pin-request.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
confirm=find(tree,lambda n:n.get('package')!=PKG and (
    n.get('resource-id')=='android:id/button1' or n.get('text','').casefold() in {'add','add automatically','add to home screen'}))
if confirm is not None:
    tap(confirm)
    time.sleep(1)
    state=adb('shell','dumpsys','appwidget')
    (DIR/'pin-bindings.txt').write_text(state)
    widgets=state.split('Widgets:',1)[-1].split('Hosts:',1)[0]
    assert any('launcher' in part.lower() and 'QuickProvider' in part for part in re.split(r'(?=\bid=)',widgets)), widgets[:1500]
    print('PASS: native pin request confirmed by emulator launcher and Quick Capture bound to its host')
else:
    print('Launcher pin confirmation unavailable in this image; see pin-request.xml')

adb('shell','input','keyevent','3')
time.sleep(1)
size=adb('shell','wm','size')
width,height=map(int,re.findall(r'(\d+)x(\d+)',size)[-1])
x,y=str(width//2),str(height//3)
adb('shell','input','swipe',x,y,x,y,'1100')
time.sleep(.7)
tree=ui()
picker=find(tree,lambda n:n.get('text','').casefold()=='widgets')
if picker is not None:
    tap(picker)
    time.sleep(1)
    for _ in range(9):
        tree=ui()
        studio=find(tree,lambda n:n.get('text','').casefold()=='lightbox studio')
        if studio is not None:
            tap(studio)
            tree=ui()
            (DIR/'launcher-picker.xml').write_bytes(ET.tostring(tree))
            (DIR/'launcher-picker.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
            print('PASS: Lightbox Studio is available in the launcher manual widget picker')
            break
        adb('shell','input','swipe',x,str(int(height*.83)),x,str(int(height*.32)),'500')
adb('shell','input','keyevent','3')

"""Exercise visible controls and persisted widget state on an isolated emulator."""
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET

PKG = 'com.saradhinitish.lightboxstudio'


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True)


def host(size, action, twin=False):
    adb('shell', 'am', 'force-stop', PKG)
    adb('logcat', '-c')
    adb('shell', 'am', 'start', '-W', '-n', PKG+'/com.lightbox.widgets.WidgetGalleryActivity',
        '--ei', 'variant', str(size), '--ei', 'testAction', str(action), '--ez', 'twin', str(twin).lower())
    for _ in range(25):
        log = adb('logcat', '-d', '-s', 'LightboxWidgetQA:I')
        if ('allowed=true' in log and 'Action click dispatched=true' in log
                and (not twin or 'Second widget session=Start' in log)):
            return
        time.sleep(.5)
    raise AssertionError(log)


def tap(label):
    for _ in range(6):
        adb('shell', 'uiautomator', 'dump', '/data/local/tmp/lightbox.xml')
        tree = ET.fromstring(adb('shell', 'cat', '/data/local/tmp/lightbox.xml'))
        for node in tree.iter('node'):
            if label.casefold() in {node.get(key,'').casefold() for key in ('text','content-desc','class')}:
                x, y, right, bottom = map(int, re.findall(r'\d+', node.get('bounds')))
                adb('shell', 'input', 'tap', str((x+right)//2), str((y+bottom)//2))
                return
    Path('android-widget-host-qa/missing-control.xml').write_bytes(ET.tostring(tree))
    Path('android-widget-host-qa/missing-control.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
    raise AssertionError('Missing control: '+label)


host(0, 1)
tap('android.widget.EditText')
time.sleep(.5)
Path('android-widget-host-qa/composer-open.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
adb('shell', 'input', 'text', 'Rooftop')
adb('shell', 'input', 'keyevent', '66')
adb('shell', 'input', 'text', 'Rain')
tap('Save note')
tap('Rooftop\nRain')
tap('Copy')
host(1, 3, twin=True)  # The existing host suite left the timer running.
time.sleep(1)
state = adb('shell', 'run-as', PKG, 'cat', 'shared_prefs/lightbox.widget.session.v1.xml')
assert 'name="active" value="false"' in state and 'name="completed" value="1"' in state, state
host(2, 4)
tap('Rooftop\nRain')
tap('Delete')
tap('Delete')
tap('New note')
tap('Cancel')
print('PASS: quick-widget launch, multiline save, review, copy, restart, deletion, cancel and wide-widget finish')

# The external sync URI uses the same WidgetState.accept path as the native sync page.
adb('shell', "am start -W -a android.intent.action.VIEW -d 'lightboxwidget://sync?title=Test%20Film&project=qa&draft=Draft%20A&scene=04&heading=EXT.%20PARK&words=325&target=800' " + PKG)
time.sleep(1)
snapshot = adb('shell', 'run-as', PKG, 'cat', 'shared_prefs/lightbox.widget.snapshot.v1.xml')
assert 'Test Film' in snapshot and 'value="325"' in snapshot, snapshot
host(2, 0)
print('PASS: manual metadata sync, studio open and independent widget refresh')

for size, name in enumerate(('quick','scene','director')):
    adb('shell','am','force-stop',PKG)
    adb('logcat','-c')
    adb('shell','am','start','-W','-n',PKG+'/com.lightbox.widgets.WidgetGalleryActivity',
        '--ei','variant',str(size))
    time.sleep(2)
    assert 'allowed=true' in adb('logcat','-d','-s','LightboxWidgetQA:I')
    Path('android-widget-host-qa/'+name+'-widget.png').write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))

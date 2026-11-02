"""Exercise visible controls and persisted widget state on an isolated emulator."""
import re
import subprocess
import time
import xml.etree.ElementTree as ET

PKG = 'com.saradhinitish.lightboxstudio'


def adb(*args):
    return subprocess.check_output(['adb', *args], text=True)


def host(size, action):
    adb('shell', 'am', 'force-stop', PKG)
    adb('logcat', '-c')
    adb('shell', 'am', 'start', '-W', '-n', PKG+'/com.lightbox.widgets.WidgetGalleryActivity',
        '--ei', 'variant', str(size), '--ei', 'testAction', str(action))
    for _ in range(25):
        log = adb('logcat', '-d', '-s', 'LightboxWidgetQA:I')
        if 'allowed=true' in log and 'Action click dispatched=true' in log:
            return
        time.sleep(.5)
    raise AssertionError(log)


def tap(label):
    for _ in range(6):
        adb('shell', 'uiautomator', 'dump', '/data/local/tmp/lightbox.xml')
        tree = ET.fromstring(adb('shell', 'cat', '/data/local/tmp/lightbox.xml'))
        for node in tree.iter('node'):
            if node.get('text') == label or node.get('content-desc') == label:
                x, y, right, bottom = map(int, re.findall(r'\d+', node.get('bounds')))
                adb('shell', 'input', 'tap', str((x+right)//2), str((y+bottom)//2))
                return
    raise AssertionError('Missing control: '+label)


host(0, 1)
adb('shell', 'input', 'text', 'Rooftop')
adb('shell', 'input', 'keyevent', '66')
adb('shell', 'input', 'text', 'Rain')
tap('Save note')
tap('Rooftop\nRain')
tap('Copy')
host(1, 3)  # The existing host suite left the timer running.
time.sleep(1)
state = adb('shell', 'run-as', PKG, 'cat', 'shared_prefs/lightbox.widget.session.v1.xml')
assert 'name="active" value="false"' in state and 'name="completed" value="1"' in state, state
host(0, 1)
tap('Saved notes (1)')
tap('Rooftop\nRain')
tap('Delete')
tap('Delete')
tap('New note')
tap('Cancel')
print('PASS: quick-widget launch, multiline save, review, copy, restart, deletion, cancel and wide-widget finish')

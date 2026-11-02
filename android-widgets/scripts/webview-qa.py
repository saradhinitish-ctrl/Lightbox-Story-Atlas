"""Verify the actual APK WebView, including same-origin offline use, from the debug socket."""
import json
from pathlib import Path
import subprocess
import time
from urllib.request import urlopen
from websocket import create_connection

PKG = 'com.saradhinitish.lightboxstudio'
OUT = Path('android-launcher-qa')


def adb(*cmd):
    return subprocess.check_output(['adb', *cmd], text=True).strip()


def connect():
    adb('shell','am','force-stop',PKG)
    adb('shell','am','start','-W','-n', PKG+'/com.lightbox.widgets.StudioLauncherActivity')
    for _ in range(80):
        try:
            pid=adb('shell','pidof',PKG)
            adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid)
            target=json.load(urlopen('http://127.0.0.1:9222/json',timeout=2))[0]
            return create_connection(target['webSocketDebuggerUrl'],suppress_origin=True,timeout=10)
        except (OSError,IndexError,KeyError):
            time.sleep(.5)
    raise AssertionError('No debug WebView target')


def evaluate(expression):
    sock.send(json.dumps({'id':1,'method':'Runtime.evaluate','params':{'expression':expression,'returnByValue':True}}))
    while True:
        result=json.loads(sock.recv())
        if result.get('id')==1:
            return result.get('result',{}).get('result',{}).get('value')


def until(expression):
    for _ in range(90):
        if evaluate(expression):
            return
        time.sleep(.5)
    raise AssertionError('WebView condition: '+expression+'; page: '+str(evaluate('document.body.innerText.slice(0,350)')))


def screenshot(name):
    (OUT/name).write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))


adb('shell','svc','wifi','disable')
adb('shell','svc','data','disable')
try:
    sock=connect()
    until("document.querySelector('.manuscript-title input') && !document.getElementById('lb-opener')")
    assert evaluate("location.origin")=='https://lightbox-studio.vercel.app'
    assert evaluate("document.querySelectorAll('a[href=\"lightboxwidget://manager\"]').length")==1
    screenshot('studio-offline-welcome.png')
    evaluate("document.querySelector('.manuscript-title input').value='Rain Check';document.querySelector('.welcome button.primary').click()")
    until("document.querySelector('form input[placeholder=\"Name this world\"]')?.value==='Rain Check'")
    evaluate("document.querySelector('form button[type=submit]').click()")
    until("document.querySelector('.story-atlas')?.innerText.includes('Rain Check') || !!document.querySelector('.story-atlas')")
    # Wait for the existing portable application's normal IndexedDB save before killing its process.
    evaluate("""window.qaSaved=false;let db=indexedDB.open('lightbox-portable-v64',1);
db.onsuccess=()=>{const check=()=>{const r=db.result.transaction('workspace').objectStore('workspace').get('current');
r.onsuccess=()=>{if(r.result?.state?.projects?.some(p=>p.title==='Rain Check')){window.qaSaved=true;db.result.close()}else setTimeout(check,100)}};
check()}""")
    until("window.qaSaved")
    sock.close()
    sock=connect()
    until("!!document.querySelector('.story-atlas')")
    evaluate("document.querySelector('.native-utilities a').click()")
    time.sleep(1)
    assert 'WidgetHubActivity' in adb('shell','dumpsys','activity','activities').split('topResumedActivity=')[-1][:260]
    adb('shell','input','keyevent','4')
    evaluate("location.href='/widgets.html'")
    until("document.querySelector('#project')?.selectedOptions[0]?.textContent==='Rain Check'")
    evaluate("document.getElementById('launch').click()")
    for _ in range(20):
        snapshot=subprocess.run(['adb','shell','run-as',PKG,'cat','shared_prefs/lightbox.widget.snapshot.v1.xml'],capture_output=True,text=True)
        if 'Rain Check' in snapshot.stdout:
            break
        time.sleep(.5)
    else:
        raise AssertionError('Real web-to-native sync did not save the story')
    print('PASS: real APK offline welcome, create, persistent project after process restart, footer → native manager, manual story sync')
finally:
    adb('shell','svc','wifi','enable')
    adb('shell','svc','data','enable')

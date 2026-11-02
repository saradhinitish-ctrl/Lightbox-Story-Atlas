"""Verify the actual APK WebView, including same-origin offline use, from the debug socket."""
import base64
import json
import sys
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


def read_state_js():
    return """window.qaState=null;const req=indexedDB.open('lightbox-portable-v64',1);
req.onsuccess=()=>{const d=req.result;const t=d.transaction('workspace').objectStore('workspace').get('current');
t.onsuccess=()=>{window.qaState=t.result;d.close()}}"""


if len(sys.argv)>1:
    mode=sys.argv[1]
    sock=connect()
    if mode=='seed-old':
        # The old debug WebView stores the fixture under its real studio origin.
        url='https://lightbox-studio.vercel.app/upgrade-fixture'
        sock.send(json.dumps({'id':7,'method':'Fetch.enable','params':{'patterns':[{'urlPattern':url}]}}))
        while json.loads(sock.recv()).get('id')!=7:
            pass
        sock.send(json.dumps({'id':8,'method':'Page.navigate','params':{'url':url}}))
        while True:
            event=json.loads(sock.recv())
            if event.get('method')=='Fetch.requestPaused':
                sock.send(json.dumps({'id':9,'method':'Fetch.fulfillRequest','params':{
                    'requestId':event['params']['requestId'],'responseCode':200,
                    'responseHeaders':[{'name':'Content-Type','value':'text/html'}],
                    'body':base64.b64encode(b'<!doctype html><title>Upgrade fixture</title>').decode()}}))
                break
        until("document.title==='Upgrade fixture'")
        fixture=Path('/tmp/lightbox-workspace-fixture.json').read_text()
        evaluate("""let r=indexedDB.open('lightbox-portable-v64',1);
r.onupgradeneeded=()=>r.result.createObjectStore('workspace');
r.onsuccess=()=>{let t=r.result.transaction('workspace','readwrite');t.objectStore('workspace').put("""+
                 fixture+""",'current');t.oncomplete=()=>{window.seeded=true;r.result.close()}}""")
        until("window.seeded")
    elif mode=='verify-upgrade':
        until("!!document.querySelector('.story-atlas')")
        evaluate(read_state_js())
        until("window.qaState?.state?.projects?.some(p=>p.title==='Rain Check')")
        print('PASS: existing 1.0.4 WebView workspace survived the same-key debug update')
    else:
        raise AssertionError(mode)
    sock.close()
    sys.exit(0)


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
    evaluate(read_state_js())
    until("!!window.qaState")
    Path('/tmp/lightbox-workspace-fixture.json').write_text(json.dumps(evaluate("window.qaState")))
    sock.close()
    sock=connect()
    until("!!document.querySelector('.story-atlas')")
    until("!!document.querySelector('.native-utilities a') && !document.getElementById('lb-opener')")
    evaluate("document.querySelector('.native-utilities a').click()")
    for _ in range(25):
        activities=adb('shell','dumpsys','activity','activities')
        if any('topResumedActivity=' in line and 'WidgetHubActivity' in line for line in activities.splitlines()):
            break
        time.sleep(.4)
    else:
        (OUT/'footer-activities.txt').write_text(activities)
        raise AssertionError('Footer did not open native widget manager')
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

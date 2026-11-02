"""Run the shipped static bundle with exactly the resource substitutions made by the APK."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

ROOT = Path.cwd()
ASSETS = ROOT / "android-widgets/app/src/main/assets/studio"
OUT = ROOT / "android-welcome-qa"
OUT.mkdir(exist_ok=True)


class Studio(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        asset = ASSETS / urlparse(path).path.lstrip('/')
        if asset.parent == ASSETS and asset.is_file():
            return str(asset)
        return super().translate_path(path)


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Studio, directory=ROOT))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}'
options = webdriver.ChromeOptions()
options.add_argument('--headless=new')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--user-agent=Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36 LightboxNativeAndroid/1.0.5')
with webdriver.Chrome(options=options) as driver:
    wait = WebDriverWait(driver, 25)
    def visible(selector):
        return wait.until(lambda d: next((x for x in d.find_elements(By.CSS_SELECTOR, selector) if x.is_displayed()), False))

    for width in [320, 412]:
        driver.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',
                               dict(width=width, height=760, deviceScaleFactor=1, mobile=True))
        driver.get(origin)
        wait.until(lambda d: not d.find_elements(By.ID, 'lb-opener'))
        assert visible('.welcome h1').text == 'Story shelf'
        create = visible('.welcome > button.primary')
        assert create.text.strip() == 'Create a story'
        assert not any(x.is_displayed() for x in driver.find_elements(By.CSS_SELECTOR,'.lb-native-choice,.install-app,.lb-browser-install'))
        assert driver.execute_script('return document.documentElement.scrollWidth <= innerWidth')
        assert len(driver.find_elements(By.CSS_SELECTOR, 'a[href="lightboxwidget://manager"]')) == 1
        driver.save_screenshot(str(OUT/f'welcome-{width}.png'))
    visible('.manuscript-title input').send_keys('The Blue Room')
    create.click()
    title = visible('input[placeholder="Name this world"]')
    assert title.get_attribute('value') == 'The Blue Room'
    visible('form button[type="submit"]').click()
    wait.until(lambda d: not d.find_elements(By.CSS_SELECTOR,'.welcome'))
    visible('.story-atlas')
    assert len(driver.find_elements(By.CSS_SELECTOR,'.story-atlas .native-utilities')) == 1
    driver.refresh()
    visible('.story-atlas')
    driver.get(origin+'/widgets.html')
    wait.until(lambda d: d.find_element(By.ID,'project').is_enabled())
    assert visible('#project').text.strip() == 'The Blue Room'
    href = visible('#launch').get_attribute('href')
    assert href.startswith('intent://sync?') and 'title=The+Blue+Room' in href and 'words=' in href
    print('PASS: welcome at 320 and 412 CSS px, create, restore-story-on-reload, one footer, native sync metadata')
server.shutdown()

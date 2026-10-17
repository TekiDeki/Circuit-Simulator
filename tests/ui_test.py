"""End-to-end UI test for index.html (Playwright, Chromium).

Run:  python3 build.py && python3 tests/ui_test.py
Serves the repository root on a local port, drives the real UI with mouse and touch input,
and fails on any page error or console error.
"""
import http.server
import os
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SHOTS = os.environ.get("SHOTS", "/tmp/cl-shots")
os.makedirs(SHOTS, exist_ok=True)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    os.chdir(ROOT)
    httpd = socketserver.TCPServer(("127.0.0.1", 0), Quiet)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, "http://127.0.0.1:%d/index.html" % httpd.server_address[1]


FAILS = []


def check(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


def hole_center(page, hole):
    return page.evaluate(
        """(h) => { const el = document.querySelector('circle[data-hole="' + h + '"]');
          const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }""", hole)


def part_center(page, pid):
    return page.evaluate(
        """(id) => { const el = document.querySelector('g[data-part="' + id + '"]');
          const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }""", pid)


def run(pw, url, viewport, label, touch):
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport=viewport, has_touch=touch, is_mobile=False,
                              locale="en-US", device_scale_factor=1)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
    page.goto(url, wait_until="load")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="load")
    page.wait_for_timeout(300)

    check(page.title().startswith("Circuit Lab"), label + ": title")
    check(page.get_attribute("html", "lang") == "en", label + ": default language from browser is en")
    check(page.locator("svg#board circle.hole").count() == 30 * 10 + 30 * 4, label + ": 420 holes drawn")

    # small touch targets
    small = page.evaluate("""() => [...document.querySelectorAll('#toolbar button, .tabs button, .lang button')]
        .filter(b => b.offsetParent && b.getBoundingClientRect().height < 40).map(b => b.textContent.trim())""")
    check(not small, label + ": toolbar/tab buttons at least 40 px tall " + (str(small) if small else ""))

    # load LED lesson preset from the example picker
    page.select_option("#examples", "2")
    page.wait_for_timeout(200)
    check(page.locator("g[data-part]").count() >= 3, label + ": LED lesson loads parts")
    page.click("#btnSimulate")
    page.wait_for_timeout(200)
    status = page.inner_text("#status")
    check("I =" in status, label + ": simulate reports current (" + status + ")")
    shot = os.path.join(SHOTS, label.replace(" ", "_") + "_lab.png")
    page.screenshot(path=shot, full_page=True)

    # remove the resistor: LED must burn and stay burned after reload
    res = page.evaluate("""() => { const g = [...document.querySelectorAll('g[data-part]')];
        return g.map(x => x.dataset.part); }""")
    resistor_id = None
    st = page.evaluate("() => JSON.parse(localStorage.getItem('circuit-lab:v1')).circuit.parts")
    for p in st:
        if p["type"] == "resistor":
            resistor_id = p["id"]
    check(resistor_id is not None, label + ": resistor found in saved circuit")
    x, y = part_center(page, resistor_id)
    if touch:
        page.touchscreen.tap(x, y)
    else:
        page.mouse.click(x, y)
    page.wait_for_timeout(150)
    check(page.locator("#inspectTitle").inner_text().startswith("Resistor"), label + ": tap selects resistor")
    page.click("[data-act=delete-part]")
    page.wait_for_timeout(120)
    # bridge the battery straight to the LED with a wire (the mistake a learner makes)
    page.click("[data-tool=wire]")
    for hole in ["P1+3", "e7"]:
        hx, hy = hole_center(page, hole)
        if touch:
            page.touchscreen.tap(hx, hy)
        else:
            page.mouse.click(hx, hy)
        page.wait_for_timeout(100)
    page.click("[data-tool=select]")
    page.click("#btnSimulate")
    page.wait_for_timeout(200)
    st = page.evaluate("() => JSON.parse(localStorage.getItem('circuit-lab:v1')).circuit.parts")
    led = [p for p in st if p["type"] == "led"][0]
    check(led.get("burned") is True, label + ": LED without resistor burns")
    check(page.locator("#readout .tag.burn").count() >= 1, label + ": readout shows burned LED")
    # undo restores the resistor but cannot un-burn the LED
    page.keyboard.press("Control+z")
    page.keyboard.press("Control+z")
    page.wait_for_timeout(150)
    st = page.evaluate("() => JSON.parse(localStorage.getItem('circuit-lab:v1')).circuit.parts")
    check(any(p["type"] == "resistor" for p in st), label + ": two Ctrl+Z restore the removed resistor")
    led = [p for p in st if p["type"] == "led"][0]
    check(led.get("burned") is True, label + ": undo does not un-burn the LED")

    page.reload(wait_until="load")
    page.wait_for_timeout(250)
    st = page.evaluate("() => JSON.parse(localStorage.getItem('circuit-lab:v1')).circuit.parts")
    led = [p for p in st if p["type"] == "led"][0]
    check(led.get("burned") is True, label + ": burned LED still burned after reload")

    # language switch: Serbian Cyrillic and Romanian
    page.click("[data-lang=sr-cyrl]")
    page.wait_for_timeout(150)
    check(page.get_attribute("html", "lang") == "sr-Cyrl", label + ": sr-cyrl sets html lang")
    check(any("\u0400" <= c <= "\u04ff" for c in page.inner_text("#tagline")), label + ": sr-cyrl tagline is Cyrillic")
    page.click("[data-lang=ro]")
    page.wait_for_timeout(150)
    check("Simulator" in page.inner_text("#tagline"), label + ": ro tagline")
    page.click("[data-lang=sr-latn]")
    page.wait_for_timeout(150)
    check(page.get_attribute("html", "lang") == "sr-Latn", label + ": sr-latn sets html lang")
    page.click("[data-lang=en]")

    # lessons
    page.click("#tabBtnLessons") if page.locator("#tabBtnLessons").count() else page.click("[data-tab=lessons]")
    page.wait_for_timeout(150)
    page.click("#lessonsRoot [data-lesson='2']")
    page.wait_for_timeout(100)
    check("LED" in page.inner_text("#lessonsRoot h2"), label + ": lesson 3 opens")
    page.click("[data-act=lesson-load]")
    page.wait_for_timeout(150)
    check(page.locator("g[data-part]").count() >= 3, label + ": lesson load button builds circuit on the lab")

    # quiz cards
    page.click("[data-tab=cards]")
    page.wait_for_timeout(150)
    question = page.inner_text(".card-q")
    check(len(question) > 5, label + ": quiz question shown")
    opts = page.locator("[data-opt]")
    check(opts.count() == 4, label + ": 4 answer options")
    page.locator("[data-opt]").nth(0).click()
    page.wait_for_timeout(100)
    check(page.locator(".explain").count() == 1, label + ": answer shows explanation")
    page.click("[data-act=cards-next]")
    page.wait_for_timeout(100)
    check(page.locator(".card-q").count() == 1, label + ": next card loads")

    # repair mode
    page.click("[data-tab=repair]")
    page.wait_for_timeout(200)
    check(page.locator("#repairPanel").is_visible(), label + ": repair panel visible")
    page.click("[data-act=check]")
    page.wait_for_timeout(120)
    check(page.locator("#repairPanel .banner.bad").count() == 1, label + ": broken circuit fails check")
    page.click("[data-act=reset-challenge]")
    page.click("[data-tab=lab]")
    page.wait_for_timeout(120)

    page.screenshot(path=os.path.join(SHOTS, label.replace(" ", "_") + "_end.png"), full_page=True)
    errs = [e for e in errors if "favicon" not in e.lower()]
    check(not errs, label + ": no page or console errors " + (str(errs[:3]) if errs else ""))
    ctx.close()
    browser.close()


def main():
    httpd, url = serve()
    try:
        with sync_playwright() as pw:
            run(pw, url, {"width": 1280, "height": 860}, "desktop", touch=False)
            run(pw, url, {"width": 820, "height": 1180}, "tablet", touch=True)
    finally:
        httpd.shutdown()
    print("\nRESULT:", "all UI checks passed" if not FAILS else "%d failed" % len(FAILS))
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()

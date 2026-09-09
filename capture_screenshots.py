from playwright.sync_api import sync_playwright
import time

def capture():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()

        # 1. Home Page / Variant Selection
        page.goto("http://localhost:5173/")
        page.wait_for_timeout(1000)
        page.screenshot(path="docs/assets/images/home_variant.png")
        page.screenshot(path="/home/jules/verification/screenshots/home_variant.png")

        # Select variant 1 and click Ingresar al Laboratorio
        page.fill("input[type='number']", "1")
        page.wait_for_timeout(500)
        page.click("button:has-text('Ingresar al Laboratorio')")
        page.wait_for_timeout(1500)

        # 2. Lab Page - Bits Operations (PLC)
        page.screenshot(path="docs/assets/images/bits_plc.png")
        page.screenshot(path="/home/jules/verification/screenshots/bits_plc.png")

        # Open PLC Config Dialog
        if page.is_visible("button:has-text('Configurar PLC')"):
            page.click("button:has-text('Configurar PLC')")
            page.wait_for_timeout(1000)
            page.screenshot(path="docs/assets/images/plc_config.png")
            page.screenshot(path="/home/jules/verification/screenshots/plc_config.png")
            # Close dialog if button exists
            if page.is_visible("button:has-text('Cerrar')"):
                page.click("button:has-text('Cerrar')")
            elif page.is_visible("button:has-text('Guardar')"):
                page.click("button:has-text('Guardar')")
            page.wait_for_timeout(500)

        # 3. Lab Page - Registers Operations (Analyzer)
        # Click on Registers operations tab
        page.click("text=Registers operations")
        page.wait_for_timeout(1500)
        page.screenshot(path="docs/assets/images/registers_analyzer.png")
        page.screenshot(path="/home/jules/verification/screenshots/registers_analyzer.png")

        # 4. Final Report Preview
        page.goto("http://localhost:5173/informe")
        page.wait_for_timeout(1500)
        page.screenshot(path="docs/assets/images/report_preview.png")
        page.screenshot(path="/home/jules/verification/screenshots/report_preview.png")

        context.close()
        browser.close()

if __name__ == "__main__":
    capture()

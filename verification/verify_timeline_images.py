from playwright.sync_api import sync_playwright, expect

def test_timeline_images():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000/vast-timeline")
        page.wait_for_selector("text=Nusantara Timeline", timeout=10000)
        try:
            event_label = page.get_by_text("The Sangiran Flourishing").last
            event_label.wait_for(state="visible", timeout=5000)
            event_label.click()
            popover_img = page.locator("div.absolute.z-50 img")
            popover_img.wait_for(state="visible", timeout=2000)
            src = popover_img.get_attribute("src")
            print(f"Image src: {src}")
        except Exception as e:
             print(f"Error: {e}")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/timeline_screenshot_clicked.png")
        browser.close()

if __name__ == "__main__":
    test_timeline_images()

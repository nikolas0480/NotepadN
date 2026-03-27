import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        await page.goto("http://localhost:1420")

        # Click the language selector menu
        await page.click("text=Language: javascript")

        # Click the markdown option
        await page.click("text=markdown")

        # Select all and type
        await page.click(".cm-content")
        await page.keyboard.press("Control+A")
        await page.keyboard.type("# Hello World\n**bold** and *italic*")

        # Give it a moment to apply highlights
        await asyncio.sleep(2)

        # Get the rendered HTML in the editor
        html = await page.evaluate("document.querySelector('.cm-content').innerHTML")
        print("HTML:", html)

        await browser.close()

asyncio.run(main())

import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--no-sandbox'])
        page = await browser.new_page()
        
        console_msgs = []
        page.on('console', lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: console_msgs.append(f"[PAGEERROR] {err}"))
        
        await page.goto('http://localhost:7779/tests/?autorun=1', wait_until='networkidle', timeout=90000)
        
        # Wait a bit for tests to run
        await asyncio.sleep(30)
        
        try:
            summary = await page.eval_on_selector('#summary', 'el => el.innerText')
        except Exception as e:
            summary = f'ERROR: {e}'
        try:
            output_el = await page.query_selector('#output')
            output = await output_el.inner_text()
        except Exception as e:
            output = f'ERROR: {e}'
        
        print('OUTPUT_LEN:', len(output))
        print('OUTPUT_TAIL:', output[-3000:] if len(output) > 3000 else output)
        print('SUMMARY:', summary)
        print('CONSOLE_COUNT:', len(console_msgs))
        for m in console_msgs[-20:]:
            print(' ', m)
        
        await browser.close()

asyncio.run(main())
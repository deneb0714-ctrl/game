import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
        await page.goto('http://127.0.0.1:8081')
        
        print('Waiting for game to load...')
        
        # We need a way to warp to the end scene without breaking the UI.
        # We will inject a function into window to warp.
        await page.evaluate("""
            window.warpToEnd = () => {
                if (window.__GAME) {
                    if (window.__GAME.scene.scenes[1].sys.isActive()) {
                        window.__GAME.scene.scenes[1].scene.start('BossScene');
                    }
                }
            };
            window.killBoss = () => {
                if (window.__GAME && window.__GAME.scene.scenes[4].sys.isActive()) {
                    let scene = window.__GAME.scene.scenes[4];
                    scene.enemyBullets.clear(true, true);
                    scene.playerBullets.clear(true, true);
                    window.Kills = 1;
                    scene.events.emit('boss_defeated');
                }
            };
        """)
        
        print('Waiting for TitleScene...')
        while True:
            is_active = await page.evaluate('window.__GAME && window.__GAME.scene.scenes[1] && window.__GAME.scene.scenes[1].sys.isActive()')
            if is_active:
                break
            await asyncio.sleep(0.5)
            
        print('Starting BossScene...')
        await page.evaluate('window.warpToEnd()')
        
        print('Waiting for BossScene to be ready...')
        while True:
            is_active = await page.evaluate('window.__GAME && window.__GAME.scene.scenes[4] && window.__GAME.scene.scenes[4].sys.isActive() && window.__GAME.scene.scenes[4].player')
            if is_active:
                break
            await asyncio.sleep(0.5)
            
        print('Killing boss...')
        await page.evaluate('window.killBoss()')
        
        # Wait for choices to appear (the 5 buttons)
        print('Waiting for choices...')
        while True:
            has_choices = await page.evaluate('window.__GAME.scene.scenes[4].choiceContainer !== undefined && window.__GAME.scene.scenes[4].choiceContainer.active')
            if has_choices:
                break
            # Skip dialog if it's there
            await page.keyboard.press('Enter')
            await asyncio.sleep(0.2)
            
        # The choices are up! The characters should be visible.
        # Wait a sec for tweens
        await asyncio.sleep(1)
        print('Taking Lab Screenshot...')
        await page.screenshot(path=r'C:\Users\deneb\.gemini\antigravity\brain\dae176a6-e36f-4177-baf3-6662c090b0ab\screenshot_lab_freedom_v9.png')
        
        # Select first choice (Doctor Kill)
        print('Selecting Doctor Kill...')
        await page.keyboard.press('Enter')
        
        # Wait for GIF text dialog to appear
        print('Waiting for True Demon Lord dialog...')
        while True:
            has_dialog = await page.evaluate('window.__GAME.scene.scenes[4].dialogActive === true || (window.__GAME.scene.scenes[4].dialogContainer && window.__GAME.scene.scenes[4].dialogContainer.active)')
            is_gif = await page.evaluate('document.querySelector("img[src*=\\"true_demon_lord\\"]") !== null')
            if has_dialog and is_gif:
                break
            await page.keyboard.press('Enter')
            await asyncio.sleep(0.2)
            
        print('At GIF Dialog. Waiting for text to finish typing...')
        await asyncio.sleep(2)
        
        print('Taking GIF Screenshot...')
        await page.screenshot(path=r'C:\Users\deneb\.gemini\antigravity\brain\dae176a6-e36f-4177-baf3-6662c090b0ab\screenshot_true_demon_lord_v9.png')
        
        await browser.close()

asyncio.run(main())

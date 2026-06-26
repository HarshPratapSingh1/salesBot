import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

export class Navigator {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async launch() {
        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage();
        await this.page.setViewportSize({ width: 1280, height: 720 });
        console.log('🌐 Browser launched');
    }

    async login(url, loginSteps, email, password) {
        try {
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.page.fill(loginSteps.emailSelector, email);
            await this.page.fill(loginSteps.passwordSelector, password);
            await this.page.click(loginSteps.submitSelector);
            await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
            console.log('✅ Navigator logged in');
        } catch (err) {
            console.log('❌ Navigator login failed:', err.message);
            throw err;
        }
    }

    async executeAction(toolName, toolArgs) {
        try {
            switch (toolName) {

                case 'navigate_to':
                    console.log(`🔗 Navigating to: ${toolArgs.pageName}`);
                    await this.page.goto(toolArgs.url, {
                        waitUntil: 'domcontentloaded',
                        timeout: 15000
                    });
                    break;

                case 'click_element':
                    console.log(`👆 Clicking: ${toolArgs.description}`);
                    await this.page.click(toolArgs.selector, { timeout: 5000 });
                    await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
                    break;

                case 'scroll_to':
                    console.log(`📜 Scrolling to: ${toolArgs.description}`);
                    await this.page.evaluate((selector) => {
                        const el = document.querySelector(selector);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, toolArgs.selector);
                    await this.page.waitForTimeout(800);
                    break;

                case 'highlight_element':
                    console.log(`✨ Highlighting: ${toolArgs.label}`);
                    await this.page.evaluate(({ selector, label }) => {
                        // Remove any existing highlights
                        document.querySelectorAll('.salesbot-highlight').forEach(el => el.remove());
                        document.querySelectorAll('[data-salesbot-highlighted]').forEach(el => {
                            el.style.outline = '';
                            el.removeAttribute('data-salesbot-highlighted');
                        });

                        const el = document.querySelector(selector);
                        if (el) {
                            // Highlight the element
                            el.style.outline = '3px solid #6366f1';
                            el.style.outlineOffset = '4px';
                            el.setAttribute('data-salesbot-highlighted', 'true');

                            // Add floating label
                            const tooltip = document.createElement('div');
                            tooltip.className = 'salesbot-highlight';
                            tooltip.innerText = label;
                            tooltip.style.cssText = `
                position: fixed;
                background: #6366f1;
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                z-index: 999999;
                pointer-events: none;
                font-family: sans-serif;
                box-shadow: 0 4px 12px rgba(99,102,241,0.4);
              `;

                            const rect = el.getBoundingClientRect();
                            tooltip.style.top = `${rect.top - 40}px`;
                            tooltip.style.left = `${rect.left}px`;
                            document.body.appendChild(tooltip);

                            // Remove after 3 seconds
                            setTimeout(() => {
                                el.style.outline = '';
                                el.removeAttribute('data-salesbot-highlighted');
                                tooltip.remove();
                            }, 3000);

                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, toolArgs);
                    await this.page.waitForTimeout(500);
                    break;

                default:
                    console.log(`⚠️ Unknown tool: ${toolName}`);
            }
        } catch (err) {
            console.log(`❌ Action failed (${toolName}):`, err.message);
        }
    }

    getCurrentUrl() {
        return this.page?.url() || '';
    }

    async checkIfLoggedOut(baseUrl) {
        const currentUrl = this.page?.url() || '';
        // If redirected to login page
        if (!currentUrl.includes(baseUrl) ||
            currentUrl.includes('login') ||
            currentUrl.includes('signin')) {
            return true;
        }
        return false;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            console.log('🌐 Browser closed');
        }
    }
}
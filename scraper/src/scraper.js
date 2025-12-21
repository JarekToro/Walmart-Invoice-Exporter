/**
 * Main Walmart Order Scraper using Crawlee + Playwright
 */

import { PlaywrightCrawler } from 'crawlee';
import { chromium } from 'playwright';
import config from './config.js';
import {
  extractOrderNumbers,
  hasNextPage,
  clickNextPage,
  extractOrderDetails,
} from './extractors.js';
import { exportToXlsx } from './exporter.js';

export class WalmartOrderScraper {
  constructor(options = {}) {
    this.options = {
      headless: options.headless ?? config.browserSettings.headless,
      maxPages: options.maxPages || 0, // 0 = unlimited
      outputDir: options.outputDir || config.outputDir,
      sessionFile: options.sessionFile || null,
      ...options,
    };

    this.allOrderNumbers = new Set();
    this.allAdditionalFields = {};
    this.currentPage = 0;
    this.scrapedOrders = [];
  }

  /**
   * Collect all order numbers from the orders listing pages
   * @param {Page} page - Playwright page object
   * @returns {Promise<void>}
   */
  async collectOrderNumbers(page) {
    console.log('\n📋 Collecting order numbers from all pages...\n');

    let pageCount = 0;
    let hasMore = true;

    while (hasMore) {
      pageCount++;
      console.log(`📄 Processing page ${pageCount}...`);

      // Extract order numbers from current page
      const { orderNumbers, additionalFields } = await extractOrderNumbers(page);

      console.log(`   Found ${orderNumbers.length} orders on this page`);

      // Add to our collection
      orderNumbers.forEach((num) => this.allOrderNumbers.add(num));
      this.allAdditionalFields = { ...this.allAdditionalFields, ...additionalFields };

      // Check if we should continue
      if (this.options.maxPages > 0 && pageCount >= this.options.maxPages) {
        console.log(`\n⚠️  Reached page limit (${this.options.maxPages}). Stopping collection.`);
        break;
      }

      // Check for next page
      hasMore = await hasNextPage(page);

      if (hasMore) {
        console.log('   Navigating to next page...');
        const success = await clickNextPage(page);
        if (!success) {
          console.log('   Failed to navigate to next page');
          break;
        }
        // Wait a bit for the page to stabilize
        await page.waitForTimeout(config.pageLoadDelay);
      } else {
        console.log('   No more pages available');
      }
    }

    console.log(`\n✓ Collection complete! Found ${this.allOrderNumbers.size} total orders across ${pageCount} pages\n`);
  }

  /**
   * Scrape details for a specific order
   * @param {Page} page - Playwright page object
   * @param {string} orderNumber - Order number to scrape
   * @returns {Promise<Object|null>} Order details or null if failed
   */
  async scrapeOrderDetails(page, orderNumber) {
    try {
      // Determine URL based on order number length
      const isLongOrderNumber = orderNumber.length >= 20;
      const url = `${config.ordersUrl}/${orderNumber}${isLongOrderNumber ? '?storePurchase=true' : ''}`;

      console.log(`   Navigating to order page...`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: config.navigationTimeout });

      console.log(`   Extracting order details...`);
      const orderDetails = await extractOrderDetails(page);

      return orderDetails;
    } catch (error) {
      console.error(`   ✗ Error scraping order ${orderNumber}:`, error.message);

      // Try alternate URL parameter
      try {
        const isLongOrderNumber = orderNumber.length >= 20;
        const alternateUrl = `${config.ordersUrl}/${orderNumber}${isLongOrderNumber ? '' : '?storePurchase=true'}`;

        console.log(`   Retrying with alternate URL...`);
        await page.goto(alternateUrl, {
          waitUntil: 'networkidle',
          timeout: config.navigationTimeout,
        });

        const orderDetails = await extractOrderDetails(page);
        return orderDetails;
      } catch (retryError) {
        console.error(`   ✗ Retry failed for order ${orderNumber}:`, retryError.message);
        return null;
      }
    }
  }

  /**
   * Download order details for all collected order numbers
   * @param {Page} page - Playwright page object
   * @param {Array<string>} orderNumbers - Optional specific order numbers to download
   * @returns {Promise<Array>} Array of scraped order details
   */
  async downloadOrders(page, orderNumbers = null) {
    const ordersToDownload = orderNumbers || Array.from(this.allOrderNumbers);

    console.log(`\n📦 Downloading ${ordersToDownload.length} orders...\n`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < ordersToDownload.length; i++) {
      const orderNumber = ordersToDownload[i];
      console.log(`[${i + 1}/${ordersToDownload.length}] Order #${orderNumber}`);

      const orderDetails = await this.scrapeOrderDetails(page, orderNumber);

      if (orderDetails) {
        results.push(orderDetails);
        successCount++;

        // Export to XLSX
        try {
          await exportToXlsx(orderDetails, this.options.outputDir);
        } catch (error) {
          console.error(`   ✗ Failed to export XLSX:`, error.message);
        }
      } else {
        failCount++;
      }

      // Small delay between requests
      await page.waitForTimeout(1000);
    }

    console.log(`\n✓ Download complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);

    this.scrapedOrders = results;
    return results;
  }

  /**
   * Run the complete scraping workflow
   * @param {Object} options - Scraping options
   * @returns {Promise<Array>} Array of scraped order details
   */
  async run(options = {}) {
    const {
      collectOnly = false,
      orderNumbers = null, // Specific order numbers to scrape
    } = options;

    console.log('🚀 Starting Walmart Order Scraper\n');

    // Launch browser
    const browser = await chromium.launch({
      headless: this.options.headless,
      slowMo: config.browserSettings.slowMo,
    });

    const context = await browser.newContext({
      viewport: config.browserSettings.viewport,
    });

    // Load session if provided
    if (this.options.sessionFile) {
      try {
        const fs = await import('fs');
        const sessionData = JSON.parse(fs.readFileSync(this.options.sessionFile, 'utf-8'));
        await context.addCookies(sessionData.cookies);
        console.log('✓ Loaded session from file\n');
      } catch (error) {
        console.log('⚠️  Could not load session file. You may need to log in manually.\n');
      }
    }

    const page = await context.newPage();

    try {
      // Navigate to orders page
      console.log('🌐 Navigating to Walmart orders page...\n');
      await page.goto(config.ordersUrl, {
        waitUntil: 'networkidle',
        timeout: config.navigationTimeout,
      });

      // Check if we need to log in
      const currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('signin')) {
        console.log('🔐 Login required. Please log in manually in the browser window...\n');
        console.log('   Waiting for navigation to orders page...\n');

        // Wait for user to log in
        await page.waitForURL('**/orders**', { timeout: 300000 }); // 5 min timeout

        console.log('✓ Login successful!\n');

        // Save session for future use
        if (this.options.sessionFile) {
          const cookies = await context.cookies();
          const sessionData = { cookies };
          const fs = await import('fs');
          fs.writeFileSync(this.options.sessionFile, JSON.stringify(sessionData, null, 2));
          console.log('✓ Session saved to file\n');
        }
      }

      // If specific order numbers provided, skip collection
      if (orderNumbers && orderNumbers.length > 0) {
        console.log(`📋 Using provided order numbers (${orderNumbers.length} orders)\n`);
        this.allOrderNumbers = new Set(orderNumbers);
      } else {
        // Collect all order numbers
        await this.collectOrderNumbers(page);
      }

      // If collect-only mode, stop here
      if (collectOnly) {
        console.log('\n📋 Order numbers collected (collect-only mode):\n');
        Array.from(this.allOrderNumbers).forEach((num) => {
          const additionalInfo = this.allAdditionalFields[num];
          console.log(`   • ${num}${additionalInfo ? ` - ${additionalInfo}` : ''}`);
        });
        return { orderNumbers: Array.from(this.allOrderNumbers), orders: [] };
      }

      // Download order details
      const orders = await this.downloadOrders(page);

      return { orderNumbers: Array.from(this.allOrderNumbers), orders };
    } finally {
      // Keep browser open if not headless for debugging
      if (!this.options.headless && this.options.keepOpen) {
        console.log('\n⏸️  Browser kept open for inspection. Close manually when done.\n');
      } else {
        await browser.close();
        console.log('\n✓ Browser closed\n');
      }
    }
  }
}

export default WalmartOrderScraper;

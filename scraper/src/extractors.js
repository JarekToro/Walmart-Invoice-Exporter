/**
 * Data extraction functions ported from content.js
 */

import config from './config.js';

/**
 * Extract order numbers from the orders listing page
 * @param {Page} page - Playwright page object
 * @returns {Promise<{orderNumbers: string[], additionalFields: Object}>}
 */
export async function extractOrderNumbers(page) {
  const orderNumbers = [];
  const additionalFields = {};

  try {
    // Wait for the page to load
    await page.waitForSelector(config.selectors.orderListHeading, {
      timeout: config.waitTimeout,
    });

    // First try to extract order numbers from data-automation-id attributes
    const linksWithAutomationId = await page.$$(config.selectors.orderLinkWithAutomationId);
    console.log(`Found ${linksWithAutomationId.length} order elements with data-automation-id`);

    for (const link of linksWithAutomationId) {
      const automationId = await link.getAttribute('data-automation-id');
      const match = automationId?.match(/view-order-details-link-(\d+)/);

      if (match && match[1]) {
        const orderNumber = match[1];
        orderNumbers.push(orderNumber);

        // Try to find the additional field for this order
        const container = await link.evaluateHandle((el) => el.closest('div.w_udHt.w_CEpt'));
        if (container) {
          const additionalFieldElement = await page.evaluateHandle(
            (cont) => cont?.parentElement?.parentElement?.querySelector('h3.w_kV33.w_Sl3f.w_mvVb.f3'),
            container
          );

          const fieldText = await additionalFieldElement.evaluate((el) => el?.textContent?.trim());
          if (fieldText) {
            additionalFields[orderNumber] = fieldText;
          }
        }
      }
    }

    // If no order numbers found via data-automation-id, fall back to the old selector method
    if (orderNumbers.length === 0) {
      const orderElements = await page.$$(config.selectors.orderNumberFallback);
      console.log(`Found ${orderElements.length} order elements with fallback selector`);

      for (const element of orderElements) {
        const text = await element.textContent();
        const match = text?.trim().match(/#\s*([\d-]+)/);

        if (match && match[1]) {
          const orderNumber = match[1];
          orderNumbers.push(orderNumber);

          // Try to find the additional field
          const container = await element.evaluateHandle((el) => el.closest('div.w_udHt.w_CEpt'));
          if (container) {
            const additionalFieldElement = await page.evaluateHandle(
              (cont) => cont?.parentElement?.parentElement?.querySelector('h3.w_kV33.w_Sl3f.w_mvVb.f3'),
              container
            );

            const fieldText = await additionalFieldElement.evaluate((el) => el?.textContent?.trim());
            if (fieldText) {
              additionalFields[orderNumber] = fieldText;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error extracting order numbers:', error);
  }

  return { orderNumbers, additionalFields };
}

/**
 * Check if there's a next page available
 * @param {Page} page - Playwright page object
 * @returns {Promise<boolean>}
 */
export async function hasNextPage(page) {
  try {
    await page.waitForSelector(config.selectors.orderListHeading, {
      timeout: config.waitTimeout,
    });

    const nextButton = await page.$(config.selectors.nextPageButton);
    return !!nextButton;
  } catch (error) {
    console.error('Error checking for next page:', error);
    return false;
  }
}

/**
 * Click the next page button
 * @param {Page} page - Playwright page object
 * @returns {Promise<boolean>} Success status
 */
export async function clickNextPage(page) {
  try {
    await page.waitForSelector(config.selectors.orderListHeading, {
      timeout: config.waitTimeout,
    });

    const nextButton = await page.$(config.selectors.nextPageButton);
    if (nextButton) {
      await nextButton.click();
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error clicking next page button:', error);
    return false;
  }
}

/**
 * Extract order details from an order detail page
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} Order details
 */
export async function extractOrderDetails(page) {
  try {
    // Block images for faster loading (ported from content.js)
    await blockImages(page);

    // Wait for the print items list to load
    await page.waitForSelector(config.selectors.printItemsList, {
      timeout: config.waitTimeout,
    });

    // Extract order items
    const orderItems = await page.$$eval(config.selectors.printItemsList, (items) => {
      return items.map((item) => {
        const productName = item.querySelector('.w_U9_0.w_sD6D.w_QcqU')?.innerText || '';
        const deliveryStatus = item.querySelector('.print-bill-type .w_U9_0.w_sD6D.w_QcqU')?.innerText || 'Delivered';
        const quantity = item.querySelector('.print-bill-qty .w_U9_0.w_sD6D.w_QcqU')?.innerText || '1';
        const price = item.querySelector('.print-bill-price .w_U9_0.w_sD6D.w_QcqU')?.innerText || '$0.00';

        return {
          productName: productName.trim(),
          deliveryStatus,
          quantity,
          price,
          productLink: 'N/A', // Will be filled in next step
        };
      });
    });

    // Get product links by matching product names
    for (const item of orderItems) {
      try {
        const link = await page.evaluate((productName) => {
          const visibleItems = document.querySelectorAll('[data-testid="itemtile-stack"] [data-testid="productName"] span');
          for (const visibleItem of visibleItems) {
            if (visibleItem?.innerText?.trim() === productName.trim()) {
              const linkElement = visibleItem.closest('[data-testid="itemtile-stack"]')?.querySelector('a[link-identifier="itemClick"]');
              if (linkElement) {
                return linkElement.href;
              }
            }
          }
          return 'N/A';
        }, item.productName);

        item.productLink = link;
      } catch (error) {
        console.error('Error extracting product link:', error);
      }
    }

    // Extract order number
    const orderNumber = await findOrderNumber(page);

    // Extract order metadata
    const orderDate = await page.$eval(config.selectors.orderDate, (el) =>
      el?.innerText?.replace('order', '').trim()
    ).catch(() => 'N/A');

    const orderTotal = await page.$eval(config.selectors.orderTotal, (el) =>
      el?.innerText
    ).catch(() => '$0.00');

    const deliveryCharges = await page.$eval(config.selectors.deliveryCharges, (el) =>
      el?.innerText
    ).catch(() => '$0.00');

    // Extract tax
    const tax = await page.evaluate(() => {
      const taxElements = document.querySelectorAll('.w_iUH7');
      for (const element of taxElements) {
        if (element.textContent.includes('Tax')) {
          const taxItem = element.closest('.print-fees-item');
          const taxAmount = taxItem?.querySelector('.w_U9_0.w_sD6D.w_QcqU.ml2');
          if (taxAmount) {
            return taxAmount.innerText;
          }
        }
      }
      return '$0.00';
    });

    const tip = await page.$eval(config.selectors.tip, (el) =>
      el?.innerText
    ).catch(() => '$0.00');

    return {
      orderNumber,
      orderDate,
      orderTotal,
      deliveryCharges,
      tax,
      tip,
      items: orderItems,
    };
  } catch (error) {
    console.error('Error extracting order details:', error);
    throw error;
  }
}

/**
 * Find order number using multiple selector strategies
 * @param {Page} page - Playwright page object
 * @returns {Promise<string|null>}
 */
async function findOrderNumber(page) {
  try {
    // First try to find order number from data-automation-id attribute
    const orderNumberFromAttribute = await page.evaluate(() => {
      const linkWithAutomationId = document.querySelector('[data-automation-id^="view-order-details-link-"]');
      if (linkWithAutomationId) {
        const automationId = linkWithAutomationId.getAttribute('data-automation-id');
        const match = automationId?.match(/view-order-details-link-(\d+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
      return null;
    });

    if (orderNumberFromAttribute) {
      return orderNumberFromAttribute;
    }

    // Fall back to text-based selectors
    const selectors = [
      config.selectors.orderIdPrimary,
      config.selectors.orderIdAlternate,
      '.print-bill-heading .dark-gray',
      '.print-bill-bar-id',
    ];

    for (const selector of selectors) {
      try {
        const text = await page.$eval(selector, (el) => el.textContent);
        const match = text?.match(/#\s*([\d-]+)/);
        if (match && match[1]) {
          return match[1];
        }
      } catch (error) {
        // Try next selector
        continue;
      }
    }

    console.log('Order number not found with current selectors');
    return null;
  } catch (error) {
    console.error('Error finding order number:', error);
    return null;
  }
}

/**
 * Block images to speed up page loading
 * @param {Page} page - Playwright page object
 */
async function blockImages(page) {
  try {
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico}', (route) => route.abort());
    console.log('Image blocking enabled');
  } catch (error) {
    console.error('Error setting up image blocking:', error);
  }
}

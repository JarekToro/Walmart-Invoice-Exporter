/**
 * Configuration for Walmart Order Scraper
 */

export const config = {
  // Walmart URLs
  baseUrl: 'https://www.walmart.com',
  ordersUrl: 'https://www.walmart.com/orders',

  // Scraper settings
  maxRetries: 3,
  navigationTimeout: 60000,
  waitTimeout: 30000,
  pageLoadDelay: 2000,

  // Selectors (ported from browser extension)
  selectors: {
    // Order listing page
    orderListHeading: 'h1.w_kV33.w_LD4J.w_mvVb',
    orderLinkWithAutomationId: '[data-automation-id^="view-order-details-link-"]',
    orderNumberFallback: '#maincontent > main > section > div.flex.relative-m > div.w-100.di-m.flex-auto > div > section > div > div > div > div.w_udHt.w_CEpt.bg-near-white-primary.pv3.mv0 > span.w_kV33.w_Sl3f.w_mvVb.w_E5rV > h2 > span',
    nextPageButton: 'button[data-automation-id="next-pages-button"]:not([disabled])',
    orderContainer: 'div.w_udHt.w_CEpt',
    additionalField: 'h3.w_kV33.w_Sl3f.w_mvVb.f3',

    // Order details page
    printItemsList: '.dn.print-items-list',
    productName: '.w_U9_0.w_sD6D.w_QcqU',
    deliveryStatus: '.print-bill-type .w_U9_0.w_sD6D.w_QcqU',
    quantity: '.print-bill-qty .w_U9_0.w_sD6D.w_QcqU',
    price: '.print-bill-price .w_U9_0.w_sD6D.w_QcqU',
    visibleProductName: '[data-testid="itemtile-stack"] [data-testid="productName"] span',
    productLink: 'a[link-identifier="itemClick"]',

    // Order info selectors
    orderIdPrimary: '.f-subheadline-m.dark-gray-m.print-bill-bar-id',
    orderIdAlternate: '[data-testid="orderInfoCard"] .dark-gray',
    orderDate: '.print-bill-date',
    orderTotal: '.bill-order-total-payment h2:last-child',
    deliveryCharges: '.print-fees',
    taxContainer: '.w_iUH7',
    taxAmount: '.w_U9_0.w_sD6D.w_QcqU.ml2',
    tip: '.print-bill-payment-section .flex.justify-between.pb2.pt3 .w_U9_0.w_U0S3.w_QcqU:last-child',
  },

  // Output settings
  outputDir: './downloads',
  outputFormat: 'xlsx',

  // Browser settings for Playwright
  browserSettings: {
    headless: false, // Set to false to see the browser
    slowMo: 100,
    viewport: { width: 1280, height: 720 },
  },
};

export default config;

# Walmart Order Scraper

A powerful web scraping tool built with **Crawlee** and **Playwright** to automate the capture and export of Walmart order details. This tool replaces the browser extension with a standalone Node.js application.

## Features

- 🚀 **Automated Order Collection**: Scrape all orders from your Walmart account
- 📦 **Batch Download**: Download order details for multiple orders at once
- 📊 **XLSX Export**: Export order details to Excel format with product links, prices, and tax information
- 🔐 **Session Management**: Save login sessions to avoid repeated logins
- 🎯 **Selective Scraping**: Scrape specific order numbers
- 🔄 **Pagination Support**: Automatically navigate through multiple pages
- 🖼️ **Image Blocking**: Speed up scraping by blocking unnecessary images
- 💪 **Retry Logic**: Automatic retry with alternate URLs on failure

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

1. Navigate to the scraper directory:

```bash
cd scraper
```

2. Install dependencies:

```bash
npm install
```

## Usage

### Commands

#### 1. Scrape All Orders

Scrape all orders from your Walmart account:

```bash
npm start scrape
```

**Options:**
- `-h, --headless`: Run in headless mode (no browser UI)
- `-p, --max-pages <number>`: Maximum number of pages to scrape (0 = unlimited)
- `-o, --output <directory>`: Output directory for XLSX files (default: `./downloads`)
- `-s, --session <file>`: Session file to reuse authentication (default: `./session.json`)
- `-c, --collect-only`: Only collect order numbers without downloading
- `-k, --keep-open`: Keep browser open after scraping (for debugging)

**Example:**

```bash
# Scrape first 5 pages with visible browser
npm start scrape -- -p 5

# Scrape all orders in headless mode
npm start scrape -- --headless

# Only collect order numbers (fast)
npm start scrape -- --collect-only
```

#### 2. List Order Numbers

List all order numbers without downloading:

```bash
npm start list
```

**Options:**
- `-h, --headless`: Run in headless mode
- `-p, --max-pages <number>`: Maximum number of pages to scrape
- `-s, --session <file>`: Session file to reuse authentication

**Example:**

```bash
# List orders from first 3 pages
npm start list -- -p 3
```

#### 3. Scrape Specific Orders

Scrape specific order numbers:

```bash
npm start scrape-orders -- <orderNumber1> <orderNumber2> ...
```

**Example:**

```bash
npm start scrape-orders -- 1234567890 9876543210
```

#### 4. Clear Session

Clear saved session file:

```bash
npm start clear-session
```

## How It Works

### Authentication

The first time you run the scraper, it will open a browser window and navigate to Walmart's orders page. If you're not logged in:

1. The scraper will detect the login page
2. You'll have 5 minutes to manually log in
3. Once logged in, the scraper will save your session to `session.json`
4. Future runs will reuse this session automatically

### Order Collection

The scraper:

1. Navigates to your Walmart orders page
2. Extracts order numbers from the current page
3. Clicks "Next" to go to the next page
4. Repeats until all pages are processed or max-pages limit is reached

### Order Download

For each order:

1. Navigates to the order details page
2. Extracts product information, prices, tax, and delivery charges
3. Exports the data to an XLSX file
4. Saves the file to the output directory

### Output Format

Each order is exported as a separate XLSX file with:

- Product name, quantity, price, and delivery status
- Clickable product links
- Order number and date
- Delivery charges, tax, and tip
- Order total

## Project Structure

```
scraper/
├── src/
│   ├── index.js         # CLI entry point
│   ├── scraper.js       # Main scraper logic
│   ├── extractors.js    # Data extraction functions
│   ├── exporter.js      # XLSX export functionality
│   └── config.js        # Configuration settings
├── downloads/           # Output directory (created automatically)
├── package.json
└── README.md
```

## Configuration

You can modify the scraper settings in `src/config.js`:

- **Timeouts**: Navigation and wait timeouts
- **Selectors**: CSS selectors for DOM elements
- **Browser Settings**: Headless mode, viewport size, etc.
- **Output Settings**: Output directory and format

## Troubleshooting

### Login Issues

If you have trouble logging in:

1. Clear the session: `npm start clear-session`
2. Run in non-headless mode: `npm start scrape` (default)
3. Manually log in when the browser opens

### Scraping Failures

If orders fail to scrape:

- Check your internet connection
- Ensure you're logged into Walmart
- Try running in non-headless mode to see what's happening
- Some orders may require the `?storePurchase=true` parameter (the scraper tries both automatically)

### Session Expiration

If your session expires:

1. Clear the old session: `npm start clear-session`
2. Run the scraper again and log in manually

## Performance Tips

- Use `--headless` mode for faster scraping
- Use `--max-pages` to limit the number of pages
- The scraper blocks images automatically to speed up page loads
- Session reuse eliminates the need for repeated logins

## Differences from Browser Extension

| Feature | Browser Extension | Scraper Tool |
|---------|------------------|--------------|
| Installation | Chrome Web Store | npm install |
| UI | Browser popup | Command line |
| Automation | Manual clicks | Fully automated |
| Session | Browser cookies | session.json file |
| Speed | Slower | Faster (headless mode) |
| Flexibility | Limited | Highly configurable |

## Migration from Browser Extension

To migrate from the browser extension:

1. Install the scraper following the installation steps
2. Run `npm start list` to see all your orders
3. Run `npm start scrape` to download all orders

The output XLSX files will be identical to those from the browser extension.

## Advanced Usage

### Custom Session File

```bash
npm start scrape -- -s ./my-session.json
```

### Custom Output Directory

```bash
npm start scrape -- -o ./my-orders
```

### Debugging

```bash
# Keep browser open to inspect issues
npm start scrape -- -k
```

### Batch Processing

```bash
# Process 10 pages at a time
npm start scrape -- -p 10 -o ./batch-1
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT

## Disclaimer

This tool is for personal use only. Make sure to comply with Walmart's Terms of Service when using this scraper. Use responsibly and avoid overwhelming Walmart's servers with too many requests.

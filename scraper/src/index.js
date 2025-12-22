#!/usr/bin/env node

/**
 * CLI entry point for Walmart Order Scraper
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import WalmartOrderScraper from './scraper.js';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('walmart-scraper')
  .description('Scrape Walmart order details using Crawlee + Playwright')
  .version('1.0.0');

program
  .command('scrape')
  .description('Scrape all orders from your Walmart account')
  .option('-h, --headless', 'Run in headless mode (no browser UI)', false)
  .option('-p, --max-pages <number>', 'Maximum number of pages to scrape (0 = unlimited)', '0')
  .option('-o, --output <directory>', 'Output directory for XLSX files', './downloads')
  .option('-s, --session <file>', 'Session file to reuse authentication', './session.json')
  .option('-c, --collect-only', 'Only collect order numbers without downloading', false)
  .option('-k, --keep-open', 'Keep browser open after scraping (for debugging)', false)
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('\n🛒 Walmart Order Scraper\n'));

      const scraper = new WalmartOrderScraper({
        headless: options.headless,
        maxPages: parseInt(options.maxPages, 10),
        outputDir: options.output,
        sessionFile: options.session,
        keepOpen: options.keepOpen,
      });

      const result = await scraper.run({
        collectOnly: options.collectOnly,
      });

      console.log(chalk.green.bold('\n✓ Scraping completed successfully!\n'));

      if (options.collectOnly) {
        console.log(chalk.cyan(`📋 Found ${result.orderNumbers.length} orders`));
      } else {
        console.log(chalk.cyan(`📦 Downloaded ${result.orders.length} orders`));
        console.log(chalk.cyan(`📁 Files saved to: ${options.output}`));
      }
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('scrape-orders')
  .description('Scrape specific order numbers')
  .argument('<orderNumbers...>', 'Order numbers to scrape')
  .option('-h, --headless', 'Run in headless mode (no browser UI)', false)
  .option('-o, --output <directory>', 'Output directory for XLSX files', './downloads')
  .option('-s, --session <file>', 'Session file to reuse authentication', './session.json')
  .option('-k, --keep-open', 'Keep browser open after scraping (for debugging)', false)
  .action(async (orderNumbers, options) => {
    try {
      console.log(chalk.blue.bold('\n🛒 Walmart Order Scraper\n'));
      console.log(chalk.cyan(`📋 Scraping ${orderNumbers.length} specific orders...\n`));

      const scraper = new WalmartOrderScraper({
        headless: options.headless,
        outputDir: options.output,
        sessionFile: options.session,
        keepOpen: options.keepOpen,
      });

      const result = await scraper.run({
        orderNumbers,
      });

      console.log(chalk.green.bold('\n✓ Scraping completed successfully!\n'));
      console.log(chalk.cyan(`📦 Downloaded ${result.orders.length} orders`));
      console.log(chalk.cyan(`📁 Files saved to: ${options.output}`));
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all order numbers without downloading')
  .option('-h, --headless', 'Run in headless mode (no browser UI)', false)
  .option('-p, --max-pages <number>', 'Maximum number of pages to scrape (0 = unlimited)', '0')
  .option('-s, --session <file>', 'Session file to reuse authentication', './session.json')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('\n🛒 Walmart Order Scraper\n'));

      const scraper = new WalmartOrderScraper({
        headless: options.headless,
        maxPages: parseInt(options.maxPages, 10),
        sessionFile: options.session,
      });

      const result = await scraper.run({
        collectOnly: true,
      });

      console.log(chalk.green.bold('\n✓ Collection completed!\n'));
      console.log(chalk.cyan.bold(`Found ${result.orderNumbers.length} orders:\n`));

      result.orderNumbers.forEach((num, index) => {
        const additionalInfo = scraper.allAdditionalFields[num];
        console.log(
          chalk.white(`  ${index + 1}. `) +
            chalk.yellow(num) +
            (additionalInfo ? chalk.gray(` - ${additionalInfo}`) : '')
        );
      });
    } catch (error) {
      console.error(chalk.red.bold('\n✗ Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('clear-session')
  .description('Clear saved session file')
  .option('-s, --session <file>', 'Session file to clear', './session.json')
  .action((options) => {
    try {
      if (fs.existsSync(options.session)) {
        fs.unlinkSync(options.session);
        console.log(chalk.green(`✓ Session file deleted: ${options.session}`));
      } else {
        console.log(chalk.yellow(`⚠️  Session file not found: ${options.session}`));
      }
    } catch (error) {
      console.error(chalk.red.bold('✗ Error:'), error.message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

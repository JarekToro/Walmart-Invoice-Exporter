/**
 * XLSX export functionality ported from content.js
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import config from './config.js';

/**
 * Convert order details to XLSX file
 * @param {Object} orderDetails - Order details object
 * @param {string} outputDir - Output directory path
 * @returns {Promise<string>} Path to the created file
 */
export async function exportToXlsx(orderDetails, outputDir = config.outputDir) {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Order Invoice');

    // Define font styles for headers and product details
    const headerFontStyle = { size: 12, bold: true, name: 'Times New Roman' };
    const productFontStyle = { size: 12, name: 'Times New Roman' };

    // Set worksheet columns with headers, keys, and styles
    worksheet.columns = [
      { header: 'Product Name', key: 'productName', width: 60 },
      {
        header: 'Quantity',
        key: 'quantity',
        width: 20,
        style: { numFmt: '#,##0', alignment: { horizontal: 'center' } },
      },
      {
        header: 'Price',
        key: 'price',
        width: 20,
        style: { numFmt: '$#,##0.00', alignment: { horizontal: 'center' } },
      },
      {
        header: 'Delivery Status',
        key: 'deliveryStatus',
        width: 30,
        style: { alignment: { horizontal: 'center' } },
      },
      {
        header: 'Product Link',
        key: 'productLink',
        width: 60,
        style: { font: { color: { argb: 'FF0000FF' }, underline: true } },
      },
    ];

    // Add each order item as a row in the worksheet
    orderDetails.items.forEach((item) => {
      const row = worksheet.addRow({
        productName: item.productName,
        productLink: {
          text:
            item.productName.length > 60
              ? item.productName.substring(0, 60) + '...'
              : item.productName,
          hyperlink: item.productLink !== 'N/A' ? item.productLink : undefined,
        },
        quantity: Number(item.quantity.replace(/[^0-9.-]+/g, '')),
        price: Number(item.price.replace(/[^0-9.-]+/g, '')),
        deliveryStatus: item.deliveryStatus,
      });
      row.font = productFontStyle;
    });

    // Apply product font style to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.font = productFontStyle;
      });
      const cell = row.getCell('productLink');
      cell.font = { color: { argb: 'FF0000FF' }, underline: true };
    });

    // Apply header font style to the first row (header row)
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = headerFontStyle;
    });

    // Add an empty row between product details and order details for clarity
    worksheet.addRow([]);

    // Add order details to the worksheet
    worksheet.addRow(['Order Number', orderDetails.orderNumber]).font = {
      ...productFontStyle,
      bold: true,
    };
    worksheet.addRow(['Order Date', orderDetails.orderDate]).font = {
      ...productFontStyle,
      bold: true,
    };

    const deliveryCharges = worksheet.addRow([
      'Delivery Charges',
      Number(orderDetails.deliveryCharges.replace(/[^0-9.-]+/g, '')),
    ]);
    const tax = worksheet.addRow(['Tax', Number(orderDetails.tax.replace(/[^0-9.-]+/g, ''))]);
    const tip = worksheet.addRow(['Tip', Number(orderDetails.tip.replace(/[^0-9.-]+/g, ''))]);
    const total = worksheet.addRow([
      'Order Total',
      Number(orderDetails.orderTotal.replace(/[^0-9.-]+/g, '')),
    ]);

    const styleCells = [deliveryCharges, tax, tip, total];
    styleCells.forEach((row) => {
      row.getCell(2).numFmt = '$#,##0.00  ';
      row.getCell(2).font = { ...productFontStyle, bold: true };
      row.getCell(1).font = { ...productFontStyle, bold: true };
      row.getCell(2).alignment = { horizontal: 'center' };
    });

    // Generate the Excel file and save to disk
    const fileName = `Order_${orderDetails.orderNumber}.xlsx`;
    const filePath = path.join(outputDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    console.log(`✓ Exported order ${orderDetails.orderNumber} to ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`Error exporting order to XLSX:`, error);
    throw error;
  }
}

/**
 * Export multiple orders to XLSX files
 * @param {Array<Object>} ordersData - Array of order details
 * @param {string} outputDir - Output directory path
 * @returns {Promise<Array<string>>} Paths to the created files
 */
export async function exportMultipleOrders(ordersData, outputDir = config.outputDir) {
  const filePaths = [];

  for (const orderDetails of ordersData) {
    try {
      const filePath = await exportToXlsx(orderDetails, outputDir);
      filePaths.push(filePath);
    } catch (error) {
      console.error(`Failed to export order ${orderDetails.orderNumber}:`, error.message);
    }
  }

  return filePaths;
}

export default { exportToXlsx, exportMultipleOrders };

/**
 * MOHANA TRADERS - GOOGLE APPS SCRIPT WEB APP API
 * 
 * Attach this script to your Google Spreadsheet:
 * 1. Open your Google Sheet (https://docs.google.com/spreadsheets/d/153Y1QbapMUz5MnoBZAN2B0qNMjlByzEp/edit)
 * 2. Click Extensions > Apps Script
 * 3. Delete any default code, paste this entire file, and click Save (Ctrl+S)
 * 4. Click Deploy > New deployment
 * 5. Select type: "Web app"
 * 6. Set Description: "Mohana Traders API"
 * 7. Set Execute as: "Me"
 * 8. Set Who has access: "Anyone"
 * 9. Click Deploy, Authorize access, and copy the "Web app URL" (ends in /exec)
 * 10. Paste the Web app URL in the Mohana Traders Dashboard under "Settings > Google Sheet Sync"
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'GET_ALL';
  var output = {};

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'PING') {
      output = { status: 'success', message: 'Connected to Mohana Traders Google Sheet', timestamp: new Date().toISOString() };
    } else if (action === 'GET_ALL') {
      output = {
        status: 'success',
        products: getProducts(ss),
        shops: getShops(ss),
        dailyTaken: getDailyTaken(ss),
        timestamp: new Date().toISOString()
      };
    } else if (action === 'GET_PRODUCTS') {
      output = { status: 'success', products: getProducts(ss) };
    } else if (action === 'GET_SHOPS') {
      output = { status: 'success', shops: getShops(ss) };
    } else {
      output = { status: 'error', message: 'Unknown action: ' + action };
    }
  } catch (err) {
    output = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var output = {};

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('No post data received');
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'PING') {
      output = { status: 'success', message: 'POST to Mohana Traders Sheet succeeded!' };
    } else if (action === 'ADD_PRODUCT') {
      output = addProduct(ss, data.product);
    } else if (action === 'UPDATE_PRODUCT_PRICE') {
      output = updateProductPrice(ss, data.productId, data.name, data.rate);
    } else if (action === 'ADD_SHOP') {
      output = addShop(ss, data.shop);
    } else if (action === 'RECORD_SALE') {
      output = recordSale(ss, data.sale);
    } else if (action === 'UPDATE_DAILY_TAKEN') {
      output = updateDailyTaken(ss, data.items);
    } else if (action === 'RECORD_PAYMENT') {
      output = recordPayment(ss, data.payment);
    } else if (action === 'SYNC_ALL') {
      output = syncAll(ss, data);
    } else {
      output = { status: 'error', message: 'Unknown action: ' + action };
    }
  } catch (err) {
    output = { status: 'error', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----------------- HELPER FUNCTIONS -----------------

function getProducts(ss) {
  var sheet = ss.getSheetByName('PRODUCT RATE');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var products = [];
  
  for (var r = 1; r < data.length; r++) {
    var sl = data[r][0];
    var brand = data[r][1];
    var rate = data[r][2];
    var cat = data[r][3];
    if (brand && String(brand).trim()) {
      var nameStr = String(brand).trim();
      products.push({
        id: 'PRD-' + pad(products.length + 1, 3),
        slNo: sl || (products.length + 1),
        name: nameStr,
        rate: Number(rate) || 0,
        category: cat ? String(cat).trim() : 'Other',
        unit: (nameStr.toUpperCase().indexOf('BOTTLE') !== -1 || nameStr.toUpperCase().indexOf('BOOTLE') !== -1) ? 'btl' : 'pkt',
        stock: 50
      });
    }
  }
  return products;
}

function getShops(ss) {
  var sheet = ss.getSheetByName('SHOPS');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var shops = [];
  
  for (var r = 1; r < data.length; r++) {
    var sl = data[r][0];
    var name = data[r][1];
    var area = data[r][2];
    if (name && String(name).trim()) {
      var areaStr = area ? String(area).trim() : 'TOLGATE';
      var stdArea = 'Tollgate';
      if (areaStr.toUpperCase().indexOf('SAMAYA') !== -1) stdArea = 'Samayapuram';
      else if (areaStr.toUpperCase().indexOf('MANACHA') !== -1) stdArea = 'Manachanallur';

      shops.push({
        id: 'SHP-' + pad(shops.length + 1, 3),
        slNo: sl || (shops.length + 1),
        name: String(name).trim(),
        area: stdArea,
        phone: '',
        previousBalance: 0,
        totalPurchased: 0,
        totalPaid: 0
      });
    }
  }

  // Check balances from TOLLGATE sheet
  var tgSheet = ss.getSheetByName('TOLLGATE');
  if (tgSheet) {
    var tgData = tgSheet.getDataRange().getValues();
    for (var r = 5; r < tgData.length; r++) {
      var sName = tgData[r][1];
      var prevBal = tgData[r][7]; // Col H: PREVIOUS BALANCE
      if (sName && prevBal) {
        var cleanSName = String(sName).trim().toLowerCase();
        for (var i = 0; i < shops.length; i++) {
          if (shops[i].name.toLowerCase() === cleanSName) {
            shops[i].previousBalance = Number(prevBal) || 0;
            break;
          }
        }
      }
    }
  }

  return shops;
}

function getDailyTaken(ss) {
  var sheet = ss.getSheetByName('DAILY TAKEN');
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var items = [];
  
  for (var r = 1; r < data.length; r++) {
    var brand = data[r][1];
    var rate = data[r][2];
    var taken = data[r][3];
    var sales = data[r][4];
    var ret = data[r][5];
    if (brand && String(brand).trim()) {
      items.push({
        productName: String(brand).trim(),
        rate: Number(rate) || 0,
        taken: Number(taken) || 0,
        sales: Number(sales) || 0,
        return: Number(ret) || 0,
        salesPrice: (Number(rate) || 0) * (Number(sales) || 0)
      });
    }
  }
  return items;
}

function addProduct(ss, product) {
  var sheet = ss.getSheetByName('PRODUCT RATE');
  if (!sheet) throw new Error('Sheet PRODUCT RATE not found');
  var lastRow = sheet.getLastRow();
  var newSlNo = lastRow; // row 1 is header
  sheet.appendRow([newSlNo, product.name, Number(product.rate), product.category || 'Other']);
  return { status: 'success', message: 'Product added successfully' };
}

function updateProductPrice(ss, productId, name, rate) {
  var sheet = ss.getSheetByName('PRODUCT RATE');
  if (!sheet) throw new Error('Sheet PRODUCT RATE not found');
  var data = sheet.getDataRange().getValues();
  var found = false;

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][1]).trim().toLowerCase() === String(name).trim().toLowerCase()) {
      sheet.getRange(r + 1, 3).setValue(Number(rate)); // Col 3 is RATE
      found = true;
      break;
    }
  }

  if (!found) {
    throw new Error('Product not found: ' + name);
  }
  return { status: 'success', message: 'Price updated successfully' };
}

function addShop(ss, shop) {
  var sheet = ss.getSheetByName('SHOPS');
  if (!sheet) throw new Error('Sheet SHOPS not found');
  var lastRow = sheet.getLastRow();
  var newSlNo = lastRow;
  var areaCode = 'TOLGATE';
  if (shop.area === 'Samayapuram') areaCode = 'SAMAYAPURAM';
  else if (shop.area === 'Manachanallur') areaCode = 'MANACHANALLUR';

  sheet.appendRow([newSlNo, shop.name, areaCode]);
  return { status: 'success', message: 'Shop added successfully' };
}

function recordSale(ss, sale) {
  // Ensure Sales Log sheet exists
  var logSheet = ss.getSheetByName('SALES LOG');
  if (!logSheet) {
    logSheet = ss.insertSheet('SALES LOG');
    logSheet.appendRow(['Date', 'Sale ID', 'Shop Name', 'Area', 'Items Count', 'Total Amount', 'Amount Paid', 'Balance Left', 'Payment Mode']);
  }

  logSheet.appendRow([
    new Date(sale.date || Date.now()).toLocaleString(),
    sale.id,
    sale.shopName,
    sale.area,
    sale.items ? sale.items.length : 0,
    Number(sale.totalAmount) || 0,
    Number(sale.amountPaid) || 0,
    Number(sale.remainingBalance) || 0,
    sale.paymentMode || 'Cash'
  ]);

  return { status: 'success', message: 'Sale recorded successfully', saleId: sale.id };
}

function recordPayment(ss, payment) {
  var paySheet = ss.getSheetByName('PAYMENTS LOG');
  if (!paySheet) {
    paySheet = ss.insertSheet('PAYMENTS LOG');
    paySheet.appendRow(['Date', 'Payment ID', 'Shop Name', 'Amount Paid', 'Notes', 'Mode']);
  }

  paySheet.appendRow([
    new Date().toLocaleString(),
    payment.id || ('PAY-' + Date.now()),
    payment.shopName,
    Number(payment.amount) || 0,
    payment.notes || '',
    payment.mode || 'Cash'
  ]);

  return { status: 'success', message: 'Payment recorded successfully' };
}

function updateDailyTaken(ss, items) {
  var sheet = ss.getSheetByName('DAILY TAKEN');
  if (!sheet) throw new Error('DAILY TAKEN sheet not found');
  var data = sheet.getDataRange().getValues();

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][1]).trim().toLowerCase() === String(item.productName).trim().toLowerCase()) {
        if (item.taken !== undefined) sheet.getRange(r + 1, 4).setValue(Number(item.taken));
        if (item.sales !== undefined) sheet.getRange(r + 1, 5).setValue(Number(item.sales));
        if (item.return !== undefined) sheet.getRange(r + 1, 6).setValue(Number(item.return));
        break;
      }
    }
  }

  return { status: 'success', message: 'Daily taken updated successfully' };
}

function pad(num, size) {
  var s = '000' + num;
  return s.substr(s.length - size);
}

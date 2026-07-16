// Translation dictionary for English and Urdu UI elements
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    // Sidebar Navigation
    "nav.dashboard": "Dashboard",
    "nav.products": "Products",
    "nav.brands": "Brands",
    "nav.categories": "Categories",
    "nav.units": "Units",
    "nav.customers": "Customers",
    "nav.khata": "Udhaar Khata",
    "nav.bills": "Bills",
    "nav.quotations": "Quotations",
    "nav.ledger": "Ledger",
    "nav.reports": "Reports",
    "nav.users": "Users",
    "nav.settings": "Settings",
    "nav.cashbook": "Cash Book",
    "nav.staff": "Staff Book",
    "nav.transactions": "Transactions",
    "nav.management": "Management",

    // POS / Bill Screen
    "pos.new_bill": "New Bill",
    "pos.subtotal": "Subtotal",
    "pos.discount": "Discount",
    "pos.tax": "Tax",
    "pos.grand_total": "Grand Total",
    "pos.amount_paid": "Amount Paid",
    "pos.amount_due": "Balance Due (Udhaar)",
    "pos.cash_received": "Cash Received",
    "pos.change_due": "Change Due",
    "pos.payment_method": "Payment Method",
    "pos.customer": "Customer",
    "pos.search_products": "Search product, SKU, or barcode...",

    // General Actions
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.close": "Close",
    "action.add": "Add",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.search": "Search",
  },
  ur: {
    // Sidebar Navigation
    "nav.dashboard": "ڈیش بورڈ",
    "nav.products": "پروڈکٹس",
    "nav.brands": "برانڈز",
    "nav.categories": "کیٹیگریز",
    "nav.units": "یونٹس",
    "nav.customers": "کسٹمرز",
    "nav.khata": "ادھار کھاتا",
    "nav.bills": "بلز",
    "nav.quotations": "کوٹیشنز",
    "nav.ledger": "لیجر",
    "nav.reports": "رپورٹس",
    "nav.users": "یوزرز",
    "nav.settings": "سیٹنگز",
    "nav.cashbook": "کیش بک (اخراجات)",
    "nav.staff": "اسٹاف بک",
    "nav.transactions": "ٹرانزیکشنز",
    "nav.management": "انتظامیہ",

    // POS / Bill Screen
    "pos.new_bill": "نیا بل",
    "pos.subtotal": "سب ٹوٹل",
    "pos.discount": "ڈسکاؤنٹ",
    "pos.tax": "ٹیکس",
    "pos.grand_total": "کل رقم",
    "pos.amount_paid": "ادا کی رقم",
    "pos.amount_due": "بقایا رقم (ادھار)",
    "pos.cash_received": "وصول کیش",
    "pos.change_due": "واپس بقایا",
    "pos.payment_method": "طریقہ ادائیگی",
    "pos.customer": "کسٹمر",
    "pos.search_products": "پروڈکٹ کا نام، SKU یا بارکوڈ سرچ کریں...",

    // General Actions
    "action.save": "محفوظ کریں",
    "action.cancel": "کینسل",
    "action.close": "بند کریں",
    "action.add": "شامل کریں",
    "action.edit": "تبدیل کریں",
    "action.delete": "ڈیلیٹ کریں",
    "action.search": "تلاش کریں",
  }
};

export function t(key: string, lang = "en"): string {
  const dictionary = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dictionary[key] || TRANSLATIONS.en[key] || key;
}

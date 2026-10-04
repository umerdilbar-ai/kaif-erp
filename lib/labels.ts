export interface Label { roman: string; en: string; ur: string }

export const L = {
  // nav
  dashboard: { roman: "Ghar", en: "Home", ur: "گھر" },
  sale: { roman: "Naya Bill", en: "New Sale", ur: "نیا بل" },
  quotation: { roman: "Andaza", en: "Quotation", ur: "اندازہ" },
  purchase: { roman: "Maal Aaya", en: "Purchase", ur: "مال آیا" },
  items: { roman: "Saman", en: "Items", ur: "سامان" },
  rateList: { roman: "Rate List", en: "Rate List", ur: "ریٹ لسٹ" },
  stock: { roman: "Stock", en: "Stock", ur: "اسٹاک" },
  parties: { roman: "Khata", en: "Parties", ur: "کھاتہ" },
  vouchers: { roman: "Vasooli / Kharcha", en: "Cash In / Out", ur: "وصولی / خرچہ" },
  roznamcha: { roman: "Roznamcha", en: "Day Book", ur: "روزنامچہ" },

  // money actions
  cashIn: { roman: "Vasooli", en: "Cash In", ur: "وصولی" },
  payment: { roman: "Adaigi", en: "Payment", ur: "ادائیگی" },
  expense: { roman: "Kharcha", en: "Expense", ur: "خرچہ" },
  udhaar: { roman: "Udhaar", en: "Credit", ur: "ادھار" },
  baaqi: { roman: "Baaqi", en: "Balance Due", ur: "باقی" },
  naqd: { roman: "Naqd", en: "Cash", ur: "نقد" },
  paid: { roman: "Diye", en: "Paid", ur: "دیے" },
  total: { roman: "Kul", en: "Total", ur: "کل" },
  discount: { roman: "Riayat", en: "Discount", ur: "رعایت" },
  lena: { roman: "Lena Hai", en: "Receivable", ur: "لینا ہے" },
  dena: { roman: "Dena Hai", en: "Payable", ur: "دینا ہے" },
  openingCash: { roman: "Shuru ki Raqam", en: "Opening Cash", ur: "شروع کی رقم" },

  // common actions
  savePrint: { roman: "Save & Print", en: "Save & Print", ur: "محفوظ اور پرنٹ" },
  save: { roman: "Save Karo", en: "Save", ur: "محفوظ کریں" },
  cancel: { roman: "Wapis", en: "Cancel", ur: "واپس" },
  delete: { roman: "Mitao", en: "Delete", ur: "مٹائیں" },
  edit: { roman: "Badlo", en: "Edit", ur: "تبدیل" },
  add: { roman: "Naya Daalo", en: "Add", ur: "نیا ڈالیں" },
  search: { roman: "Dhoondo", en: "Search", ur: "تلاش" },
  print: { roman: "Print", en: "Print", ur: "پرنٹ" },
  convertToSale: { roman: "Bill Banao", en: "Convert to Sale", ur: "بل بنائیں" },
  login: { roman: "Andar Aao", en: "Login", ur: "داخل ہوں" },
  logout: { roman: "Bahar Jao", en: "Logout", ur: "باہر جائیں" },

  // nouns
  customer: { roman: "Gahak", en: "Customer", ur: "گاہک" },
  supplier: { roman: "Supplier", en: "Supplier", ur: "سپلائر" },
  item: { roman: "Cheez", en: "Item", ur: "چیز" },
  quantity: { roman: "Tadaad", en: "Quantity", ur: "تعداد" },
  price: { roman: "Rate", en: "Price", ur: "ریٹ" },
  retail: { roman: "Parchoon", en: "Retail", ur: "پرچون" },
  wholesale: { roman: "Thok", en: "Wholesale", ur: "تھوک" },
  lowStock: { roman: "Maal Kam Hai", en: "Low Stock", ur: "مال کم ہے" },
  damage: { roman: "Kharab Maal", en: "Damage", ur: "خراب مال" },
  returnIn: { roman: "Wapsi Aayi", en: "Return In", ur: "واپسی آئی" },
  returnOut: { roman: "Wapsi Gayi", en: "Return Out", ur: "واپسی گئی" },
  transfer: { roman: "Jagah Badlo", en: "Transfer", ur: "جگہ بدلیں" },
  location: { roman: "Jagah", en: "Location", ur: "جگہ" },
  category: { roman: "Qism", en: "Category", ur: "قسم" },
  today: { roman: "Aaj", en: "Today", ur: "آج" },
  comingSoon: { roman: "Jald Aa Raha Hai", en: "Coming soon", ur: "جلد آ رہا ہے" },
  nothingHere: { roman: "Kuch Nahi Hai", en: "Nothing here", ur: "کچھ نہیں ہے" },
} satisfies Record<string, Label>;

export type LabelKey = keyof typeof L;

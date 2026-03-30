/**
 * Comprehensive Currency Support
 * Based on ISO 4217 standard
 */

export interface Currency {
  code: string; // ISO 4217 code (e.g., "USD")
  name: string; // Full name (e.g., "US Dollar")
  symbol: string; // Symbol (e.g., "$")
  symbolNative: string; // Native symbol
  decimalDigits: number; // Decimal places (usually 2, some 0 or 3)
  region: CurrencyRegion;
  flag?: string; // Country flag emoji
}

export type CurrencyRegion =
  | "north_america"
  | "south_america"
  | "europe"
  | "asia"
  | "middle_east"
  | "africa"
  | "oceania"
  | "caribbean";

// Popular currencies shown at top of picker
export const POPULAR_CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "PKR",
  "AED",
  "SAR",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
  "SGD",
];

// All currencies - comprehensive list
export const CURRENCIES: Currency[] = [
  // North America
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "north_america",
    flag: "🇺🇸",
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "CA$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "north_america",
    flag: "🇨🇦",
  },
  {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "MX$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "north_america",
    flag: "🇲🇽",
  },

  // Europe
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    symbolNative: "€",
    decimalDigits: 2,
    region: "europe",
    flag: "🇪🇺",
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    symbolNative: "£",
    decimalDigits: 2,
    region: "europe",
    flag: "🇬🇧",
  },
  {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    symbolNative: "CHF",
    decimalDigits: 2,
    region: "europe",
    flag: "🇨🇭",
  },
  {
    code: "SEK",
    name: "Swedish Krona",
    symbol: "kr",
    symbolNative: "kr",
    decimalDigits: 2,
    region: "europe",
    flag: "🇸🇪",
  },
  {
    code: "NOK",
    name: "Norwegian Krone",
    symbol: "kr",
    symbolNative: "kr",
    decimalDigits: 2,
    region: "europe",
    flag: "🇳🇴",
  },
  {
    code: "DKK",
    name: "Danish Krone",
    symbol: "kr",
    symbolNative: "kr",
    decimalDigits: 2,
    region: "europe",
    flag: "🇩🇰",
  },
  {
    code: "PLN",
    name: "Polish Złoty",
    symbol: "zł",
    symbolNative: "zł",
    decimalDigits: 2,
    region: "europe",
    flag: "🇵🇱",
  },
  {
    code: "CZK",
    name: "Czech Koruna",
    symbol: "Kč",
    symbolNative: "Kč",
    decimalDigits: 2,
    region: "europe",
    flag: "🇨🇿",
  },
  {
    code: "HUF",
    name: "Hungarian Forint",
    symbol: "Ft",
    symbolNative: "Ft",
    decimalDigits: 0,
    region: "europe",
    flag: "🇭🇺",
  },
  {
    code: "RON",
    name: "Romanian Leu",
    symbol: "lei",
    symbolNative: "lei",
    decimalDigits: 2,
    region: "europe",
    flag: "🇷🇴",
  },
  {
    code: "BGN",
    name: "Bulgarian Lev",
    symbol: "лв",
    symbolNative: "лв",
    decimalDigits: 2,
    region: "europe",
    flag: "🇧🇬",
  },
  {
    code: "HRK",
    name: "Croatian Kuna",
    symbol: "kn",
    symbolNative: "kn",
    decimalDigits: 2,
    region: "europe",
    flag: "🇭🇷",
  },
  {
    code: "RSD",
    name: "Serbian Dinar",
    symbol: "din",
    symbolNative: "дин",
    decimalDigits: 2,
    region: "europe",
    flag: "🇷🇸",
  },
  {
    code: "UAH",
    name: "Ukrainian Hryvnia",
    symbol: "₴",
    symbolNative: "₴",
    decimalDigits: 2,
    region: "europe",
    flag: "🇺🇦",
  },
  {
    code: "RUB",
    name: "Russian Ruble",
    symbol: "₽",
    symbolNative: "₽",
    decimalDigits: 2,
    region: "europe",
    flag: "🇷🇺",
  },
  {
    code: "TRY",
    name: "Turkish Lira",
    symbol: "₺",
    symbolNative: "₺",
    decimalDigits: 2,
    region: "europe",
    flag: "🇹🇷",
  },
  {
    code: "ISK",
    name: "Icelandic Króna",
    symbol: "kr",
    symbolNative: "kr",
    decimalDigits: 0,
    region: "europe",
    flag: "🇮🇸",
  },

  // Asia
  {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    symbolNative: "₹",
    decimalDigits: 2,
    region: "asia",
    flag: "🇮🇳",
  },
  {
    code: "PKR",
    name: "Pakistani Rupee",
    symbol: "Rs",
    symbolNative: "₨",
    decimalDigits: 2,
    region: "asia",
    flag: "🇵🇰",
  },
  {
    code: "BDT",
    name: "Bangladeshi Taka",
    symbol: "৳",
    symbolNative: "৳",
    decimalDigits: 2,
    region: "asia",
    flag: "🇧🇩",
  },
  {
    code: "LKR",
    name: "Sri Lankan Rupee",
    symbol: "Rs",
    symbolNative: "රු",
    decimalDigits: 2,
    region: "asia",
    flag: "🇱🇰",
  },
  {
    code: "NPR",
    name: "Nepalese Rupee",
    symbol: "Rs",
    symbolNative: "रू",
    decimalDigits: 2,
    region: "asia",
    flag: "🇳🇵",
  },
  {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    symbolNative: "¥",
    decimalDigits: 2,
    region: "asia",
    flag: "🇨🇳",
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    symbolNative: "¥",
    decimalDigits: 0,
    region: "asia",
    flag: "🇯🇵",
  },
  {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    symbolNative: "₩",
    decimalDigits: 0,
    region: "asia",
    flag: "🇰🇷",
  },
  {
    code: "TWD",
    name: "Taiwan Dollar",
    symbol: "NT$",
    symbolNative: "NT$",
    decimalDigits: 2,
    region: "asia",
    flag: "🇹🇼",
  },
  {
    code: "HKD",
    name: "Hong Kong Dollar",
    symbol: "HK$",
    symbolNative: "HK$",
    decimalDigits: 2,
    region: "asia",
    flag: "🇭🇰",
  },
  {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    symbolNative: "S$",
    decimalDigits: 2,
    region: "asia",
    flag: "🇸🇬",
  },
  {
    code: "MYR",
    name: "Malaysian Ringgit",
    symbol: "RM",
    symbolNative: "RM",
    decimalDigits: 2,
    region: "asia",
    flag: "🇲🇾",
  },
  {
    code: "THB",
    name: "Thai Baht",
    symbol: "฿",
    symbolNative: "฿",
    decimalDigits: 2,
    region: "asia",
    flag: "🇹🇭",
  },
  {
    code: "IDR",
    name: "Indonesian Rupiah",
    symbol: "Rp",
    symbolNative: "Rp",
    decimalDigits: 0,
    region: "asia",
    flag: "🇮🇩",
  },
  {
    code: "VND",
    name: "Vietnamese Dong",
    symbol: "₫",
    symbolNative: "₫",
    decimalDigits: 0,
    region: "asia",
    flag: "🇻🇳",
  },
  {
    code: "PHP",
    name: "Philippine Peso",
    symbol: "₱",
    symbolNative: "₱",
    decimalDigits: 2,
    region: "asia",
    flag: "🇵🇭",
  },
  {
    code: "MMK",
    name: "Myanmar Kyat",
    symbol: "K",
    symbolNative: "K",
    decimalDigits: 0,
    region: "asia",
    flag: "🇲🇲",
  },
  {
    code: "KHR",
    name: "Cambodian Riel",
    symbol: "៛",
    symbolNative: "៛",
    decimalDigits: 2,
    region: "asia",
    flag: "🇰🇭",
  },
  {
    code: "LAK",
    name: "Lao Kip",
    symbol: "₭",
    symbolNative: "₭",
    decimalDigits: 0,
    region: "asia",
    flag: "🇱🇦",
  },
  {
    code: "MNT",
    name: "Mongolian Tugrik",
    symbol: "₮",
    symbolNative: "₮",
    decimalDigits: 2,
    region: "asia",
    flag: "🇲🇳",
  },
  {
    code: "KZT",
    name: "Kazakhstani Tenge",
    symbol: "₸",
    symbolNative: "₸",
    decimalDigits: 2,
    region: "asia",
    flag: "🇰🇿",
  },
  {
    code: "UZS",
    name: "Uzbekistani Som",
    symbol: "soʻm",
    symbolNative: "сўм",
    decimalDigits: 2,
    region: "asia",
    flag: "🇺🇿",
  },
  {
    code: "AFN",
    name: "Afghan Afghani",
    symbol: "؋",
    symbolNative: "؋",
    decimalDigits: 2,
    region: "asia",
    flag: "🇦🇫",
  },

  // Middle East
  {
    code: "AED",
    name: "UAE Dirham",
    symbol: "AED",
    symbolNative: "د.إ",
    decimalDigits: 2,
    region: "middle_east",
    flag: "🇦🇪",
  },
  {
    code: "SAR",
    name: "Saudi Riyal",
    symbol: "SAR",
    symbolNative: "ر.س",
    decimalDigits: 2,
    region: "middle_east",
    flag: "🇸🇦",
  },
  {
    code: "QAR",
    name: "Qatari Riyal",
    symbol: "QR",
    symbolNative: "ر.ق",
    decimalDigits: 2,
    region: "middle_east",
    flag: "🇶🇦",
  },
  {
    code: "KWD",
    name: "Kuwaiti Dinar",
    symbol: "KD",
    symbolNative: "د.ك",
    decimalDigits: 3,
    region: "middle_east",
    flag: "🇰🇼",
  },
  {
    code: "BHD",
    name: "Bahraini Dinar",
    symbol: "BD",
    symbolNative: "د.ب",
    decimalDigits: 3,
    region: "middle_east",
    flag: "🇧🇭",
  },
  {
    code: "OMR",
    name: "Omani Rial",
    symbol: "OMR",
    symbolNative: "ر.ع",
    decimalDigits: 3,
    region: "middle_east",
    flag: "🇴🇲",
  },
  {
    code: "JOD",
    name: "Jordanian Dinar",
    symbol: "JD",
    symbolNative: "د.أ",
    decimalDigits: 3,
    region: "middle_east",
    flag: "🇯🇴",
  },
  {
    code: "ILS",
    name: "Israeli Shekel",
    symbol: "₪",
    symbolNative: "₪",
    decimalDigits: 2,
    region: "middle_east",
    flag: "🇮🇱",
  },
  {
    code: "LBP",
    name: "Lebanese Pound",
    symbol: "L£",
    symbolNative: "ل.ل",
    decimalDigits: 2,
    region: "middle_east",
    flag: "🇱🇧",
  },
  {
    code: "EGP",
    name: "Egyptian Pound",
    symbol: "E£",
    symbolNative: "ج.م",
    decimalDigits: 2,
    region: "middle_east",
    flag: "🇪🇬",
  },
  {
    code: "IQD",
    name: "Iraqi Dinar",
    symbol: "IQD",
    symbolNative: "د.ع",
    decimalDigits: 0,
    region: "middle_east",
    flag: "🇮🇶",
  },
  {
    code: "IRR",
    name: "Iranian Rial",
    symbol: "IRR",
    symbolNative: "﷼",
    decimalDigits: 0,
    region: "middle_east",
    flag: "🇮🇷",
  },
  {
    code: "SYP",
    name: "Syrian Pound",
    symbol: "SYP",
    symbolNative: "ل.س",
    decimalDigits: 2,
    region: "middle_east",
    flag: "🇸🇾",
  },
  {
    code: "YER",
    name: "Yemeni Rial",
    symbol: "YER",
    symbolNative: "﷼",
    decimalDigits: 2,
    region: "middle_east",
    flag: "🇾🇪",
  },

  // Africa
  {
    code: "ZAR",
    name: "South African Rand",
    symbol: "R",
    symbolNative: "R",
    decimalDigits: 2,
    region: "africa",
    flag: "🇿🇦",
  },
  {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    symbolNative: "₦",
    decimalDigits: 2,
    region: "africa",
    flag: "🇳🇬",
  },
  {
    code: "KES",
    name: "Kenyan Shilling",
    symbol: "KSh",
    symbolNative: "KSh",
    decimalDigits: 2,
    region: "africa",
    flag: "🇰🇪",
  },
  {
    code: "GHS",
    name: "Ghanaian Cedi",
    symbol: "GH₵",
    symbolNative: "₵",
    decimalDigits: 2,
    region: "africa",
    flag: "🇬🇭",
  },
  {
    code: "TZS",
    name: "Tanzanian Shilling",
    symbol: "TSh",
    symbolNative: "TSh",
    decimalDigits: 2,
    region: "africa",
    flag: "🇹🇿",
  },
  {
    code: "UGX",
    name: "Ugandan Shilling",
    symbol: "USh",
    symbolNative: "USh",
    decimalDigits: 0,
    region: "africa",
    flag: "🇺🇬",
  },
  {
    code: "ETB",
    name: "Ethiopian Birr",
    symbol: "Br",
    symbolNative: "Br",
    decimalDigits: 2,
    region: "africa",
    flag: "🇪🇹",
  },
  {
    code: "MAD",
    name: "Moroccan Dirham",
    symbol: "MAD",
    symbolNative: "د.م.",
    decimalDigits: 2,
    region: "africa",
    flag: "🇲🇦",
  },
  {
    code: "DZD",
    name: "Algerian Dinar",
    symbol: "DA",
    symbolNative: "د.ج",
    decimalDigits: 2,
    region: "africa",
    flag: "🇩🇿",
  },
  {
    code: "TND",
    name: "Tunisian Dinar",
    symbol: "DT",
    symbolNative: "د.ت",
    decimalDigits: 3,
    region: "africa",
    flag: "🇹🇳",
  },
  {
    code: "XOF",
    name: "West African CFA",
    symbol: "CFA",
    symbolNative: "CFA",
    decimalDigits: 0,
    region: "africa",
    flag: "🌍",
  },
  {
    code: "XAF",
    name: "Central African CFA",
    symbol: "FCFA",
    symbolNative: "FCFA",
    decimalDigits: 0,
    region: "africa",
    flag: "🌍",
  },
  {
    code: "MUR",
    name: "Mauritian Rupee",
    symbol: "Rs",
    symbolNative: "₨",
    decimalDigits: 2,
    region: "africa",
    flag: "🇲🇺",
  },
  {
    code: "RWF",
    name: "Rwandan Franc",
    symbol: "RF",
    symbolNative: "RF",
    decimalDigits: 0,
    region: "africa",
    flag: "🇷🇼",
  },
  {
    code: "BWP",
    name: "Botswana Pula",
    symbol: "P",
    symbolNative: "P",
    decimalDigits: 2,
    region: "africa",
    flag: "🇧🇼",
  },
  {
    code: "ZMW",
    name: "Zambian Kwacha",
    symbol: "ZK",
    symbolNative: "ZK",
    decimalDigits: 2,
    region: "africa",
    flag: "🇿🇲",
  },
  {
    code: "MWK",
    name: "Malawian Kwacha",
    symbol: "MK",
    symbolNative: "MK",
    decimalDigits: 2,
    region: "africa",
    flag: "🇲🇼",
  },
  {
    code: "AOA",
    name: "Angolan Kwanza",
    symbol: "Kz",
    symbolNative: "Kz",
    decimalDigits: 2,
    region: "africa",
    flag: "🇦🇴",
  },
  {
    code: "MZN",
    name: "Mozambican Metical",
    symbol: "MT",
    symbolNative: "MT",
    decimalDigits: 2,
    region: "africa",
    flag: "🇲🇿",
  },
  {
    code: "NAD",
    name: "Namibian Dollar",
    symbol: "N$",
    symbolNative: "N$",
    decimalDigits: 2,
    region: "africa",
    flag: "🇳🇦",
  },
  {
    code: "SCR",
    name: "Seychellois Rupee",
    symbol: "Rs",
    symbolNative: "₨",
    decimalDigits: 2,
    region: "africa",
    flag: "🇸🇨",
  },
  {
    code: "SDG",
    name: "Sudanese Pound",
    symbol: "SDG",
    symbolNative: "ج.س.",
    decimalDigits: 2,
    region: "africa",
    flag: "🇸🇩",
  },
  {
    code: "LYD",
    name: "Libyan Dinar",
    symbol: "LD",
    symbolNative: "د.ل",
    decimalDigits: 3,
    region: "africa",
    flag: "🇱🇾",
  },

  // Oceania
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "oceania",
    flag: "🇦🇺",
  },
  {
    code: "NZD",
    name: "New Zealand Dollar",
    symbol: "NZ$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "oceania",
    flag: "🇳🇿",
  },
  {
    code: "FJD",
    name: "Fijian Dollar",
    symbol: "FJ$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "oceania",
    flag: "🇫🇯",
  },
  {
    code: "PGK",
    name: "Papua New Guinean Kina",
    symbol: "K",
    symbolNative: "K",
    decimalDigits: 2,
    region: "oceania",
    flag: "🇵🇬",
  },
  {
    code: "WST",
    name: "Samoan Tala",
    symbol: "WS$",
    symbolNative: "WS$",
    decimalDigits: 2,
    region: "oceania",
    flag: "🇼🇸",
  },
  {
    code: "SBD",
    name: "Solomon Islands Dollar",
    symbol: "SI$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "oceania",
    flag: "🇸🇧",
  },
  {
    code: "TOP",
    name: "Tongan Paʻanga",
    symbol: "T$",
    symbolNative: "T$",
    decimalDigits: 2,
    region: "oceania",
    flag: "🇹🇴",
  },
  {
    code: "VUV",
    name: "Vanuatu Vatu",
    symbol: "VT",
    symbolNative: "VT",
    decimalDigits: 0,
    region: "oceania",
    flag: "🇻🇺",
  },

  // South America
  {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    symbolNative: "R$",
    decimalDigits: 2,
    region: "south_america",
    flag: "🇧🇷",
  },
  {
    code: "ARS",
    name: "Argentine Peso",
    symbol: "AR$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "south_america",
    flag: "🇦🇷",
  },
  {
    code: "CLP",
    name: "Chilean Peso",
    symbol: "CL$",
    symbolNative: "$",
    decimalDigits: 0,
    region: "south_america",
    flag: "🇨🇱",
  },
  {
    code: "COP",
    name: "Colombian Peso",
    symbol: "CO$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "south_america",
    flag: "🇨🇴",
  },
  {
    code: "PEN",
    name: "Peruvian Sol",
    symbol: "S/",
    symbolNative: "S/",
    decimalDigits: 2,
    region: "south_america",
    flag: "🇵🇪",
  },
  {
    code: "VES",
    name: "Venezuelan Bolívar",
    symbol: "Bs",
    symbolNative: "Bs",
    decimalDigits: 2,
    region: "south_america",
    flag: "🇻🇪",
  },
  {
    code: "UYU",
    name: "Uruguayan Peso",
    symbol: "$U",
    symbolNative: "$",
    decimalDigits: 2,
    region: "south_america",
    flag: "🇺🇾",
  },
  {
    code: "PYG",
    name: "Paraguayan Guaraní",
    symbol: "₲",
    symbolNative: "₲",
    decimalDigits: 0,
    region: "south_america",
    flag: "🇵🇾",
  },
  {
    code: "BOB",
    name: "Bolivian Boliviano",
    symbol: "Bs",
    symbolNative: "Bs",
    decimalDigits: 2,
    region: "south_america",
    flag: "🇧🇴",
  },
  {
    code: "GYD",
    name: "Guyanese Dollar",
    symbol: "GY$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "south_america",
    flag: "🇬🇾",
  },
  {
    code: "SRD",
    name: "Surinamese Dollar",
    symbol: "SR$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "south_america",
    flag: "🇸🇷",
  },

  // Caribbean
  {
    code: "JMD",
    name: "Jamaican Dollar",
    symbol: "J$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇯🇲",
  },
  {
    code: "TTD",
    name: "Trinidad & Tobago Dollar",
    symbol: "TT$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇹🇹",
  },
  {
    code: "BBD",
    name: "Barbadian Dollar",
    symbol: "Bds$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇧🇧",
  },
  {
    code: "BSD",
    name: "Bahamian Dollar",
    symbol: "B$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇧🇸",
  },
  {
    code: "HTG",
    name: "Haitian Gourde",
    symbol: "G",
    symbolNative: "G",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇭🇹",
  },
  {
    code: "DOP",
    name: "Dominican Peso",
    symbol: "RD$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇩🇴",
  },
  {
    code: "CUP",
    name: "Cuban Peso",
    symbol: "₱",
    symbolNative: "₱",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇨🇺",
  },
  {
    code: "XCD",
    name: "East Caribbean Dollar",
    symbol: "EC$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🌴",
  },
  {
    code: "AWG",
    name: "Aruban Florin",
    symbol: "Afl",
    symbolNative: "ƒ",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇦🇼",
  },
  {
    code: "ANG",
    name: "Netherlands Antillean Guilder",
    symbol: "NAƒ",
    symbolNative: "ƒ",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇨🇼",
  },
  {
    code: "KYD",
    name: "Cayman Islands Dollar",
    symbol: "CI$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇰🇾",
  },
  {
    code: "BMD",
    name: "Bermudian Dollar",
    symbol: "BD$",
    symbolNative: "$",
    decimalDigits: 2,
    region: "caribbean",
    flag: "🇧🇲",
  },

  // Crypto (commonly used)
  {
    code: "BTC",
    name: "Bitcoin",
    symbol: "₿",
    symbolNative: "₿",
    decimalDigits: 8,
    region: "europe",
    flag: "₿",
  },
  {
    code: "ETH",
    name: "Ethereum",
    symbol: "Ξ",
    symbolNative: "Ξ",
    decimalDigits: 8,
    region: "europe",
    flag: "Ξ",
  },
];

// Currency lookup map for O(1) access
const currencyMap = new Map<string, Currency>();
CURRENCIES.forEach((c) => currencyMap.set(c.code, c));

/**
 * Get currency by code
 */
export function getCurrency(code: string): Currency | undefined {
  return currencyMap.get(code);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(code: string): string {
  return currencyMap.get(code)?.symbol || code;
}

/**
 * Format amount with currency
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: string = "USD",
  options?: {
    showCode?: boolean;
    useNativeSymbol?: boolean;
    compact?: boolean;
    compactThreshold?: number;
  },
): string {
  const currency = currencyMap.get(currencyCode);
  if (!currency) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }

  const symbol = options?.useNativeSymbol
    ? currency.symbolNative
    : currency.symbol;
  let formattedAmount: string;
  const absAmount = Math.abs(amount);
  const compactThreshold = options?.compactThreshold ?? 1000;

  if (options?.compact && absAmount >= compactThreshold) {
    const scales = [
      { value: 1000000000, suffix: "B" },
      { value: 1000000, suffix: "M" },
      { value: 1000, suffix: "K" },
    ];
    const scale = scales.find((entry) => absAmount >= entry.value);

    if (scale) {
      const scaledAmount = amount / scale.value;
      const compactDigits =
        Math.abs(scaledAmount) >= 100
          ? 0
          : Math.abs(scaledAmount) >= 10
            ? 1
            : 2;
      formattedAmount =
        scaledAmount
          .toFixed(compactDigits)
          .replace(/\.0+$|(\.\d*[1-9])0+$/, "$1") + scale.suffix;
    } else {
      formattedAmount = amount.toLocaleString(undefined, {
        minimumFractionDigits: currency.decimalDigits,
        maximumFractionDigits: currency.decimalDigits,
      });
    }
  } else {
    formattedAmount = amount.toLocaleString(undefined, {
      minimumFractionDigits: currency.decimalDigits,
      maximumFractionDigits: currency.decimalDigits,
    });
  }

  // Handle placement (most currencies use symbol prefix)
  const result = `${symbol}${formattedAmount}`;

  if (options?.showCode) {
    return `${result} ${currencyCode}`;
  }

  return result;
}

/**
 * Get currencies by region
 */
export function getCurrenciesByRegion(region: CurrencyRegion): Currency[] {
  return CURRENCIES.filter((c) => c.region === region);
}

/**
 * Get popular currencies
 */
export function getPopularCurrencies(): Currency[] {
  return POPULAR_CURRENCY_CODES.map((code) => currencyMap.get(code)).filter(
    (c): c is Currency => c !== undefined,
  );
}

/**
 * Search currencies by name, code, or symbol
 */
export function searchCurrencies(query: string): Currency[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q) ||
      c.symbolNative.includes(q),
  );
}

/**
 * Region display names
 */
export const REGION_NAMES: Record<CurrencyRegion, string> = {
  north_america: "North America",
  south_america: "South America",
  europe: "Europe",
  asia: "Asia",
  middle_east: "Middle East",
  africa: "Africa",
  oceania: "Oceania",
  caribbean: "Caribbean",
};

/**
 * Get all unique regions
 */
export function getAllRegions(): CurrencyRegion[] {
  return Object.keys(REGION_NAMES) as CurrencyRegion[];
}

/**
 * Default currency
 */
export const DEFAULT_CURRENCY_CODE = "USD";

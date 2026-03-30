/**
 * Smart Categories System
 * A comprehensive dictionary for auto-categorization and intelligent expense tracking
 */

import { Ionicons } from "@expo/vector-icons";

// ============================================
// CATEGORY DEFINITIONS WITH ICONS
// ============================================

export interface CategoryDefinition {
  id: string;
  name: string;
  type: "expense" | "income";
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  emoji?: string;
  keywords: string[];
  description: string;
}

// Comprehensive category definitions with rich metadata
export const SMART_CATEGORIES: CategoryDefinition[] = [
  // ========== EXPENSE CATEGORIES ==========

  // Food & Dining
  {
    id: "food_dining",
    name: "Food & Dining",
    type: "expense",
    icon: "restaurant",
    color: "#F97316",
    emoji: "🍽️",
    description: "Restaurants, takeout, dining out",
    keywords: [
      // Restaurants & Chains
      "restaurant",
      "mcdonalds",
      "mcdonald's",
      "burger king",
      "wendy's",
      "wendys",
      "subway",
      "taco bell",
      "chipotle",
      "chick-fil-a",
      "chickfila",
      "kfc",
      "pizza hut",
      "dominos",
      "domino's",
      "papa johns",
      "little caesars",
      "olive garden",
      "applebees",
      "applebee's",
      "chili's",
      "chilis",
      "ihop",
      "denny's",
      "dennys",
      "waffle house",
      "cracker barrel",
      "outback",
      "red lobster",
      "longhorn",
      "texas roadhouse",
      "buffalo wild wings",
      "bww",
      "five guys",
      "in-n-out",
      "shake shack",
      "whataburger",
      "sonic",
      "popeyes",
      "raising cane's",
      "zaxby's",
      "wingstop",
      "nando's",
      "panera",
      "panera bread",
      "jason's deli",
      "firehouse subs",
      "jersey mike's",
      "jimmy john's",
      "potbelly",
      "which wich",
      "schlotzsky's",
      "panda express",
      "pf chang's",
      "pf changs",
      "benihana",
      "cheesecake factory",
      "bj's",
      "bjs restaurant",
      "dave and busters",
      "hooters",
      "twin peaks",
      "buffalo wild wings",

      // Fast Food
      "fast food",
      "drive thru",
      "drive through",
      "takeout",
      "take out",
      "takeaway",
      "delivery",
      "grubhub",
      "doordash",
      "uber eats",
      "ubereats",
      "postmates",
      "seamless",
      "caviar",
      "instacart",

      // Dining Types
      "dinner",
      "lunch",
      "brunch",
      "breakfast out",
      "dining",
      "dine out",
      "eat out",
      "eating out",
      "meal out",
      "food delivery",

      // International Cuisine
      "sushi",
      "ramen",
      "pho",
      "thai food",
      "chinese food",
      "indian food",
      "mexican food",
      "italian food",
      "korean bbq",
      "bbq",
      "barbecue",
      "steakhouse",
      "seafood",
      "buffet",
      "dim sum",
      "tapas",
    ],
  },

  // Coffee & Cafe
  {
    id: "coffee_cafe",
    name: "Coffee & Cafe",
    type: "expense",
    icon: "cafe",
    color: "#92400E",
    emoji: "☕",
    description: "Coffee shops, tea, cafe visits",
    keywords: [
      // Coffee Chains
      "starbucks",
      "dunkin",
      "dunkin donuts",
      "dunkin'",
      "peet's",
      "peets",
      "caribou coffee",
      "tim hortons",
      "costa coffee",
      "coffee bean",
      "blue bottle",
      "intelligentsia",
      "stumptown",
      "philz",
      "philz coffee",
      "dutch bros",
      "scooter's coffee",
      "black rifle coffee",
      "biggby",
      "la colombe",
      "gregorys",
      "birch coffee",
      "joe coffee",
      "think coffee",

      // Beverages
      "coffee",
      "latte",
      "cappuccino",
      "espresso",
      "americano",
      "mocha",
      "frappuccino",
      "cold brew",
      "iced coffee",
      "macchiato",
      "tea",
      "matcha",
      "chai",
      "boba",
      "bubble tea",
      "smoothie",

      // Cafes & Bakeries
      "cafe",
      "café",
      "coffee shop",
      "coffeehouse",
      "coffee house",
      "bakery",
      "pastry",
      "croissant",
      "bagel",
      "donut",
      "doughnut",
    ],
  },

  // Groceries
  {
    id: "groceries",
    name: "Groceries",
    type: "expense",
    icon: "cart",
    color: "#22C55E",
    emoji: "🛒",
    description: "Supermarkets, food stores, household essentials",
    keywords: [
      // Supermarkets
      "grocery",
      "groceries",
      "supermarket",
      "market",
      "food store",
      "walmart",
      "target",
      "costco",
      "sam's club",
      "sams club",
      "bj's wholesale",
      "kroger",
      "safeway",
      "albertsons",
      "publix",
      "h-e-b",
      "heb",
      "whole foods",
      "trader joe's",
      "trader joes",
      "aldi",
      "lidl",
      "food lion",
      "giant",
      "stop & shop",
      "stop and shop",
      "shoprite",
      "wegmans",
      "meijer",
      "winco",
      "sprouts",
      "fresh market",
      "harris teeter",
      "food city",
      "piggly wiggly",
      "winn dixie",
      "bi-lo",
      "jewel osco",
      "vons",
      "ralphs",
      "fry's",
      "frys",
      "king soopers",
      "acme",
      "pathmark",
      "fairway",
      "gristedes",
      "key food",

      // Specialty Stores
      "butcher",
      "fishmonger",
      "bakery",
      "deli",
      "farmer's market",
      "farmers market",
      "organic",
      "produce",
      "meat market",

      // Items
      "milk",
      "bread",
      "eggs",
      "fruit",
      "vegetables",
      "meat",
      "chicken",
      "beef",
      "pork",
      "fish",
      "seafood",
      "cheese",
      "yogurt",
      "cereal",
    ],
  },

  // Transportation
  {
    id: "transportation",
    name: "Transportation",
    type: "expense",
    icon: "car",
    color: "#8B5CF6",
    emoji: "🚗",
    description: "Gas, rideshare, public transit, parking",
    keywords: [
      // Rideshare & Taxi
      "uber",
      "lyft",
      "taxi",
      "cab",
      "rideshare",
      "ride share",
      "ride",
      "fare",
      "trip",
      "via",
      "juno",
      "curb",
      "gett",

      // Gas & Fuel
      "gas",
      "gasoline",
      "fuel",
      "petrol",
      "diesel",
      "shell",
      "chevron",
      "exxon",
      "mobil",
      "exxonmobil",
      "bp",
      "76",
      "arco",
      "marathon",
      "sunoco",
      "valero",
      "citgo",
      "phillips 66",
      "circle k",
      "speedway",
      "quiktrip",
      "qt",
      "wawa",
      "sheetz",
      "racetrac",
      "costco gas",
      "sam's gas",
      "buc-ee's",
      "bucees",
      "loves",
      "pilot",

      // Public Transit
      "metro",
      "subway",
      "bus",
      "train",
      "rail",
      "transit",
      "mta",
      "bart",
      "cta",
      "mbta",
      "septa",
      "wmata",
      "muni",
      "metrocard",
      "clipper",
      "orca",
      "tap",
      "ventra",
      "charlie card",

      // Parking
      "parking",
      "parking lot",
      "parking garage",
      "meter",
      "valet",
      "spothero",
      "parkwhiz",
      "parkme",
      "bestparking",

      // Car Services
      "car wash",
      "carwash",
      "oil change",
      "tire",
      "mechanic",
      "auto repair",
      "jiffy lube",
      "valvoline",
      "firestone",
      "goodyear",
      "discount tire",
      "pep boys",
      "autozone",
      "o'reilly",
      "advance auto",
      "napa",

      // Tolls
      "toll",
      "e-zpass",
      "ezpass",
      "fastrak",
      "sunpass",
      "i-pass",
    ],
  },

  // Shopping
  {
    id: "shopping",
    name: "Shopping",
    type: "expense",
    icon: "bag-handle",
    color: "#EC4899",
    emoji: "🛍️",
    description: "Clothing, electronics, general retail",
    keywords: [
      // Department Stores
      "amazon",
      "walmart",
      "target",
      "costco",
      "best buy",
      "bestbuy",
      "macy's",
      "macys",
      "nordstrom",
      "jcpenney",
      "jc penney",
      "kohl's",
      "kohls",
      "dillard's",
      "dillards",
      "neiman marcus",
      "saks",
      "bloomingdale's",
      "ross",
      "tj maxx",
      "tjmaxx",
      "marshalls",
      "burlington",
      "homegoods",

      // Clothing
      "nike",
      "adidas",
      "under armour",
      "gap",
      "old navy",
      "banana republic",
      "h&m",
      "hm",
      "zara",
      "forever 21",
      "uniqlo",
      "asos",
      "shein",
      "lululemon",
      "athleta",
      "fabletics",
      "american eagle",
      "aerie",
      "abercrombie",
      "hollister",
      "express",
      "urban outfitters",
      "anthropologie",
      "free people",
      "madewell",
      "j crew",
      "j.crew",
      "ann taylor",
      "loft",
      "foot locker",
      "finish line",
      "champs",
      "dick's",
      "dicks sporting goods",

      // Electronics
      "apple store",
      "apple",
      "microsoft store",
      "samsung",
      "best buy",
      "micro center",
      "b&h",
      "newegg",
      "electronics",
      "computer",
      "laptop",
      "phone",
      "iphone",
      "airpods",
      "headphones",
      "tablet",
      "ipad",

      // Online Shopping
      "ebay",
      "etsy",
      "wayfair",
      "overstock",
      "wish",
      "aliexpress",
      "shopify",
      "online order",
      "online shopping",
      "e-commerce",

      // General
      "shopping",
      "store",
      "mall",
      "outlet",
      "retail",
      "purchase",
      "clothes",
      "clothing",
      "shoes",
      "accessories",
      "jewelry",
    ],
  },

  // Entertainment
  {
    id: "entertainment",
    name: "Entertainment",
    type: "expense",
    icon: "film",
    color: "#A855F7",
    emoji: "🎬",
    description: "Movies, events, streaming, hobbies",
    keywords: [
      // Movies & Theater
      "movie",
      "movies",
      "cinema",
      "theater",
      "theatre",
      "film",
      "amc",
      "regal",
      "cinemark",
      "cineplex",
      "imax",
      "fandango",
      "moviepass",
      "movie ticket",
      "concert",
      "show",
      "performance",
      "broadway",
      "play",
      "musical",
      "opera",
      "ballet",

      // Streaming
      "netflix",
      "hulu",
      "disney+",
      "disney plus",
      "hbo",
      "hbo max",
      "amazon prime",
      "prime video",
      "apple tv",
      "paramount+",
      "peacock",
      "discovery+",
      "espn+",
      "youtube premium",
      "youtube tv",
      "spotify",
      "apple music",
      "pandora",
      "tidal",
      "deezer",
      "soundcloud",
      "audible",
      "kindle unlimited",
      "scribd",

      // Gaming
      "playstation",
      "xbox",
      "nintendo",
      "steam",
      "epic games",
      "game",
      "gaming",
      "video game",
      "ps5",
      "ps4",
      "switch",
      "twitch",
      "game pass",
      "ea play",
      "ubisoft",

      // Events & Activities
      "ticket",
      "tickets",
      "event",
      "festival",
      "fair",
      "carnival",
      "museum",
      "zoo",
      "aquarium",
      "theme park",
      "amusement park",
      "disneyland",
      "disney world",
      "universal studios",
      "six flags",
      "seaworld",
      "legoland",
      "escape room",
      "bowling",
      "arcade",
      "mini golf",
      "golf",
      "laser tag",
      "trampoline park",

      // Sports
      "sports",
      "game ticket",
      "nba",
      "nfl",
      "mlb",
      "nhl",
      "mls",
      "stadium",
      "arena",
      "ballpark",
    ],
  },

  // Health & Fitness
  {
    id: "health_fitness",
    name: "Health & Fitness",
    type: "expense",
    icon: "fitness",
    color: "#EF4444",
    emoji: "💪",
    description: "Gym, medical, pharmacy, wellness",
    keywords: [
      // Gym & Fitness
      "gym",
      "fitness",
      "workout",
      "exercise",
      "yoga",
      "pilates",
      "planet fitness",
      "la fitness",
      "24 hour fitness",
      "equinox",
      "orangetheory",
      "orange theory",
      "crossfit",
      "soulcycle",
      "peloton",
      "classpass",
      "ymca",
      "gold's gym",
      "golds gym",
      "anytime fitness",
      "lifetime fitness",
      "crunch fitness",

      // Medical
      "doctor",
      "hospital",
      "clinic",
      "medical",
      "healthcare",
      "dentist",
      "dental",
      "optometrist",
      "eye doctor",
      "optician",
      "dermatologist",
      "specialist",
      "urgent care",
      "emergency room",
      "copay",
      "co-pay",
      "deductible",
      "health insurance",

      // Pharmacy
      "pharmacy",
      "cvs",
      "walgreens",
      "rite aid",
      "medicine",
      "prescription",
      "rx",
      "medication",
      "drug store",
      "drugstore",

      // Wellness
      "spa",
      "massage",
      "chiropractor",
      "physical therapy",
      "pt",
      "acupuncture",
      "therapy",
      "therapist",
      "counseling",
      "mental health",
      "vitamins",
      "supplements",
      "protein",
      "health food",
    ],
  },

  // Bills & Utilities
  {
    id: "bills_utilities",
    name: "Bills & Utilities",
    type: "expense",
    icon: "flash",
    color: "#EAB308",
    emoji: "💡",
    description: "Electric, water, internet, phone bills",
    keywords: [
      // Utilities
      "electric",
      "electricity",
      "power",
      "utility",
      "utilities",
      "water",
      "gas bill",
      "natural gas",
      "sewage",
      "trash",
      "garbage",
      "pge",
      "pg&e",
      "con edison",
      "coned",
      "duke energy",
      "xcel",
      "southern company",
      "dominion",
      "entergy",
      "dte",
      "peco",

      // Internet & Phone
      "internet",
      "wifi",
      "wi-fi",
      "broadband",
      "cable",
      "comcast",
      "xfinity",
      "spectrum",
      "at&t",
      "att",
      "verizon",
      "t-mobile",
      "tmobile",
      "sprint",
      "mint mobile",
      "google fi",
      "cox",
      "centurylink",
      "frontier",
      "optimum",
      "rcn",
      "phone bill",
      "cell phone",
      "mobile",
      "wireless",

      // Streaming & Subscriptions
      "subscription",
      "monthly fee",
      "annual fee",
      "membership",

      // Other Bills
      "bill",
      "payment",
      "autopay",
      "auto pay",
      "recurring",
    ],
  },

  // Housing & Rent
  {
    id: "housing",
    name: "Housing",
    type: "expense",
    icon: "home",
    color: "#6366F1",
    emoji: "🏠",
    description: "Rent, mortgage, home maintenance",
    keywords: [
      // Rent & Mortgage
      "rent",
      "mortgage",
      "lease",
      "landlord",
      "property",
      "apartment",
      "condo",
      "house payment",
      "home loan",
      "hoa",
      "homeowner",
      "property tax",
      "real estate",

      // Home Maintenance
      "plumber",
      "plumbing",
      "electrician",
      "hvac",
      "ac repair",
      "handyman",
      "contractor",
      "repair",
      "maintenance",
      "fix",
      "home depot",
      "lowes",
      "lowe's",
      "menards",
      "ace hardware",
      "home improvement",
      "renovation",
      "remodel",

      // Home Services
      "cleaning",
      "housekeeping",
      "maid",
      "lawn care",
      "landscaping",
      "pest control",
      "security system",
      "adt",
      "ring",
      "nest",

      // Furniture
      "furniture",
      "ikea",
      "wayfair",
      "pottery barn",
      "crate and barrel",
      "west elm",
      "restoration hardware",
      "rooms to go",
      "ashley furniture",
      "mattress",
      "couch",
      "sofa",
      "bed",
      "table",
      "chair",
    ],
  },

  // Travel
  {
    id: "travel",
    name: "Travel",
    type: "expense",
    icon: "airplane",
    color: "#0EA5E9",
    emoji: "✈️",
    description: "Flights, hotels, vacation expenses",
    keywords: [
      // Airlines
      "airline",
      "flight",
      "airfare",
      "plane ticket",
      "airplane",
      "american airlines",
      "delta",
      "united",
      "southwest",
      "jetblue",
      "spirit",
      "frontier",
      "alaska airlines",
      "hawaiian airlines",
      "british airways",
      "lufthansa",
      "air france",
      "emirates",

      // Booking
      "expedia",
      "booking.com",
      "kayak",
      "priceline",
      "hopper",
      "skyscanner",
      "google flights",
      "orbitz",
      "travelocity",

      // Hotels & Lodging
      "hotel",
      "motel",
      "inn",
      "resort",
      "lodge",
      "hostel",
      "marriott",
      "hilton",
      "hyatt",
      "ihg",
      "wyndham",
      "best western",
      "holiday inn",
      "hampton inn",
      "courtyard",
      "sheraton",
      "westin",
      "airbnb",
      "vrbo",
      "booking",
      "hotels.com",

      // Travel Expenses
      "vacation",
      "trip",
      "travel",
      "holiday",
      "getaway",
      "tourism",
      "luggage",
      "baggage fee",
      "travel insurance",
      "passport",
      "visa",
      "rental car",
      "car rental",
      "hertz",
      "enterprise",
      "avis",
      "budget",
      "national",
      "alamo",
      "turo",
    ],
  },

  // Education
  {
    id: "education",
    name: "Education",
    type: "expense",
    icon: "school",
    color: "#14B8A6",
    emoji: "📚",
    description: "Tuition, courses, books, learning",
    keywords: [
      // Schools
      "tuition",
      "school",
      "university",
      "college",
      "education",
      "course",
      "class",
      "semester",
      "textbook",
      "book",

      // Online Learning
      "udemy",
      "coursera",
      "skillshare",
      "masterclass",
      "linkedin learning",
      "pluralsight",
      "codecademy",
      "udacity",
      "edx",
      "khan academy",
      "duolingo",
      "babbel",
      "rosetta stone",

      // Supplies
      "school supplies",
      "backpack",
      "notebook",
      "stationery",
      "office supplies",
      "staples",
      "office depot",
      "officemax",

      // Student
      "student loan",
      "financial aid",
      "scholarship",
      "student fee",
      "lab fee",
      "registration",
      "graduation",
    ],
  },

  // Personal Care
  {
    id: "personal_care",
    name: "Personal Care",
    type: "expense",
    icon: "happy",
    color: "#F472B6",
    emoji: "💅",
    description: "Haircuts, beauty, personal grooming",
    keywords: [
      // Hair & Beauty
      "haircut",
      "hair salon",
      "salon",
      "barber",
      "barbershop",
      "spa",
      "manicure",
      "pedicure",
      "nails",
      "nail salon",
      "wax",
      "waxing",
      "facial",
      "skincare",
      "beauty",
      "sephora",
      "ulta",
      "mac",
      "cosmetics",
      "makeup",

      // Personal Items
      "toiletries",
      "shampoo",
      "soap",
      "deodorant",
      "razor",
      "toothpaste",
      "toothbrush",
      "personal care",
      "hygiene",
      "bath and body works",
      "lush",
      "the body shop",
    ],
  },

  // Pets
  {
    id: "pets",
    name: "Pets",
    type: "expense",
    icon: "paw",
    color: "#FB923C",
    emoji: "🐾",
    description: "Pet food, vet, supplies",
    keywords: [
      // Pet Stores
      "pet",
      "pets",
      "petco",
      "petsmart",
      "pet supplies plus",
      "chewy",
      "pet food",
      "dog food",
      "cat food",

      // Vet
      "vet",
      "veterinary",
      "veterinarian",
      "animal hospital",
      "pet insurance",
      "pet medication",
      "flea",
      "tick",

      // Pet Care
      "grooming",
      "pet grooming",
      "dog walker",
      "pet sitter",
      "boarding",
      "kennel",
      "doggy daycare",
      "dog park",
      "collar",
      "leash",
      "pet toy",
      "litter",
      "cat litter",
    ],
  },

  // Kids & Family
  {
    id: "kids_family",
    name: "Kids & Family",
    type: "expense",
    icon: "people",
    color: "#FB7185",
    emoji: "👨‍👩‍👧‍👦",
    description: "Childcare, kids activities, family expenses",
    keywords: [
      // Childcare
      "childcare",
      "daycare",
      "babysitter",
      "babysitting",
      "nanny",
      "preschool",
      "kindergarten",
      "after school",
      "camp",
      "summer camp",

      // Kids Stores
      "baby",
      "kids",
      "children",
      "toys r us",
      "build a bear",
      "carter's",
      "carters",
      "oshkosh",
      "gap kids",
      "children's place",
      "disney store",
      "lego store",
      "toy",
      "toys",

      // Kids Activities
      "dance class",
      "swim lesson",
      "soccer",
      "little league",
      "birthday party",
      "kid's party",
      "kids party",

      // Baby
      "diapers",
      "formula",
      "baby food",
      "stroller",
      "car seat",
      "buy buy baby",
      "baby supplies",
    ],
  },

  // Insurance
  {
    id: "insurance",
    name: "Insurance",
    type: "expense",
    icon: "shield-checkmark",
    color: "#4B5563",
    emoji: "🛡️",
    description: "Car, health, home, life insurance",
    keywords: [
      // Insurance Types
      "insurance",
      "premium",
      "policy",
      "coverage",
      "claim",
      "car insurance",
      "auto insurance",
      "health insurance",
      "home insurance",
      "homeowner's insurance",
      "renter's insurance",
      "life insurance",
      "dental insurance",
      "vision insurance",

      // Insurance Companies
      "geico",
      "progressive",
      "state farm",
      "allstate",
      "farmers",
      "liberty mutual",
      "usaa",
      "nationwide",
      "traveler's",
      "aetna",
      "cigna",
      "blue cross",
      "united healthcare",
      "kaiser",
      "metlife",
      "prudential",
      "aflac",
    ],
  },

  // Gifts & Donations
  {
    id: "gifts_donations",
    name: "Gifts & Donations",
    type: "expense",
    icon: "gift",
    color: "#F43F5E",
    emoji: "🎁",
    description: "Presents, charity, donations",
    keywords: [
      // Gifts
      "gift",
      "present",
      "birthday gift",
      "christmas gift",
      "holiday gift",
      "wedding gift",
      "baby shower",
      "anniversary",
      "gift card",

      // Donations
      "donation",
      "charity",
      "donate",
      "nonprofit",
      "non-profit",
      "gofundme",
      "kickstarter",
      "patreon",
      "tip",
      "tipping",
      "church",
      "tithe",
      "offering",
      "religious",
    ],
  },

  // Alcohol & Bars
  {
    id: "alcohol_bars",
    name: "Alcohol & Bars",
    type: "expense",
    icon: "beer",
    color: "#B45309",
    emoji: "🍺",
    description: "Bars, liquor stores, alcohol",
    keywords: [
      // Bars & Nightlife
      "bar",
      "pub",
      "club",
      "nightclub",
      "lounge",
      "tavern",
      "brewery",
      "winery",
      "distillery",
      "happy hour",

      // Alcohol
      "beer",
      "wine",
      "liquor",
      "alcohol",
      "spirits",
      "cocktail",
      "whiskey",
      "vodka",
      "gin",
      "rum",
      "tequila",

      // Stores
      "liquor store",
      "total wine",
      "bevmo",
      "abc store",
      "wine shop",
      "package store",
    ],
  },

  // Subscriptions
  {
    id: "subscriptions",
    name: "Subscriptions",
    type: "expense",
    icon: "repeat",
    color: "#7C3AED",
    emoji: "📱",
    description: "Monthly and annual subscriptions",
    keywords: [
      // Software
      "subscription",
      "monthly",
      "annual",
      "yearly",
      "renewal",
      "adobe",
      "microsoft 365",
      "office 365",
      "dropbox",
      "google one",
      "icloud",
      "evernote",
      "notion",
      "slack",
      "zoom",

      // News & Media
      "new york times",
      "washington post",
      "wall street journal",
      "medium",
      "substack",
      "patreon",
      "onlyfans",

      // Other
      "membership",
      "premium",
      "pro plan",
      "plus plan",
    ],
  },

  // ATM & Cash
  {
    id: "atm_cash",
    name: "ATM & Cash",
    type: "expense",
    icon: "cash",
    color: "#059669",
    emoji: "💵",
    description: "ATM withdrawals, cash transactions",
    keywords: [
      "atm",
      "cash",
      "withdrawal",
      "withdraw",
      "cash back",
      "cashback",
      "cash out",
      "money order",
      "wire transfer",
    ],
  },

  // Fees & Charges
  {
    id: "fees_charges",
    name: "Fees & Charges",
    type: "expense",
    icon: "alert-circle",
    color: "#DC2626",
    emoji: "⚠️",
    description: "Bank fees, late fees, service charges",
    keywords: [
      "fee",
      "charge",
      "late fee",
      "overdraft",
      "nsf",
      "service charge",
      "monthly fee",
      "annual fee",
      "interest",
      "finance charge",
      "penalty",
      "fine",
      "ticket",
      "parking ticket",
      "speeding ticket",
      "violation",
    ],
  },

  // Taxes
  {
    id: "taxes",
    name: "Taxes",
    type: "expense",
    icon: "document-text",
    color: "#1F2937",
    emoji: "📋",
    description: "Income tax, property tax, tax services",
    keywords: [
      "tax",
      "taxes",
      "irs",
      "income tax",
      "property tax",
      "sales tax",
      "tax payment",
      "estimated tax",
      "quarterly tax",
      "turbotax",
      "h&r block",
      "hr block",
      "jackson hewitt",
      "tax prep",
      "tax return",
      "tax refund",
      "cpa",
      "accountant",
    ],
  },

  // Other Expense
  {
    id: "other_expense",
    name: "Other Expense",
    type: "expense",
    icon: "ellipsis-horizontal",
    color: "#64748B",
    emoji: "📦",
    description: "Miscellaneous expenses",
    keywords: ["other", "misc", "miscellaneous", "general", "various"],
  },

  // ========== INCOME CATEGORIES ==========

  // Salary
  {
    id: "salary",
    name: "Salary",
    type: "income",
    icon: "briefcase",
    color: "#22C55E",
    emoji: "💼",
    description: "Regular paycheck, wages",
    keywords: [
      "salary",
      "paycheck",
      "wages",
      "pay",
      "payday",
      "payroll",
      "direct deposit",
      "income",
      "earnings",
      "compensation",
      "hourly",
      "overtime",
      "bonus",
      "raise",
    ],
  },

  // Freelance
  {
    id: "freelance",
    name: "Freelance",
    type: "income",
    icon: "laptop",
    color: "#10B981",
    emoji: "💻",
    description: "Contract work, side gigs",
    keywords: [
      "freelance",
      "freelancer",
      "contract",
      "contractor",
      "1099",
      "gig",
      "side hustle",
      "consulting",
      "client",
      "project",
      "upwork",
      "fiverr",
      "toptal",
      "freelancer.com",
    ],
  },

  // Business
  {
    id: "business_income",
    name: "Business Income",
    type: "income",
    icon: "storefront",
    color: "#0D9488",
    emoji: "🏪",
    description: "Business revenue, sales",
    keywords: [
      "business",
      "revenue",
      "sales",
      "profit",
      "income",
      "customer",
      "client payment",
      "invoice",
      "payment received",
      "shopify",
      "stripe",
      "square",
      "paypal business",
    ],
  },

  // Investment
  {
    id: "investment_income",
    name: "Investment",
    type: "income",
    icon: "trending-up",
    color: "#059669",
    emoji: "📈",
    description: "Dividends, capital gains, interest",
    keywords: [
      "investment",
      "dividend",
      "capital gain",
      "interest",
      "stock",
      "bond",
      "mutual fund",
      "etf",
      "roth",
      "401k",
      "ira",
      "brokerage",
      "fidelity",
      "vanguard",
      "schwab",
      "robinhood",
      "e-trade",
      "etrade",
      "td ameritrade",
      "webull",
      "acorns",
      "return",
      "yield",
      "profit",
      "gain",
    ],
  },

  // Rental Income
  {
    id: "rental_income",
    name: "Rental Income",
    type: "income",
    icon: "key",
    color: "#0891B2",
    emoji: "🔑",
    description: "Property rental income",
    keywords: [
      "rent",
      "rental",
      "tenant",
      "landlord",
      "property income",
      "airbnb host",
      "vrbo host",
      "rental property",
      "lease income",
    ],
  },

  // Refund
  {
    id: "refund",
    name: "Refund",
    type: "income",
    icon: "arrow-undo",
    color: "#6366F1",
    emoji: "↩️",
    description: "Returns, refunds, reimbursements",
    keywords: [
      "refund",
      "return",
      "reimbursement",
      "rebate",
      "cashback",
      "cash back",
      "credit",
      "reversal",
      "chargeback",
    ],
  },

  // Gift Received
  {
    id: "gift_income",
    name: "Gift Received",
    type: "income",
    icon: "gift",
    color: "#F43F5E",
    emoji: "🎀",
    description: "Money received as gift",
    keywords: [
      "gift",
      "present",
      "birthday money",
      "christmas money",
      "wedding gift",
      "inheritance",
      "received",
      "from family",
    ],
  },

  // Government
  {
    id: "government",
    name: "Government",
    type: "income",
    icon: "business",
    color: "#1D4ED8",
    emoji: "🏛️",
    description: "Tax refund, benefits, stimulus",
    keywords: [
      "tax refund",
      "stimulus",
      "government",
      "benefits",
      "social security",
      "unemployment",
      "disability",
      "welfare",
      "food stamps",
      "snap",
      "child tax credit",
      "eitc",
      "eic",
    ],
  },

  // Other Income
  {
    id: "other_income",
    name: "Other Income",
    type: "income",
    icon: "ellipsis-horizontal",
    color: "#64748B",
    emoji: "💰",
    description: "Miscellaneous income",
    keywords: [
      "other",
      "misc",
      "miscellaneous",
      "income",
      "money",
      "found",
      "won",
      "lottery",
      "prize",
      "award",
    ],
  },
];

// ============================================
// SMART MATCHING FUNCTIONS
// ============================================

/**
 * Find the best matching category for a given description
 */
export function matchCategoryByDescription(
  description: string,
  type: "expense" | "income" = "expense",
): CategoryDefinition | null {
  if (!description || description.trim().length === 0) {
    return null;
  }

  const normalizedDesc = description.toLowerCase().trim();
  const words = normalizedDesc.split(/\s+/);

  let bestMatch: CategoryDefinition | null = null;
  let bestScore = 0;

  const categoriesOfType = SMART_CATEGORIES.filter((c) => c.type === type);

  for (const category of categoriesOfType) {
    let score = 0;

    // Check each keyword
    for (const keyword of category.keywords) {
      const normalizedKeyword = keyword.toLowerCase();

      // Exact match in description
      if (normalizedDesc.includes(normalizedKeyword)) {
        // Longer keyword matches are more valuable
        score += normalizedKeyword.length * 2;

        // Bonus for exact word match
        if (words.includes(normalizedKeyword)) {
          score += 10;
        }
      }

      // Partial word match
      for (const word of words) {
        if (word.length >= 3 && normalizedKeyword.includes(word)) {
          score += word.length;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  // Only return match if score is significant
  return bestScore >= 3 ? bestMatch : null;
}

/**
 * Get category suggestions ranked by relevance
 */
export function getCategorySuggestions(
  description: string,
  type: "expense" | "income" = "expense",
  limit: number = 3,
): CategoryDefinition[] {
  if (!description || description.trim().length === 0) {
    return [];
  }

  const normalizedDesc = description.toLowerCase().trim();
  const words = normalizedDesc.split(/\s+/);

  const categoriesOfType = SMART_CATEGORIES.filter((c) => c.type === type);
  const scored: { category: CategoryDefinition; score: number }[] = [];

  for (const category of categoriesOfType) {
    let score = 0;

    for (const keyword of category.keywords) {
      const normalizedKeyword = keyword.toLowerCase();

      if (normalizedDesc.includes(normalizedKeyword)) {
        score += normalizedKeyword.length * 2;
        if (words.includes(normalizedKeyword)) {
          score += 10;
        }
      }

      for (const word of words) {
        if (word.length >= 3 && normalizedKeyword.includes(word)) {
          score += word.length;
        }
      }
    }

    if (score > 0) {
      scored.push({ category, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.category);
}

/**
 * Get icon for a category name
 */
export function getCategoryIcon(
  categoryName: string,
): keyof typeof Ionicons.glyphMap {
  const category = SMART_CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
  );
  return category?.icon || "ellipsis-horizontal";
}

/**
 * Legacy helper retained for compatibility during icon migration.
 */
export function getCategoryEmoji(categoryName: string): string {
  const category = SMART_CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
  );
  return category?.emoji || "📦";
}

/**
 * Get color for a category name
 */
export function getCategoryColor(categoryName: string): string {
  const category = SMART_CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
  );
  return category?.color || "#64748B";
}

/**
 * Get all categories of a type
 */
export function getCategoriesByType(
  type: "expense" | "income",
): CategoryDefinition[] {
  return SMART_CATEGORIES.filter((c) => c.type === type);
}

/**
 * Popular merchants dictionary for quick lookup
 */
export const POPULAR_MERCHANTS: Record<string, string> = {
  // Fast Food
  "mcdonald's": "Food & Dining",
  mcdonalds: "Food & Dining",
  "burger king": "Food & Dining",
  "wendy's": "Food & Dining",
  "taco bell": "Food & Dining",
  chipotle: "Food & Dining",
  subway: "Food & Dining",
  "chick-fil-a": "Food & Dining",
  kfc: "Food & Dining",
  "pizza hut": "Food & Dining",
  "domino's": "Food & Dining",

  // Coffee
  starbucks: "Coffee & Cafe",
  dunkin: "Coffee & Cafe",
  "peet's": "Coffee & Cafe",
  "dutch bros": "Coffee & Cafe",

  // Grocery
  walmart: "Groceries",
  target: "Groceries",
  costco: "Groceries",
  "whole foods": "Groceries",
  "trader joe's": "Groceries",
  kroger: "Groceries",
  safeway: "Groceries",
  publix: "Groceries",
  aldi: "Groceries",

  // Gas
  shell: "Transportation",
  chevron: "Transportation",
  exxon: "Transportation",
  bp: "Transportation",
  "76": "Transportation",

  // Rideshare
  uber: "Transportation",
  lyft: "Transportation",

  // Shopping
  amazon: "Shopping",
  "best buy": "Shopping",
  nike: "Shopping",
  apple: "Shopping",

  // Streaming
  netflix: "Entertainment",
  spotify: "Entertainment",
  hulu: "Entertainment",
  "disney+": "Entertainment",

  // Utilities
  comcast: "Bills & Utilities",
  verizon: "Bills & Utilities",
  "at&t": "Bills & Utilities",
  "t-mobile": "Bills & Utilities",
};

/**
 * Quick merchant lookup
 */
export function matchMerchant(merchantName: string): string | null {
  const normalized = merchantName.toLowerCase().trim();

  // Direct lookup
  if (POPULAR_MERCHANTS[normalized]) {
    return POPULAR_MERCHANTS[normalized];
  }

  // Partial match
  for (const [merchant, category] of Object.entries(POPULAR_MERCHANTS)) {
    if (normalized.includes(merchant) || merchant.includes(normalized)) {
      return category;
    }
  }

  return null;
}

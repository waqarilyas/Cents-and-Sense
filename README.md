# Cents and Sense 💰

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Expo](https://img.shields.io/badge/Expo-~52.0.0-000020.svg?logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-0.76.9-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.1.6-3178C6.svg?logo=typescript)
![Tests](https://img.shields.io/badge/tests-397%20passed-success.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-contributor%20covenant-purple.svg)](CODE_OF_CONDUCT.md)

**A comprehensive budget tracking mobile app with multi-currency support, goals, subscriptions, and advanced analytics.**

[Features](#-features) • [Demo](#-demo) • [Screenshots](#-screenshots) • [Getting Started](#-getting-started) • [Contributing](#-contributing) • [License](#-license)

</div>

---

## 📱 About

Cents and Sense is a feature-rich, open-source budget tracking application built with React Native and Expo. It helps users manage their finances with support for multiple accounts, categories, budgets, goals, and subscriptions across different currencies.

### ✨ Features

- 💳 **Multi-Account Management** - Track checking, savings, credit cards, and investment accounts
- 📊 **Budget Tracking** - Set monthly/yearly budgets per category with carryover support
- 🎯 **Financial Goals** - Create and track savings goals with progress monitoring
- 🔄 **Subscription Management** - Automatic recurring payment tracking
- 🌍 **Multi-Currency Support** - 150+ currencies with real-time conversion
- 📈 **Advanced Analytics** - Visual charts, spending trends, and category breakdowns
- 🌙 **Dark Mode** - System, light, or dark theme options
- 📱 **Home Screen Widgets** - Quick access to budgets, goals, and accounts (Android)
- 🔒 **Local Data Storage** - SQLite database for fast, offline-first operation
- 🎨 **Modern UI/UX** - Clean, intuitive design with smooth animations
- 🧪 **Comprehensive Testing** - 397 tests covering all functionality

---

## 🎥 Demo

<div align="center">

[![Watch Demo on YouTube](https://img.shields.io/badge/▶️_Watch_Demo-YouTube-red?style=for-the-badge&logo=youtube)](https://youtube.com/shorts/aZcII_opEXQ?feature=share)

**See Cents and Sense in action!** Watch a quick demo showcasing the key features.

</div>

---

## 📸 Screenshots

> Add screenshots of your app here to showcase the UI

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn**
- **Expo CLI** (installed globally): `npm install -g expo-cli`
- **Android Studio** (for Android development) or **Xcode** (for iOS development)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/waqarilyas/budget-tracker-app-development.git
cd budget-tracker-app-development
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the development server**

```bash
npm start
```

4. **Run on your platform**

```bash
# iOS (macOS only)
npm run ios

# Android
npm run android

# Web
npm run web
```

### Environment Setup

For Android development:

- Install Android Studio
- Set up an Android emulator or connect a physical device
- Enable USB debugging on your device

For iOS development (macOS only):

- Install Xcode from the App Store
- Install Xcode Command Line Tools
- Set up an iOS simulator or connect a physical device

---

## 🧪 Testing

The project has a comprehensive test suite with **397 tests across 22 suites**, covering unit tests, context tests, and end-to-end integration flows.

### Prerequisites

Make sure dependencies are installed:

```bash
npm install
```

### Running Tests

| Command                  | Description                             |
| ------------------------ | --------------------------------------- |
| `npm test`               | Run all tests                           |
| `npm run test:coverage`  | Run all tests with coverage report      |
| `npx jest --no-coverage` | Run all tests without coverage (faster) |

### Running Specific Tests

```bash
# Run a single test file
npx jest __tests__/e2e/transactions.test.tsx

# Run all E2E tests
npx jest __tests__/e2e/

# Run all unit tests for contexts
npx jest __tests__/contexts/

# Run all utility tests
npx jest __tests__/utils/

# Run tests matching a pattern
npx jest --testPathPattern="budget"
```

### Test Structure

```
__tests__/
├── setup.ts                  # Global test setup & mocks
├── __mocks__/
│   └── react-native.ts       # React Native module mock
├── utils/                    # Unit tests for utility functions
│   ├── currencies.test.ts
│   ├── currencyHelpers.test.ts
│   ├── periodCalculations.test.ts
│   ├── smartCategories.test.ts
│   └── validation.test.ts
├── contexts/                 # Context provider unit tests
│   ├── AccountContext.test.tsx
│   ├── BudgetContext.test.tsx
│   ├── CategoryContext.test.tsx
│   ├── CurrencyContext.test.tsx
│   ├── GoalContext.test.tsx
│   ├── SettingsContext.test.tsx
│   ├── SubscriptionContext.test.tsx
│   ├── TransactionContext.test.tsx
│   └── UserContext.test.tsx
└── e2e/                      # End-to-end integration tests
    ├── helpers.tsx            # InMemoryDB, provider wrapper, test utilities
    ├── onboarding.test.tsx
    ├── transactions.test.tsx
    ├── budgets.test.tsx
    ├── goals.test.tsx
    ├── subscriptions.test.tsx
    ├── multi-currency.test.tsx
    ├── categories-settings.test.tsx
    └── cross-context.test.tsx
```

### Test Categories

#### Unit Tests (`__tests__/utils/`)

Test pure utility functions in isolation — currency formatting, validation rules, budget period calculations, and smart category matching.

#### Context Tests (`__tests__/contexts/`)

Test each React Context provider individually with a mocked SQLite database. Covers CRUD operations, validation, error handling, and state management for all 9 contexts (User, Account, Category, Transaction, Budget, Goal, Subscription, Currency, Settings).

#### E2E Integration Tests (`__tests__/e2e/`)

Simulate real user flows across the full provider stack using an in-memory database. All 9 context providers are nested in the same order as the real app, so cross-context interactions (e.g. adding a transaction updates the account balance) are tested end-to-end.

| Suite                                | What it covers                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| **Onboarding**                       | Profile setup, account auto-creation, data persistence across restarts                 |
| **Transactions**                     | Income/expense with balance updates, delete reverting balance, validation              |
| **Budgets**                          | Per-category budgets, monthly overall budget, carryover toggle                         |
| **Goals**                            | Savings goals, progress tracking, detail updates                                       |
| **Subscriptions**                    | Auto-processing (creates transaction + updates balance), skip pending, toggle active   |
| **Multi-Currency**                   | Accounts/goals/budgets in different currencies, default currency switching             |
| **Categories & Settings & Accounts** | Category CRUD with deletion protection, settings persistence/reset, account management |
| **Cross-Context**                    | Full user journey (onboard → transact → budget → goal), data integrity across contexts |

### Test Configuration

- **Runner:** Jest with ts-jest
- **Environment:** jsdom
- **Config file:** `jest.config.js`
- **Setup file:** `__tests__/setup.ts` (mocks for expo-sqlite, expo-haptics, expo-router, AsyncStorage, and more)
- **Coverage source:** `lib/**/*.{ts,tsx}`

---

## 🏗️ Tech Stack

### Frontend

- **React Native** 0.76.9 - Cross-platform mobile framework
- **Expo** ~52.0.0 - Development platform and tools
- **TypeScript** 5.1.6 - Type safety
- **Expo Router** ~4.0.22 - File-based navigation

### UI/UX

- **React Native Paper** - Material Design components
- **Lucide React Native** - Icon library
- **React Native SVG** - SVG support
- **Victory Native** - Data visualization charts
- **React Native Chart Kit** - Additional chart components

### State Management & Data

- **React Context API** - Global state management
- **Expo SQLite** ~15.1.4 - Local database
- **AsyncStorage** - Persistent key-value storage

### Testing

- **Jest** 30.2.0 - Testing framework
- **React Testing Library** - Component testing
- **ts-jest** - TypeScript support for Jest

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## 📁 Project Structure

```
cents-and-sense/
├── app/                      # Expo Router screens
│   ├── (tabs)/              # Bottom tab navigation
│   │   ├── index.tsx        # Home screen
│   │   └── history.tsx      # Transaction history
│   ├── (stack)/             # Stack navigation
│   │   ├── accounts.tsx     # Account management
│   │   ├── budgets.tsx      # Budget management
│   │   ├── goals.tsx        # Goals tracking
│   │   ├── subscriptions.tsx # Subscription tracking
│   │   ├── transactions.tsx # Transaction list
│   │   ├── categories.tsx   # Category settings
│   │   ├── analysis.tsx     # Analytics & charts
│   │   ├── settings.tsx     # App settings
│   │   └── profile.tsx      # User profile
│   ├── _layout.tsx          # Root layout with providers
│   └── onboarding.tsx       # Initial setup screen
├── lib/                     # Core application logic
│   ├── contexts/            # React Context providers
│   │   ├── UserContext.tsx
│   │   ├── AccountContext.tsx
│   │   ├── CategoryContext.tsx
│   │   ├── TransactionContext.tsx
│   │   ├── BudgetContext.tsx
│   │   ├── GoalContext.tsx
│   │   ├── SubscriptionContext.tsx
│   │   ├── CurrencyContext.tsx
│   │   └── SettingsContext.tsx
│   ├── components/          # Reusable UI components
│   ├── services/            # Business logic services
│   ├── utils/               # Utility functions
│   ├── database.ts          # SQLite database setup
│   ├── theme.ts             # Theme configuration
│   └── currencies.ts        # Currency data
├── components/              # Shared components
├── __tests__/               # Test files
├── android/                 # Android native code
├── ios/                     # iOS native code
└── assets/                  # Images, fonts, icons
```

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's bug fixes, new features, documentation improvements, or translations, your help is appreciated.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Run tests** (`npm test`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style and conventions
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Keep PRs focused on a single feature or fix

For more details, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## � Security

If you discover a security vulnerability, please review our [Security Policy](SECURITY.md) for reporting guidelines.

---

## 📜 Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## �🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- UI components from [React Native Paper](https://callstack.github.io/react-native-paper/)
- Icons by [Lucide](https://lucide.dev/)
- Charts powered by [Victory](https://formidable.com/open-source/victory/)

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/waqarilyas/budget-tracker-app-development/issues)
- **Discussions**: [GitHub Discussions](https://github.com/waqarilyas/budget-tracker-app-development/discussions)
- **Feature Requests**: Use the [feature request template](https://github.com/waqarilyas/budget-tracker-app-development/issues/new?template=feature_request.md)
- **Bug Reports**: Use the [bug report template](https://github.com/waqarilyas/budget-tracker-app-development/issues/new?template=bug_report.md)

---

<div align="center">

**Made with ❤️ by the open-source community**

⭐ Star this repo if you find it helpful!

</div>

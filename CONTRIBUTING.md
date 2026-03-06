# Contributing to Cents and Sense

First off, thank you for considering contributing to Cents and Sense! 🎉

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/budget-tracker-app-development.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes: `npm test`
6. Commit your changes: `git commit -m 'Add some feature'`
7. Push to the branch: `git push origin feature/your-feature-name`
8. Open a Pull Request

## 🐛 Reporting Bugs

We use GitHub issues to track bugs. Report a bug by [opening a new issue](https://github.com/waqarilyas/budget-tracker-app-development/issues/new?template=bug_report.md).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## 💡 Suggesting Features

We love feature suggestions! Please open an issue with:

- Clear and descriptive title
- Detailed description of the proposed feature
- Why this feature would be useful
- Any examples or mockups (if applicable)

## 📝 Development Process

We use GitHub Flow, so all code changes happen through Pull Requests:

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing style
6. Issue that pull request!

## ✅ Pull Request Guidelines

### Before Submitting

- [ ] Run all tests: `npm test`
- [ ] Run linting: `npm run lint` (if configured)
- [ ] Update documentation if needed
- [ ] Add tests for new features
- [ ] Ensure all tests pass
- [ ] Update CHANGELOG if applicable

### PR Requirements

- **Clear title**: Describe what the PR does
- **Description**: Explain the changes and why they're needed
- **Link issues**: Reference related issues (e.g., "Fixes #123")
- **Screenshots**: Include screenshots for UI changes
- **Testing**: Describe how you tested the changes

### Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Comment complex logic
- Keep functions small and focused
- Follow existing code patterns in the project

### Commit Message Guidelines

We follow conventional commit messages for clarity and automated changelog generation:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semi colons, etc)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(transactions): add category filtering
fix(budget): correct carryover calculation
docs(readme): update installation instructions
test(goals): add progress calculation tests
```

## 🔄 Changelog

Significant changes should be noted. When making notable changes:

- Update or create a CHANGELOG.md entry if the change is user-facing
- Follow [Keep a Changelog](https://keepachangelog.com/) format
- Group changes by type (Added, Changed, Deprecated, Removed, Fixed, Security)

## 🧪 Testing

All new features and bug fixes should include tests:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx jest __tests__/path/to/test.tsx
```

### Test Types

- **Unit Tests**: Test individual functions/utilities
- **Context Tests**: Test React Context providers
- **E2E Tests**: Test complete user flows

## 📖 Documentation

- Update README.md for new features
- Add JSDoc comments for functions
- Update TypeScript interfaces/types
- Include inline comments for complex logic

## 🎨 UI/UX Guidelines

- Follow Material Design principles
- Maintain consistency with existing UI
- Support both light and dark themes
- Test on both iOS and Android
- Ensure responsive design
- Add accessibility features (screen readers, etc.)

## 🌐 Internationalization

While not currently implemented, keep i18n in mind:

- Avoid hardcoded strings
- Use translation keys for user-facing text
- Support RTL languages in future

## 🔧 Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on platforms
npm run ios       # iOS
npm run android   # Android
npm run web       # Web
```

## 📱 Platform-Specific Contributions

### Android

- Test on multiple Android versions
- Check different screen sizes
- Verify widgets work correctly

### iOS

- Test on different iOS versions
- Check iPad compatibility
- Test on different iPhone models

## 🔐 Security

If you discover a security vulnerability, please follow the guidelines in our [Security Policy](SECURITY.md). Do not open a public issue for security vulnerabilities.

## 📜 Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:

- README.md contributors section (planned)
- Release notes for significant contributions
- GitHub's contributor graph

## ❓ Questions?

Feel free to:

- Open a [Discussion](https://github.com/waqarilyas/budget-tracker-app-development/discussions)
- Comment on relevant issues
- Reach out to maintainers

## 🎯 Good First Issues

Look for issues labeled `good first issue` - these are great for newcomers!

## 📋 Areas to Contribute

- **Features**: New functionality
- **Bug Fixes**: Fix reported issues
- **Documentation**: Improve docs
- **Testing**: Add more test coverage
- **Performance**: Optimize code
- **Accessibility**: Improve a11y
- **Translations**: Add language support (future)
- **Design**: UI/UX improvements

---

Thank you for contributing to Cents and Sense! 🎉

Your contributions make this project better for everyone. 💚

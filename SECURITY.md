# Security Policy

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Cents and Sense seriously. If you discover a security vulnerability, we appreciate your help in disclosing it to us responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to the Security tab of our repository
   - Click "Report a vulnerability"
   - Provide detailed information about the vulnerability

2. **Direct Contact**
   - Open a private discussion or contact maintainers directly through GitHub

### What to Include

Please include the following information in your report:

- **Type of issue** (e.g., SQL injection, data exposure, authentication bypass)
- **Full paths of source file(s)** related to the issue
- **Location of the affected code** (tag/branch/commit or direct URL)
- **Any special configuration** required to reproduce the issue
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the issue**, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days (depending on complexity)

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your report
2. **Assessment**: We will assess the vulnerability and its impact
3. **Updates**: We will keep you informed of our progress
4. **Resolution**: We will work on a fix and may ask for your help in testing
5. **Disclosure**: Once fixed, we will publicly acknowledge your contribution (unless you prefer to remain anonymous)

## Security Best Practices for Users

### Data Protection

1. **Enable Device Security**
   - Use a strong device password, PIN, or biometric authentication
   - Enable full-device encryption (usually enabled by default on modern devices)

2. **Regular Backups**
   - Export your data regularly using the backup feature in Settings
   - Store backups securely

3. **App Updates**
   - Keep the app updated to receive the latest security patches
   - Enable automatic updates if available

### Device Security

1. **Physical Security**
   - Don't leave your device unattended
   - Use Find My Device features

2. **Network Security**
   - Be cautious when using public Wi-Fi networks
   - The app works fully offline; sensitive operations don't require network access

3. **App Permissions**
   - Review app permissions periodically
   - Cents and Sense only requests necessary permissions

## Security Architecture

### Data Storage

- **Local Only**: All data is stored locally on your device using SQLite
- **No Cloud Sync**: We don't send data to any external servers
- **No Analytics**: We don't track user behavior or collect usage data
- **Encryption**: Data is protected by device-level encryption

### Data Access

- **No Third-Party Access**: Your financial data is not shared with any third parties
- **No Remote Access**: There is no way for us or anyone else to access your data remotely
- **User Control**: You can export or delete all your data at any time

### Authentication

- **Device-Level**: The app relies on your device's security features
- **No Account Required**: No email, password, or account creation needed
- **Offline First**: Full functionality without internet connection

## Known Security Considerations

### By Design

1. **No Encryption at Rest Beyond Device Level**
   - The SQLite database is not separately encrypted beyond device encryption
   - This is intentional for performance and user experience
   - Device-level encryption provides adequate protection for most users

2. **Export Files Are Unencrypted**
   - Data exports are in plain JSON format
   - Users should store export files securely
   - Consider encrypting backup files if storing in cloud services

### Recommendations

1. **Sensitive Devices**
   - If your device is jailbroken/rooted, consider the security implications
   - Malicious apps on compromised devices might access local data

2. **Shared Devices**
   - Use separate user profiles if sharing a device
   - Log out of device or lock app when sharing

## Responsible Disclosure

We support responsible disclosure practices:

1. **Give us reasonable time** to fix the issue before public disclosure
2. **Avoid accessing or modifying other users' data** during testing
3. **Act in good faith** to avoid privacy violations and service disruption
4. **Don't exploit vulnerabilities** beyond what's necessary for demonstration

## Recognition

We appreciate security researchers who help keep Cents and Sense safe:

- Reported vulnerabilities will be acknowledged in release notes (unless anonymity is requested)
- Significant contributions may be recognized in the README
- We don't offer monetary rewards at this time (we're an open-source project)

## Contact

For security-related questions that don't involve reporting vulnerabilities:
- Open a discussion: https://github.com/waqarilyas/budget-tracker-app-development/discussions

---

Thank you for helping keep Cents and Sense and our users safe!

# Android Widget Implementation - Setup Guide

## Overview

This guide explains how to complete the Android widget implementation for the Budget Tracker app. The widget allows users to view their spending and add expenses directly from their home screen.

## Widget Features

- **Small Widget (2x2)**: Shows current monthly spending and quick add button
- **Medium Widget (4x2)**: Shows spending, top 3 categories, budget progress, and quick add
- **Large Widget (4x4)**: Full dashboard with recent transactions, category shortcuts, and quick add

## Files Created

### XML Layouts

- `android/app/src/main/res/layout/widget_small.xml` - Small widget layout
- `android/app/src/main/res/layout/widget_medium.xml` - Medium widget layout
- `android/app/src/main/res/layout/widget_large.xml` - Large widget layout
- `android/app/src/main/res/layout/activity_quick_add.xml` - Quick add activity layout

### Drawable Resources

- `android/app/src/main/res/drawable/widget_background_small.xml` - Small widget background
- `android/app/src/main/res/drawable/widget_background_medium.xml` - Medium widget background
- `android/app/src/main/res/drawable/widget_background_large.xml` - Large widget background
- `android/app/src/main/res/drawable/widget_button_gradient.xml` - Quick add button background
- `android/app/src/main/res/drawable/widget_category_button.xml` - Category button background
- `android/app/src/main/res/drawable/category_dot.xml` - Category indicator dot
- `android/app/src/main/res/drawable/input_background.xml` - Input field background
- `android/app/src/main/res/drawable/button_primary.xml` - Primary button background
- `android/app/src/main/res/drawable/button_secondary.xml` - Secondary button background

### Widget Configuration

- `android/app/src/main/res/xml/widget_info_small.xml` - Small widget metadata
- `android/app/src/main/res/xml/widget_info_medium.xml` - Medium widget metadata
- `android/app/src/main/res/xml/widget_info_large.xml` - Large widget metadata

### String Resources

- `android/app/src/main/res/values/strings.xml` - All widget text strings

### Kotlin/Java Code

- `android/app/src/main/java/com/budgetplanner/app/widgets/BudgetWidgetProvider.kt` - Main widget logic
- `android/app/src/main/java/com/budgetplanner/app/widgets/QuickAddActivity.kt` - Quick add expense activity
- `android/app/src/main/java/com/budgetplanner/app/BudgetWidgetModule.kt` - React Native bridge module
- `android/app/src/main/java/com/budgetplanner/app/BudgetWidgetPackage.kt` - Native module package

## Required Configuration Steps

### 1. Update AndroidManifest.xml

Since this is an Expo project, the AndroidManifest.xml is auto-generated. You have two options:

#### Option A: Use Expo Config Plugin (Recommended)

Create a config plugin to modify the manifest. This is the cleanest approach for Expo.

#### Option B: Use Bare Workflow

Run `npx expo prebuild` to generate the Android native files, then manually edit the AndroidManifest.xml.

The AndroidManifest.xml needs these additions:

```xml
<!-- Add inside <application> tag -->

<!-- Widget Provider Receivers -->
<receiver
    android:name="com.budgetplanner.app.widgets.BudgetWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
        <action android:name="com.budgetplanner.app.ACTION_UPDATE_WIDGETS" />
        <action android:name="com.budgetplanner.app.ACTION_QUICK_ADD" />
        <action android:name="com.budgetplanner.app.ACTION_CATEGORY_CLICK" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_info_small" />
</receiver>

<receiver
    android:name="com.budgetplanner.app.widgets.BudgetWidgetProvider"
    android:exported="true">
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_info_medium" />
</receiver>

<receiver
    android:name="com.budgetplanner.app.widgets.BudgetWidgetProvider"
    android:exported="true">
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_info_large" />
</receiver>

<!-- Quick Add Activity -->
<activity
    android:name="com.budgetplanner.app.widgets.QuickAddActivity"
    android:exported="true"
    android:theme="@android:style/Theme.Material.Light.Dialog"
    android:excludeFromRecents="true"
    android:taskAffinity="">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>
</activity>
```

### 2. Register Native Module

#### Option A: Modify MainApplication (for bare workflow)

Add the BudgetWidgetPackage to your MainApplication.java/kt:

```kotlin
import com.budgetplanner.app.BudgetWidgetPackage

// In getPackages():
packages.add(BudgetWidgetPackage())
```

#### Option B: Use Expo Modules (for managed workflow)

The native module is already set up as a standard React Native module and should work with Expo's autolinking.

### 3. Test the Widget

1. Build the app:

   ```bash
   npx expo run:android
   ```

2. Once installed, long-press on your Android home screen
3. Tap "Widgets"
4. Find "Budget Tracker" in the widget list
5. Drag a widget to your home screen
6. Test the quick add functionality

## Data Flow

1. **App → Widget**:
   - App saves data to `widget_data.json` using WidgetDataProvider
   - Calls `WidgetService.updateAllWidgets()` to trigger widget refresh
   - Native module sends broadcast to BudgetWidgetProvider
   - Widget reads `widget_data.json` and updates UI

2. **Widget → App**:
   - User taps "Quick Add" button
   - QuickAddActivity launches as dialog
   - User enters expense details
   - Activity creates deep link: `budgetplanner://quick-add?amount=X&category=Y`
   - Deep link opens app's quick-add screen
   - App saves transaction and updates widget data

## Troubleshooting

### Widget not appearing in widget list

- Check that widget receivers are registered in AndroidManifest.xml
- Verify widget_info XML files are in `res/xml/` directory
- Make sure app is installed (not just running in dev mode)

### Widget shows default data

- Ensure WidgetDataProvider is saving data to the correct file
- Check file permissions in AndroidManifest
- Verify `widget_data.json` is being created in app's files directory

### Quick Add doesn't work

- Check deep linking is configured in app.json
- Verify QuickAddActivity is registered in AndroidManifest
- Test deep link manually: `adb shell am start -a android.intent.action.VIEW -d "budgetplanner://quick-add?amount=10&category=Food"`

### Widget doesn't update

- Call `WidgetService.updateAllWidgets()` after data changes
- Check that native module is properly registered
- Verify broadcast is being sent (check logcat)

## Next Steps

1. Run prebuild to generate native Android files: `npx expo prebuild --platform android`
2. Locate and update AndroidManifest.xml with widget configuration
3. Build and test on Android device: `npx expo run:android`
4. Test all widget sizes and interactions
5. Verify data syncing between app and widgets
6. Test quick add functionality from widget

## Additional Notes

- Widget updates every 30 minutes (1800000ms) as configured
- Widget data is stored in app's private file storage
- Deep linking scheme is `budgetplanner://` as configured in app.json
- Widgets require Android 8.0 (API 26) or higher

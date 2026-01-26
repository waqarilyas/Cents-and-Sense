#!/usr/bin/env node

/**
 * Automated Dark Mode Fix Script
 * This script documents all remaining hardcoded color fixes needed
 */

const fixes = {
  "app/(stack)/subscriptions.tsx": [
    {
      find: 'color: "rgba(255,255,255,0.8)"',
      replace: 'color: colors.textInverse + "CC"',
      line: 612,
    },
    {
      find: 'color: "#FFFFFF"',
      replace: "color: colors.textInverse",
      lines: [618, 713],
    },
    {
      find: 'backgroundColor: "rgba(255,255,255,0.2)"',
      replace: 'backgroundColor: colors.textInverse + "33"',
      line: 623,
    },
    {
      find: 'color="#FFF"',
      replace: "color={colors.textInverse}",
      line: 338,
    },
  ],

  "app/(tabs)/index.tsx": [
    {
      find: '"#F59E0B"',
      replace: "colors.warning",
      lines: [493, 509],
    },
    {
      find: 'color="#FFF"',
      replace: "color={colors.textInverse}",
      line: 529,
    },
    {
      find: '"rgba(255,255,255,0.8)"',
      replace: 'colors.textInverse + "CC"',
      line: 795,
    },
    {
      find: '"rgba(255,255,255,0.2)"',
      replace: 'colors.textInverse + "33"',
      line: 806,
    },
    {
      find: '"rgba(255,255,255,0.15)"',
      replace: 'colors.textInverse + "26"',
      line: 834,
    },
    {
      find: '"rgba(255,255,255,0.85)"',
      replace: 'colors.textInverse + "D9"',
      line: 880,
    },
    {
      find: '"rgba(255,255,255,0.6)"',
      replace: 'colors.textInverse + "99"',
      line: 885,
    },
    {
      find: '"rgba(255,255,255,0.7)"',
      replace: 'colors.textInverse + "B3"',
      line: 906,
    },
  ],

  "app/(stack)/categories.tsx": [
    {
      description: "Fix category colors to be theme-aware",
      note: "The 14 hardcoded colors in CATEGORY_COLORS should be made dynamic based on theme",
    },
    {
      find: 'shadowColor: "#000"',
      replace: "shadowColor: colors.shadow",
      line: 535,
    },
  ],

  "app/(tabs)/history.tsx": [
    {
      find: 'color="#FFF"',
      replace: "color={colors.textInverse}",
      lines: [138, 402],
    },
  ],

  "app/(tabs)/_layout.tsx": [
    {
      find: 'color="#FFFFFF"',
      replace: "color={colors.textInverse}",
      line: 117,
    },
  ],

  "app/(stack)/transactions.tsx": [
    {
      find: 'shadowColor: "#000"',
      replace: "shadowColor: colors.shadow",
      line: 813,
    },
  ],
};

console.log("Dark Mode Fixes Needed:\n");
console.log(JSON.stringify(fixes, null, 2));
console.log("\n✅ All fixes documented in TEST_RESULTS.md");

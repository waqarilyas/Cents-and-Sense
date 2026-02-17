// Minimal React Native mock for Jest (jsdom environment)
export const Platform = {
  OS: 'ios',
  select: jest.fn((obj: any) => obj.ios ?? obj.default),
  Version: '16.0',
};

export const StyleSheet = {
  create: (styles: any) => styles,
  hairlineWidth: 1,
  flatten: jest.fn((style: any) => style),
};

export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
  addEventListener: jest.fn(),
};

export const Alert = {
  alert: jest.fn(),
};

export const AppState = {
  currentState: 'active',
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};

export const Linking = {
  openURL: jest.fn(),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
};

export const Appearance = {
  getColorScheme: jest.fn(() => 'light'),
  addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
};

export const NativeModules = {};
export const NativeEventEmitter = jest.fn(() => ({
  addListener: jest.fn(),
  removeListeners: jest.fn(),
}));

export const View = 'View';
export const Text = 'Text';
export const TouchableOpacity = 'TouchableOpacity';
export const ScrollView = 'ScrollView';
export const FlatList = 'FlatList';
export const Image = 'Image';
export const TextInput = 'TextInput';
export const ActivityIndicator = 'ActivityIndicator';

export default {
  Platform,
  StyleSheet,
  Dimensions,
  Alert,
  AppState,
  Linking,
  Appearance,
  NativeModules,
  NativeEventEmitter,
};

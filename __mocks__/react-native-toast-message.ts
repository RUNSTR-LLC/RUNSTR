/**
 * Mock for react-native-toast-message
 * Used in tests to simulate toast notifications
 */

const Toast = {
  show: jest.fn(),
  hide: jest.fn(),
  setRef: jest.fn(),
};

export default Toast;

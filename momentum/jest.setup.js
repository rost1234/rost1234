/* global jest */
// Native modules that tests import indirectly get their official Jest mocks.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

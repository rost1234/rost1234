// In-memory replacement for the expo-sqlite localStorage shim used by stores.
jest.mock('@/lib/storage', () => {
  const map = new Map();
  return {
    storage: {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
      clear: () => map.clear(),
      key: (i) => Array.from(map.keys())[i] ?? null,
      get length() {
        return map.size;
      },
    },
  };
});

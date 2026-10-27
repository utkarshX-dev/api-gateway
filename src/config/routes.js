export const routes = [
  {
    path: "/users",
    targets: [
      "http://localhost:3001",
      "http://localhost:3002",
    ],
    timeout: 5000
  },
  {
    path: "/products",
    targets: [
      "http://localhost:4001",
      "http://localhost:4002",
    ],
    timeout: 5000
  },
];
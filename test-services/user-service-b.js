import express from "express";

const app = express();
const PORT = 3002;

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "user-service-b",
  });
});

app.get("/users", (req, res) => {
  res.json({
    service: "User Service B",
    users: [
      { id: 3, name: "Priya" },
      { id: 4, name: "Neha" },
    ],
  });
});

app.get("/users/identity-test", (req, res) => {
  res.status(200).json({
    service: "user-service-b", // Service B mein "user-service-b" karna
    userId: req.headers["x-user-id"] ?? null,
    role: req.headers["x-user-role"] ?? null,
  });
});

app.listen(PORT, () => {
  console.log(`User Service B running on port ${PORT}`);
});
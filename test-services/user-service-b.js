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

app.listen(PORT, () => {
  console.log(`User Service B running on port ${PORT}`);
});
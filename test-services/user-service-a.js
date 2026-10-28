import express from "express";

const app = express();
const PORT = 3001;

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "user-service-a",
  });
});



app.get("/users", (req, res) => {
  res.json({
    service: "User Service A",
    users: [
      { id: 1, name: "Rahul" },
      { id: 2, name: "Aman" },
    ],
  });
});

app.get("/users/identity-test", (req, res) => {
  res.status(200).json({
    service: "user-service-a",
    userId: req.headers["x-user-id"] ?? null,
    role: req.headers["x-user-role"] ?? null,
  });
});

app.listen(PORT, () => {
  console.log(`User Service A running on port ${PORT}`);
});
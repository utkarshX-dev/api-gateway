import express from "express";

const app = express();
const PORT = 4002;

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "product-service-b",
  });
});

app.get("/products", (req, res) => {
  res.json({
    service: "Product Service B",
    products: [
      { id: 103, name: "Mouse", price: 800 },
      { id: 104, name: "Monitor", price: 12000 },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Product Service B running on port ${PORT}`);
});
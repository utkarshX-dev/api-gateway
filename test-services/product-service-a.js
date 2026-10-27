import express from "express";

const app = express();
const PORT = 4001;

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "product-service-a",
  });
});

app.get("/products", (req, res) => {
  res.json({
    service: "Product Service A",
    products: [
      { id: 101, name: "Laptop", price: 55000 },
      { id: 102, name: "Keyboard", price: 1500 },
    ],
  });
});

app.listen(PORT, () => {
  console.log(`Product Service A running on port ${PORT}`);
});
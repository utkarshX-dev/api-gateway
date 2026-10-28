import jwt from "jsonwebtoken";
const token = jwt.sign(
  {
    userId: "user-123",
    role: "user",
  },
  process.env.JWT_SECRET,
  {
    algorithm: "HS256",
    expiresIn: "15m",
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  }
);

console.log("\nGenerated JWT:\n");
console.log(token);
console.log("\nToken expires in 15 minutes.");

//test token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzkzMTc3NjkxLCJleHAiOjE3OTMxNzg1OTEsImF1ZCI6ImFwaS1zZXJ2aWNlcyIsImlzcyI6ImFwaS1nYXRld2F5In0.sCz9om2HHR27r6nK3E7EE7-yhaqsxjuJ6CwaU9YNB5o
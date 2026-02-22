import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import pantryRouter from "./routes/pantry.js";
import recipesRouter from "./routes/recipes.js";
import mealPlansRouter from "./routes/mealPlans.js";
import shoppingListRouter from "./routes/shoppingList.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base routes
app.get("/", (req, res) => {
  res.json({ message: "AI Recipe Generator API" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/pantry", pantryRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/meal-plans", mealPlansRouter);
app.use("/api/shopping-list", shoppingListRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Start server
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();

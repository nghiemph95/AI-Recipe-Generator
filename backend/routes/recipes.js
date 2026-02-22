import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as recipeController from "../controller/recipeController.js";

const router = Router();

router.use(authenticate);

// ——— AI generation ———
router.post("/generate", recipeController.generateRecipe);
router.post(
  "/generate/pantry-suggestions",
  recipeController.generatePantrySuggestions,
);
router.get("/pantry-suggestions", recipeController.getPantrySuggestions);

// ——— CRUD ———
router.get("/", recipeController.getRecipes);
router.get("/recent", recipeController.getRecentRecipes);
router.get("/stats", recipeController.getRecipeStats);
router.get("/:id", recipeController.getRecipeById);
router.post("/", recipeController.saveRecipe);
router.put("/:id", recipeController.updateRecipe);
router.delete("/:id", recipeController.deleteRecipe);

export default router;

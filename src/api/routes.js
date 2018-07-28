// This file is where all the route/controller mappings occur

import { Router } from "express";
import exampleController from "./controllers/exampleController";

let router = Router();

router.use("/example", exampleController);

export default router;

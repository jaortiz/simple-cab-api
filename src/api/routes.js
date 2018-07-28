// This file is where all the route/controller mappings occur

import { Router } from "express";
import medallionsController from "./controllers/medallionsController";

let router = Router();

router.use("/medallions", medallionsController);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campusCareRouter from "./campus-care";

const router: IRouter = Router();

router.use(healthRouter);
router.use(campusCareRouter);

export default router;

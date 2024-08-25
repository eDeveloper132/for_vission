import express,{Request , Response} from "express";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const router = express.Router();
router.get("/", (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, "../Views/index.html"));
});

export default router;
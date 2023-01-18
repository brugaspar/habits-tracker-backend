import "express-async-errors";
import express from "express";

import { cors } from "./middlewares/cors-middleware";
import { errors } from "./middlewares/errors-middleware";
import { router } from "./routes";

const server = express();

server.use(express.json());
server.use(cors);
server.use(router);
server.use(errors);

const port = 3030;
server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}\n`);
});

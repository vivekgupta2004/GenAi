import express from "express"
const PORT = process.env.PORT || 3000
import mongoose from "mongoose"
import userRoutes from "./routes/user.js"
import ticketRoutes from "./routes/ticket.js"
import cors from "cors"
import { serve } from "inngest/express"
import { inngest } from "./inngest/client.js"
import { onUserSignup } from "./inngest/functions/on-signup.js"
import { onTicketCreated } from "./inngest/functions/on-ticket-create.js"

import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());


app.use("/api/auth", userRoutes)
app.use("/api/tickets", ticketRoutes)
app.use(
    "/api/inngest", serve({
        client: inngest,
        functions: [onUserSignup, onTicketCreated]
    })
)

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDb Connected");
        app.listen(PORT, () => console.log("Server at http://localhost:",PORT))
    })
    .catch((err) => console.error("MongoDB error:", err))

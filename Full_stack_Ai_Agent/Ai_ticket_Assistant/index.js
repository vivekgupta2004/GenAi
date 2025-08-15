import express from "express"
const PORT = process.env.PORT || 3000
import mongoose from "mongoose"
import userRoutes from "./routes/user.js"
import cors from "cors"
const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/auth",userRoutes)

mongoose.connect(process.env.MONGO_URI)
.then(()=>{
    console.log("MongoDb Connected");
    app.listen(PORT,()=> console.log("Server at http://localhost:3000"))
})
.catch((err)=> console.error("MongoDB error:",err))

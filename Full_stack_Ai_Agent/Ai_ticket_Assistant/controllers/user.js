import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../models/user.js"
import { inngest } from '../inngest/client.js'

export const signup = async (req, res) => {
    const { email, password, skills = [] } = req.body;
    try {
       
        const hashedPassword = await bcrypt.hash(password, 10);

       
        const newUser = await User.create({
            email,
            password: hashedPassword, 
            skills
        });

        await inngest.send({
            name: "user/signup",
            data: {
                email: newUser.email, 
                userId: newUser._id 
            }
        });

        const token = jwt.sign(
            {
                _id: newUser._id,
                role: newUser.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } 
        );

        res.status(201).json({ 
            user: {
                _id: newUser._id,
                email: newUser.email,
                skills: newUser.skills,
                role: newUser.role 
            },
            token
        });

    } catch (error) {
        
        console.error("Signup failed:", error);

       
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: "Validation failed",
                details: error.message
            });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({
                error: "Email already registered",
                details: "A user with this email already exists."
            });
        }

        res.status(500).json({
            error: "Signup failed",
            details: error.message
        });
    }
};
export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = User.findOne({ email })
        if (!user) return res.status(401).json({ error: "User not found" })
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" })
        }

        const token = jwt.sign(
            {
                _id: user._id,
                role: user.role

            },
            process.env.JWT_SECRET
        )
        res.json({
            user,
            token
        })
    } catch (error) {
        res.status(500).json({
            error: "Login faild",
            details: error.message

        })
    }

}

export const logout = async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        if (!token) return res.status(401).json({
            error:
                "Unauthorized"
        })
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).json({ error: "Unauthorized" })
            }
        })
        res.json({ message: "Logout successfully" })
    } catch (error) {
        res.status(500).json({
            error: "Login faild",
            details: error.message

        })
    }

}

export const updateUser = async (req, res) => {
    const { skills = [], role, email } = req.body;

    try {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ error: "Forbidden" });
        }
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: "User not found" });
        await User.updateOne(
            { email },
            {
                skills: skills.length ? skills : user.skills,
                role
            }
        )
        return res.json({ message: "User updated successfully" });

    } catch (error) {
      res.status(500).json({
            error: "Update faild",
            details: error.message

        })
    }

}

export const getUser = async (req, res) => {
    try {
        if(req.user.role!=="admin"){
            return res.status(403).json({
                error:"Forbidden"
            })
        }
        const users  = await User.find().select("-password")
        return res.json(users);
    } catch (error) {
        res.status(500).json({
            error: " getUser sfaild",
            details: error.message

        })
    }
}
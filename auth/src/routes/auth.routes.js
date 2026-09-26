import {Router} from "express";
import User from "../models/user.model.js";
import passport from "passport";
import jwt from "jsonwebtoken";
import { sendAuthNotification } from "../config/mq.js";

const router = Router();

router.get("/google",passport.authenticate("google", {
  session: false,
  scope: ["profile", "email"] }));

router.get("/google/callback", passport.authenticate("google", {
     session: false, 
  failureRedirect: "/"
   }), async (req, res) => {
  try {
    const { id, displayName, emails, photos } = req.user;
    let user = await User.findOne({ googleId: id });
    
    if (!user) {
      user = new User({
        googleId: id,
        email: emails[0].value,
        name: displayName,
        avatar: photos[0].value
      });
      await user.save();
    }

    await sendAuthNotification({
      userId: user._id,
      action: "google_login",
      timestamp:  new Date(),
      email: emails[0].value
    })

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.cookie("token", token, {httpOnly: true });

  // Deployed setup: frontend bhi isi origin (ingress) se serve hota hai, isliye
  // relative root par bhejna correct hai. Pehle "http://localhost:5173" hardcoded
  // tha jo local dev me theek tha par cluster me user ko localhost par bhej deta.
  // FRONTEND_URL set hone par wahi use hota hai (e.g. custom domain ke liye).
     res.redirect(process.env.FRONTEND_URL || "/");
    } catch (error) {
      console.error("Error during Google authentication callback:", error);
      res.redirect("/");
    }});

export default router;
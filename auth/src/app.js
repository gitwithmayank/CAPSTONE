import  "dotenv/config";
import express from "express";
import morgan from "morgan";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cookies from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";


const app = express();

// nginx-ingress TLS terminate karta hai aur app tak request HTTP me aati hai,
// isliye Express ko batana padta hai ki wo ek proxy ke peeche hai. Iske bina
// passport-oauth2 relative callbackURL ko "http://..." bana deta hai aur
// Google non-localhost http redirect URI accept nahi karta.
// trust proxy + nginx ka X-Forwarded-Proto header => req.originalURL https ban jata hai.
app.set("trust proxy", 1);

app.use("/api/auth", authRoutes);

app.use(morgan("dev"));
app.use(express.json());
app.use(cookies());
app.use(passport.initialize());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback"
    }, (accessToken, refreshToken, profile, done) => {
      // Handle user authentication logic here
      return done(null, profile);
    }
  )
);

app.get("/_status/healthz", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.get("/_status/readyz", (req, res) => {
  res.status(200).json({ status: "OK" });
});

export default app;
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { User } from "lucide-react";

const AuthComponent = ({ onAuthenticate }) => {
  const [authMode, setAuthMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleAuthentication = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          mode: authMode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onAuthenticate(data.user);
      } else {
        setError(data.message || "Authentication failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center">
          <User className="mr-2 h-4 w-4" /> Sign In
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {authMode === "signin" ? "Sign In" : "Sign Up"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAuthentication} className="space-y-4">
          <div>
            <label className="block mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-2">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <div className="flex justify-between">
            <Button type="submit">
              {authMode === "signin" ? "Sign In" : "Sign Up"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setAuthMode(authMode === "signin" ? "signup" : "signin")
              }
            >
              Switch to {authMode === "signin" ? "Sign Up" : "Sign In"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthComponent;

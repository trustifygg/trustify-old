import { sign } from "hono/jwt";
import { Context } from "hono";
import { setCookie } from "hono/cookie";
import { JWT_COOKIE_OPTIONS } from "../api/routes/auth";
import { refreshToken } from "./discord";
import { type IUser, userModel } from "../models/users";

export async function refreshUserTokens(user: IUser, c: Context) {
  try {
    const newTokens = await refreshToken(user.refreshToken);
    
    // Update user with new tokens
    const updatedUser = await userModel.findOneAndUpdate(
      { userId: user.userId },
      {
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error("Failed to update user tokens");
    }

    // Generate new JWT
    const newJWT = await sign(
      {
        userId: user.userId,
        exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
      },
      Bun.env.JWT_SECRET!
    );

    // Set new cookie
    setCookie(c, "token", newJWT, JWT_COOKIE_OPTIONS);

    // Update session if it exists
    const session = c.get("session");
    if (session) {
      session.user = {
        userId: updatedUser.userId,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar || "",
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token,
      };
      c.set("session", session);
    }

    return {
      user: updatedUser,
      token: newJWT,
    };
  } catch (error) {
    console.error("Token refresh failed:", error);
    throw error;
  }
} 
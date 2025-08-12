// import React from 'react'
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/apiError.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // console.log("Cookies:", req.cookies);
    // console.log("Auth Header:", req.header("Authorization"));
    
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");
    
    console.log("Extracted Token:", token);
    console.log(token);
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    console.log("Not yet decoded");
    
    // const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    
    console.log("decoded");
    
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Verify Error:", error.name, error.message);
    throw new ApiError(401, "Invalid Access Token during JWT verification");
  }
});

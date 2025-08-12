import mongoose from 'mongoose'
import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import {upload} from '../middlewares/multer.middleware.js'
import jwt from 'jsonwebtoken'


const generateAccessAndRefreshTokens = async (userId) =>{
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        // user.accessToken = accessToken
        // await user.save( {validateBeforeSave: False})
        
        return {accessToken, refreshToken}
    }
    catch(error) {
        throw new ApiError(500, "Something went wrong while generating refresh and acces token",error.message);
    }
}

const registerUser = asyncHandler (async (req, res) => {
    const {fullName,email,username,password} = req.body
    // console.log("email: ",email);

    // if (fullName=="") {
    //     throw new ApiError(400, "fullname is required")
    // }

    if( [fullName, email, username, password].some((field) => field?.trim()==="")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    //req.files --> get using multer
    const avatarLocalPath = await req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = await req.files?.coverImage?.[0]?.path;
    // console.log(avatarLocalPath);
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar is not uploaded");
    }

    const user = await User.create({
        fullName,
        avatar,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser, "User Registered Successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    const {email,username,password} = req.body


    if(!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // const options = {
    //     httpOnly: true,
    //     secure: true,
    // }

    return res
    .status(200)
    // .cookie("accessToken", accessToken, options)
    // .cookie("refreshToken", refreshToken, options)
    .cookie("refreshToken", refreshToken)
    .cookie("accessToken", accessToken)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    ) 
})

const logoutUser = asyncHandler(async(req,res)=> {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    // const options = {
    //     httpOnly: true,
    //     secure: true,
    // }

    return res
    .status(200)
    // .clearCookie("accessToken", options) 
    // .clearCookie("refreshToken", options) 
    .clearCookie("refreshToken") 
    .clearCookie("accessToken") 
    .json(new ApiResponse(200,{}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req,res) => 
    {
    const incomingRefreshToken = req.cookies.refreshToken()

    if(!incomingRefreshToken) {
        throw new ApiError(401,"Unathorized request");
    }

    try{
        const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decoded?._id)

        if(!user){
            throw new ApiError(401,"Invalid refresh token");
        }

        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, 'Refresh token is expired or used')
        }

        // const options = {
        //     httpOnly: true,
        //     secure: true,
        // }

        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);

        return res
        .status(200)
        // .cookie("assessToken",accessToken, options)
        .cookie("refreshToken",refreshToken)
        // .cookie("assessToken",accessToken, options)
        .cookie("assessToken",accessToken)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access Token Refreshed Successfully"
            )
        )
    } catch(error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token");
    }
})

const changeCurrentPassoword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword,confirmPassword} = req.body;

    if(newPassword!==confirmPassword) {
        throw new ApiError(400, "New Password and Confirm Password are different")
    }
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }
    
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{}, "Password Changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res) => {
    return res
    .status(200)
    .json(200,req.user, "Current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName, email} = req.body

    if(!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email,
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.files?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new:true}
    ).select("-password")
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, "Avatar updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req,res)=> {
    const coverImagePath = req.file?.path

    if(!coverImagePath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImagePath)

    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Cover image updated successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassoword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}
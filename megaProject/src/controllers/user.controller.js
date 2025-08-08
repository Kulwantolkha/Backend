import mongoose from 'mongoose'
import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import {upload} from '../middlewares/multer.middleware.js'


const generateAccessAndRefreshTokens = async (userId) =>{
    try{
        const user = await User.findbyId(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        // user.accessToken = accessToken
        // await user.save( {validateBeforeSave: False})
        
        return {accessToken, refreshToken}
    }
    catch(error) {
        throw new ApiError(500, "Something went wrong while generating refresh and acces token");
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
    const {email, username, password} = req.body

    if(!username || !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPassowrdValid = await user.isPasswordCorrect(password)

    if(!isPassowrdValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.fineById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
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
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options) 
    .clearCookie("refreshToken", options) 
    .json(new ApiResponse(200,{}, "User logged out successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser
}
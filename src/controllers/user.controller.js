import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';


const registerUser = asyncHandler(async (req, res) => {
  // get user detailes from frontend /  postman
  // validation - not empty
  // check user already exists : username , email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { userName, email, fullName, password } = req.body;

  if ([userName, email, fullName, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required")
  }

  const existsingUser = await User.findOne({
    $or: [{ userName }, { email }]
  });
  if (existsingUser) {
    throw new ApiError(409, "userName and email already exits")
  }
  // console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;

  let coverImageLocalPath;

  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    email,
    userName: userName.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password
  })

  const createdUser = await User.findById(user._id).select(" -password -refreshToken ");

  if (!createdUser) {
    throw new ApiError(500, "somethimg went wrong while registering user")
  }

  return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registerd Succesfully")
  )

})

export { registerUser }
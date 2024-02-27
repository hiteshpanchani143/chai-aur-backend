import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken()
    const refressToken = user.generateRefreshToken()

    user.refressToken = refressToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refressToken }

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token")
  }
};

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

});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // check username and email
  // find the user
  // password check
  // generate accessToken, refreshToken
  // send coocki
  const { userName, email, password } = req.body;
  if (!userName && !email) {
    throw new ApiError(400, "username and email required");
  }

  const user = await User.findOne({
    $and: [{ userName }, { email }]
  })

  if (!user) {
    throw new ApiError(401, "User does not valid")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
  }

  const { accessToken, refressToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select(" -password -refreshToken ");

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refressToken", refressToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refressToken
        },
        "User Logged in Successfully"
      )
    )
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id,
    {
      $set: {
        refressToken: undefined
      }
    },
    {
      new: true
    }
  );

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refressToken", options)
    .json(
      new ApiResponse(
        200,
        {},
        "User Logged Out"
      )
    )
});

const refreshAccessToken = asyncHandler(async (req, res) => {

  const incomingRefressToken = req.cookies.refressToken || req.body.refressToken;

  if (!incomingRefressToken) {
    throw new ApiError(401, "Unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefressToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefressToken !== user?.refressToken)
      throw new ApiError(401, "Refresh Token is expired or used")

    const { accessToken, newRefressToken } = await generateAccessAndRefreshToken(user._id);

    const options = {
      httpOnly: true,
      secure: true
    }

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refressToken", newRefressToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refressToken: newRefressToken },
          "Access token refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }


});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Password is incorrect")
  }
  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new ApiError(400, "Please fill the blanks")
  }

  const user = await User.findById(req.user._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password")
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password change successfully"
      )
    )

});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        req.user,
        "Current User fetched successfully"
      )
    )
});

const updateAccountDetailes = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName && !email) {
    throw new ApiError(400, "fields are required")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        fullName,
        email
      }
    },
    {
      new: true
    }
  ).select("-password")

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "Account detailes upadated successfully"
      )
    )

});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is empty")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "Avatar change successfully"
      )
    )

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading coverImage");
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user,
        "coverImage change successfully"
      )
    )

})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { userName } = req.params;

  if (!userName?.trim()) {
    throw new ApiError(400, "UserName is required")
  }

  const channel = await User.aggregate(
    [
      {
        $match: {
          userName: userName?.toLowerCase()
        }
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers"
        }
      },
      {
        $lookup: {
          from: "subscription",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo"
        }
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers"
          },
          channelSubscribedToCount: {
            $size: "$subscribedTo"
          },
          isSubscribed: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
              then: true,
              else: false
            }
          }
        }
      },
      {
        $project: {
          fullName: 1,
          userName: 1,
          subscribersCount: 1,
          channelSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1
        }
      }
    ])

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exits")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channel[0],
        "User channel fetched successfully"
      )
    )

})

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate(
    [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      userName: 1,
                      avatar: 1
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner"
                }
              }
            }
          ]
        }
      }
    ]
  )

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].whatchHistory,
        "Watch History fetched successfully"
      )
    )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetailes, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory }
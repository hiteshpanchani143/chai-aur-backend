//  ------------ with promiss -----------//
const asyncHandler = (func) => {
  return (req, res, next) => {
    Promise.resolve(func(req, res, next)).catch((err) => next(err))
  }
}

export { asyncHandler };

// const asyncHandler = () => () => {};
// const asyncHandler = (func) => () => {};
// const asyncHandler = (func) => async() => {};


// --------------- with try catch ------------------//

// const asyncHandler = (func) => async(req,res,next) => {
//   try {
//     await func(req,res,next)
//   } catch (error) {
//     res.status(error.code || 500 ).json({
//       success:false,
//       message:error.message
//     })
//   }
// }

// export default asyncHandler;
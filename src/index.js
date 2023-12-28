// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";

import connectDb from "./db/index.js";
import { app } from "./app.js";
dotenv.config({ path: './env' })

connectDb()
  .then(() => {
    app.on((err) => {
      console.log("Error", err);
      throw err
    })
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`)
    })
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!!", err)
  })















// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//     app.on("error",(error)=>{
//       console.log("Error",error)
//       throw error
//     })
//     app.listen(process.env.PORT, ()=>{
//       console.log(`App is listening on port ${process.env.PORT}`)
//     })
//   } catch (error) {
//     console.log(error("Error", error))
//     throw err
//   }
// })()
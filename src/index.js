// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";

import connectDb from "./db/index.js";
dotenv.config({path:'./env'})

connectDb();















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
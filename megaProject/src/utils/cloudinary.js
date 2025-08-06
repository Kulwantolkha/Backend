import {v2 as cloudinary} from 'cloudinary'
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath)  return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        }) //File has been uploaded successfully
        
        fs.unlink(localFilePath,(err) => {
            if(err) {
                console.log("Error deleting file white unlink after uploading : ",err);
            }
        })
        return response;
    } catch(error) {
        fs.unlink(localFilePath,(err) => {
            if(err) {
                console.log("Error uploading file on cloudinary : ",err);
            }
        })
        //remove the locally saved temp file as the upload got failed
        return null;
    }
}

export {uploadOnCloudinary}
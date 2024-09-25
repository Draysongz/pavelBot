const { Prodia } = require("prodia.js");
const axios= require("axios")
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const stream = require("stream")

const prodia = new Prodia("b822c146-da02-49dd-9d9d-1a9db97a0f9e")

cloudinary.config({
    cloud_name: 'dkvox2lsa', // Replace with your Cloudinary cloud name
    api_key: '143156259679887',        // Replace with your Cloudinary API key
    api_secret: 'EbkN-QrA96tJeQry2iNtmloJJoc'   // Replace with your Cloudinary API secret
});

async function uploadVideoToCloudinary(videoUrl) {
    try {
        // Download the video
        const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
        const videoBuffer = Buffer.from(response.data, 'binary');

        // Return a promise that resolves when the upload is complete
        return new Promise((resolve, reject) => {
            // Upload the video to Cloudinary
            const uploadResponse = cloudinary.uploader.upload_stream(
                { resource_type: 'video' }, 
                (error, result) => {
                    if (error) {
                        console.error('Error uploading to Cloudinary:', error);
                        reject(error); // Reject the promise on error
                    } else {
                        console.log('Upload successful! Public URL:', result.secure_url);
                        resolve(result.secure_url); // Resolve the promise with the public URL
                    }
                }
            );

            // Create a stream to upload the video buffer
            const bufferStream = new stream.PassThrough();
            bufferStream.end(videoBuffer);
            bufferStream.pipe(uploadResponse);
        });
    } catch (error) {
        console.error('Error downloading or uploading the video:', error);
        throw error; // Rethrow the error for further handling
    }
}



const faceSwap = async ( target) => {
    const generate = await prodia.faceSwap({
        sourceUrl: "https://payspacemagazine.com/wp-content/uploads/2019/10/paveldurov.jpg",
        targetUrl: target,
    });

    while (generate.status !== "succeeded" && generate.status !== "failed") {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const job = await prodia.getJob(generate.job);

        if (job.status === "succeeded") {
            const upscaleGenerate = await prodia.faceRestore({
                imageUrl: job.imageUrl,
            });

            while (upscaleGenerate.status !== "succeeded" && upscaleGenerate.status !== "failed") {
                await new Promise((resolve) => setTimeout(resolve, 250));
                const upscaleJob = await prodia.getJob(upscaleGenerate.job);

                if (upscaleJob.status === "succeeded") {
                    console.log("Upscaled", upscaleJob);
                    return upscaleJob.imageUrl;
                }
            }
            console.log("Upscaled", upscaleJob);
            return upscaleJob.imageUrl;
        }
    }

    console.log("Face swapped", job);
    return job.imageUrl;
};


const videoSwap = async(targetUrl)=>{
    const apiKey = "83788446-c5d0-46f8-ae18-e9a246a4edd9"
    try {
        const url = await uploadVideoToCloudinary(targetUrl)
       console.log("updated url", url)
        const response = await axios.post(
      'https://www.capix.uz/v2/faceswap/video/',
      {
        target_url: url,
        swap_url: 'https://payspacemagazine.com/wp-content/uploads/2019/10/paveldurov.jpg',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          token: apiKey,
        },
      }
    );

    console.log(response.data.image_process_response.request_id)
     const requestId = response.data.image_process_response.request_id;
    console.log('Face swap started, request ID:', requestId);

    
    const swapped = await checkFaceSwapResult(requestId);
    console.log(swapped)
    return swapped;
    } catch (error) {
      console.error('Error starting face swap:', error);  
    }


}



const checkFaceSwapResult = async (requestId) => {
    const apiKey = "83788446-c5d0-46f8-ae18-e9a246a4edd9";
    let status = 'InProgress';
    let resultUrl = null;

    while (status === 'InProgress') {
        try {
            const response = await axios.post(
                'https://www.capix.uz/v2/faceswap/result/',
                {
                    request_id: requestId,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        token: apiKey,
                    },
                }
            );

            // Handle the result
            status = response.data.image_process_response.status;
            console.log('Current status:', status);

            if (status === 'OK') {
                resultUrl = response.data.image_process_response.result_url;
                console.log('Face swap result URL:', resultUrl);
            } else if (status === 'Failed') {
                console.error('Face swap failed.');
                return null; // Handle failed case as needed
            } else {
                console.log('Face swap is still in progress, waiting...');
                await new Promise(res => setTimeout(res, 5000)); // Wait for 5 seconds before the next check
            }
        } catch (error) {
            console.error('Error retrieving face swap result:', error.response ? error.response.data : error.message);
            break; // Break on error, or you can implement further retry logic here
        }
    }

    return resultUrl;
};

// videoSwap("https://api.telegram.org/file/bot6838883114:AAGnryuwR4H9fFhdCjWCAhlUh4VOT2Y-N4c/videos/file_2812.MP4")


module.exports ={
    faceSwap,
    videoSwap
}
const express = require("express");
const { urlencoded } = require("body-parser");
const { twiml } = require("twilio");
const { MessagingResponse } = twiml;
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

// Create an Express application
const app = express();

// Configure body-parser middleware to parse incoming request bodies
app.use(urlencoded({ extended: false }));

// Define a route to handle incoming messages from Twilio
app.post("/webhook", async (req, res) => {
  console.log(req.body);

  const message = req.body.Body;
  const sender = req.body.From;
  const profileName = req.body.ProfileName;

  // Process the incoming message and generate a response
  const response = await generateResponse(
    message,
    profileName
  );

  // Send the response back to the user
  const twiml = new MessagingResponse();
  twiml.message(response);

  res.set("Content-Type", "text/xml");
  res.send(twiml.toString());
});

// Function to generate a response based on the received message
async function generateResponse(message, profileName) {
  // Connect to the Openai API and send the message forward.
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(configuration);
  const response = await openai.createCompletion({
    model: "text-davinci-003",
    prompt: `This is what the user said : ${message}. 
    Give a short introduction about yourself in two lines and continue the conversation ${profileName}`,
    max_tokens: 500,
    temperature: 0,
  });

  // console.log(response.data);

  // Example: Echo back the received message
  // return `You said: ${message}`;
  return `You said: ${message}
${response.data.choices[0].text}

${response.data.usage.total_tokens} tokens were used!`;
}

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

const express = require("express");
const { urlencoded } = require("body-parser");
const { twiml } = require("twilio");
const { MessagingResponse } = twiml;

// Create an Express application
const app = express();

// Configure body-parser middleware to parse incoming request bodies
app.use(urlencoded({ extended: false }));

// Define a route to handle incoming messages from Twilio
app.post("/webhook", (req, res) => {
  console.log(req.body);

  const message = req.body.Body;
  const sender = req.body.From;
  const profileName = req.body.ProfileName;

  // Process the incoming message and generate a response
  const response = generateResponse(message);

  // Send the response back to the user
  const twiml = new MessagingResponse();
  twiml.message(response);

  res.set("Content-Type", "text/xml");
  res.send(twiml.toString());
});

// Function to generate a response based on the received message
function generateResponse(message) {
  // Add your response logic here
  // You can use if-else statements, switch cases, or any other method to generate appropriate responses

  // Example: Echo back the received message
  return `You said: ${message}`;
}

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

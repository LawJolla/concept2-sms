import { Request, Response } from "express"
import twilio from "twilio"

const validateTwilio = (req: Request) => {
  const twilioSignature = req.header('X-Twilio-Signature') || ``;
  const isValid = twilio.validateRequest(
    process.env.TWILIO_TOKEN || ``,
    twilioSignature,
    process.env.TWILIO_WEBHOOK || ``,
    req.body
  );
  console.log("sig", isValid, twilioSignature, process.env.TWILIO_TOKEN, process.env.TWILIO_WEBHOOK)
  return isValid
}

export default validateTwilio
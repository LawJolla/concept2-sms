import twilio from "twilio";

const twilioClient = twilio(process.env.TWILIO_ACCOUNT, process.env.TWILIO_TOKEN)
const { MessagingResponse: MR } = twilio.twiml
export const MessagingResponse = MR
export default twilioClient
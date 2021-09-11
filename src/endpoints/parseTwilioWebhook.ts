import { Request, Response } from "express"
import validateTwilio from "../lib/validateTwilio"
import { MessagingResponse } from "../lib/twilio"
import { logConcept2Row, loginConcept2 } from "../log/concept2Login"
import { cryptography } from "../lib/crypto"

const exampleSms = {
  ToCountry: 'US',
  ToState: 'AZ',
  SmsMessageSid: 'SM11f12975a337d53de7514fdca7d265b9',
  NumMedia: '0',
  ToCity: '',
  FromZip: '85705',
  SmsSid: 'SM11f12975a337d53de7514fdca7d265b9',
  FromState: 'AZ',
  SmsStatus: 'received',
  FromCity: 'TUCSON',
  Body: 'Post 11',
  FromCountry: 'US',
  To: '+15202149288',
  ToZip: '',
  NumSegments: '1',
  MessageSid: 'SM11f12975a337d53de7514fdca7d265b9',
  AccountSid: 'AC58f249c61d4388f6d161f9f5f2531a8c',
  From: '+15202473546',
  ApiVersion: '2010-04-01'
}

const parseTwilioWebhook = async (req: Request, res: Response) => {
  const { prisma } = req
  if (!validateTwilio(req)) {
    console.log("failed validation")
    res.sendStatus(403)
    res.end()
    return;
  }
  const { To, Body } = req.body
  if (!To) {
    res.sendStatus(403)
    res.end()
    return;
  }
  const twilioMessagingResponse = new MessagingResponse()
  let user = await prisma.user.findFirst({ where: { phoneNumber: To } })
  if (!user?.phoneNumber) {
    if (!Body.toLowerCase().includes("row")) {
      console.log("close")
      res.end()
      return;
    }
    user = await prisma.user.create({ data: { phoneNumber: To } })
    res.writeHead(200, { 'Content-Type': 'text/xml' })
    res.end(twilioMessagingResponse.message(`Welcome to Milo Fitness Factory's fall rowing challenge!\n\nPlease enter your username (not email) on Concept2's website with correct capitalization.\n(Beware... Phones and autocorrect love to capitalize the first letter in a word)`).toString())
    return;
  }
  try {
    // is user name validated?
    if (!user.userName) {
      user = await prisma.user.update({ where: { phoneNumber: user.phoneNumber }, data: { userName: Body } })
      res.writeHead(200, { 'Content-Type': 'text/xml' })
      res.end(twilioMessagingResponse.message(`Username ${Body} saved.\n\nPlease enter your password with correct capitalization.\n(Beware... Phones and autocorrect love to capitalize the first letter in a word)`).toString())
      return;
    }
    // is password validated?
    if (!user.password) {
      const encryptedPassword = cryptography.encrypt(Body, process.env.SERVER_SECRET || ``)
      user = await prisma.user.update({ where: { phoneNumber: To }, data: { password: encryptedPassword } })
      res.writeHead(200, { 'Content-Type': 'text/xml' })
      res.end(twilioMessagingResponse.message(`Please confirm.\n\nUsername: ${user.userName}\nPassword: ${Body}\n\nReply "Y" if correct, "N" if not correct`).toString())
      return;
    }
    // is login validated?
    if (!user.isLoginValid) {
      if (Body.toLowerCase() === "y" || Body.toLowerCase() === "yes") {
        // validate
        const login = await loginConcept2({ username: user.userName, password: user.password, cleanup: true })
        if (login.success) {
          user = await prisma.user.update({ where: { phoneNumber: user.phoneNumber }, data: { isLoginValid: true } })
          res.writeHead(200, { 'Content-Type': 'text/xml' })
          res.end(twilioMessagingResponse.message(`Success! 🎉\n\nNow logging your meters is as simple as typing in the meters rowed.\nFor instance, text "1000" (without the quotes) to log 1000 meters`).toString())
          return;
        } else {
          user = await prisma.user.update({ where: { phoneNumber: user.phoneNumber }, data: { password: null, userName: null, isLoginValid: false } })
          res.writeHead(200, { 'Content-Type': 'text/xml' })
          res.end(twilioMessagingResponse.message(`Login error. 😢 \n\nPlease verify your Concept2 login at https://log.concept2.com/login\n\nWhen verified, please reenter your username with correct capitalization.`).toString())
          return;
        }
      }
      else {
        user = await prisma.user.update({ where: { phoneNumber: user.phoneNumber }, data: { password: null, userName: null, isLoginValid: false } })
        res.writeHead(200, { 'Content-Type': 'text/xml' })
        res.end(twilioMessagingResponse.message(`Bad login. 😢 \n\nPlease enter your Concept2 username (not email) with correct capitalization.`).toString())
        return;
      }
    }
    // is body numbers only
    const distance = Number(Body)
    if (isNaN(distance)) {
      res.writeHead(200, { 'Content-Type': 'text/xml' })
      res.end(twilioMessagingResponse.message(`Your entry ${Body} was not formatted correctly.  Please only enter the meters rowed (numbers only)`).toString())
      return;
    }
    // log meters
    const { logSuccess, loginSuccess } = await logConcept2Row({ distance: distance.toString(), username: user.userName, password: user.password })

    // did meters log correctly?
    if (!loginSuccess) {
      user = await prisma.user.update({ where: { phoneNumber: user.phoneNumber }, data: { password: null, userName: null, isLoginValid: false } })
      res.writeHead(200, { 'Content-Type': 'text/xml' })
      res.end(twilioMessagingResponse.message(`Login error. 😢 \n\nPlease verify your Concept2 login at https://log.concept2.com/login\n\nWhen verified, please reenter your username with correct capitalization.`).toString())
      return;
    }
    if (!logSuccess) {
      user = await prisma.user.update({ where: { phoneNumber: user.phoneNumber }, data: { password: null, userName: null, isLoginValid: false } })
      res.writeHead(200, { 'Content-Type': 'text/xml' })
      res.end(twilioMessagingResponse.message(`Unknown error logging your row.  Sorry!  I'm on it looking for a fix 🤞`).toString())
      return;
    }
    user = await prisma.user.update({
      where: { phoneNumber: user.phoneNumber }, data: {
        logs: {
          create: {
            distance,
            submitted: true
          }
        }
      }
    })
    res.writeHead(200, { 'Content-Type': 'text/xml' })
    res.end(twilioMessagingResponse.message(`${distance} meters logged!\n\nNow get back on the rower and log more... ❤️`).toString())
    return;
  } catch (e) {
    console.log("error3", e)
  }
}

export default parseTwilioWebhook
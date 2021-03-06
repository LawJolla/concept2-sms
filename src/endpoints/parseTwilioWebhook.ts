import { Request, Response } from "express"
import validateTwilio from "../lib/validateTwilio"
import twilioClient, { MessagingResponse } from "../lib/twilio"
import { logConcept2Row, loginConcept2 } from "../log/concept2Login"
import { cryptography } from "../lib/crypto"
import getTeamAffiliation from "../log/getTeamAffiliation"
import competitionStats from "../log/competitionStats"
import individualStats from "../log/individiualStats"

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
  const { To, Body, From } = req.body
  if (!From) {
    res.sendStatus(403)
    res.end()
    return;
  }
  const twilioMessagingResponse = new MessagingResponse()
  let user = await prisma.user.findFirst({ where: { phoneNumber: From } })
  if (!user?.phoneNumber) {
    if (!Body.toLowerCase().includes("row")) {
      console.log("close")
      res.end()
      return;
    }
    user = await prisma.user.create({ data: { phoneNumber: From } })
    res.writeHead(200, { 'Content-Type': 'text/xml' })
    res.end(twilioMessagingResponse.message(`Welcome to Milo Fitness Factory's 🍂 🚣‍♀️ challenge!\n\nPlease enter your username (not email) on Concept2's website with correct capitalization.\n\n(Caution... Phones and autocorrect love to capitalize the first letter in a word)`).toString())
    return;
  }
  try {
    // is user name validated?
    if (!user.userName) {
      user = await prisma.user.update({ where: { phoneNumber: user.phoneNumber }, data: { userName: Body } })
      res.writeHead(200, { 'Content-Type': 'text/xml' })
      res.end(twilioMessagingResponse.message(`Username ${Body} saved.\n\nPlease enter your password with correct capitalization.\n\n(Again, caution... Phones and autocorrect love to capitalize the first letter in a word)`).toString())
      return;
    }
    // is password validated?
    if (!user.password) {
      const encryptedPassword = cryptography.encrypt(Body, process.env.SERVER_SECRET || ``)
      user = await prisma.user.update({ where: { phoneNumber: From }, data: { password: encryptedPassword } })
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
    const rows = [...Array(parseInt(String(distance / 500)))].map((_, i) => `🚣‍♀️`).join(" ")
    res.end(twilioMessagingResponse.message(`${distance} meters logged!\n${rows}\n\nCome back soon, we have a challenge to win ❤️`).toString())
    if (!user.name) {
      if (user.userName && user.password) {
        const team = await getTeamAffiliation({ username: user?.userName, password: user?.password })
        user = await prisma.user.update({
          where: { phoneNumber: user.phoneNumber }, data: { ...team }
        })
      }
    }
    if (user.teamName) {
      const team = await competitionStats({ team: user.teamName })
      if (team?.text.length) {
        twilioClient.messages
          .create({
            body: team.text,
            from: To,
            to: From
          })
      }
    }
    if (user.name && user.teamLink && user.teamName) {
      const individual = await individualStats({ name: user.name, teamLink: user.teamLink, teamName: user.teamName })
      if (individual?.text.length) {
        twilioClient.messages
          .create({
            body: individual.text,
            from: To,
            to: From
          })
      }
    }
    return;
  } catch (e) {
    console.error("error top", e)
    res.writeHead(200, { 'Content-Type': 'text/xml' })
    res.end(twilioMessagingResponse.message(`There was an error.  I'll let Dennis know and he'll get it fixed.`).toString())
  }
}

export default parseTwilioWebhook
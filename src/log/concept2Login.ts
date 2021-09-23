import puppeteer, { Page } from "puppeteer"
import { cryptography } from "../lib/crypto"
import competitionStats from "./competitionStats"
import getTeamAffiliation from "./getTeamAffiliation"
import individualStats from "./individiualStats"


interface ILogin {
  username: string
  password: string
  cleanup?: boolean
}

const loginConcept2 = async ({ username, password, cleanup = false }: ILogin) => {
  const decryptedPassword = cryptography.decrypt(password, process.env.SERVER_SECRET || ``)
  // const decryptedPassword = "ilovecato2"
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  try {

    await page.goto("https://log.concept2.com/login")
    await page.waitForSelector(`#username`)
    await page.click(`#username`)
    await page.type(`#username`, username)
    await page.waitForSelector(`#password`)
    await page.click(`#password`)
    await page.type(`#password`, decryptedPassword)
    try {
      await Promise.all([
        page.click("body > div.clean-outer-container > div > form > input.btn.btn-primary.btn-block"),
        // page.waitForNavigation({ waitUntil: 'networkidle2' }),
        await page.waitForResponse(response => response.url() === 'https://log.concept2.com/log' && response.status() === 200, { timeout: 5000 })
      ]);

    } catch (e) {
      console.log("login error", username, e)
      await browser.close()
      return { success: false, page, browser };
    }



    // validate login
    if (cleanup) {
      await browser.close()
    }
    return { success: true, page, browser }
  } catch (e) {
    await browser.close()
    return { success: false, page, browser };
  }

}

const logRow = async ({ distance, page }: { distance: string, page: Page }) => {
  try {
    await page.goto("https://log.concept2.com/log")
    await page.waitForSelector(`#distance`)
    await page.waitForSelector(
      `body > div.container.default > div > main > section.content > form`
    )
    await page.type(`#distance`, distance)
    // await page.click(
    //   `body > div.container.default > div > main > section.content > form > div:nth-child(9) > div > button`
    // )
    await page.$eval(
      "body > div.container.default > div > main > section.content > form",
      (form: any) => form.submit()
    )
    return { success: true, page }
  } catch (e: any) {
    return { success: false, page, error: e.message }
  }
}

interface ILogRow extends ILogin {
  distance: string
}
const logConcept2Row = async ({ distance, username, password }: ILogRow) => {
  try {
    var { success, page, browser } = await loginConcept2({ username, password })
    // check if login successfull
    if (!success) {
      await browser.close()
      return { loginSuccess: false, logSuccess: false }
    }
    var { success, page } = await logRow({ distance, page })
    // check if worked

    // if success return { status: "success" }
    await browser.close()
    return { loginSuccess: true, logSuccess: true }
  } catch (e) {
    return { loginSuccess: true, logSuccess: false, error: "Oops, there was a problem logging your meters.  I'll let Dennis know." }
  }
}

export { logConcept2Row, loginConcept2 }
// loginConcept2({ username: "LawJolla", password: "kIX7tO2VcrtCBGZxVLPc1EkyIBOvkMC8meYLVcNSV7NylOczlokd2tl8TmA1RLy4/QMCjLEFVxq5kVn0qYvmvu/SwKkvJlGh6oJIoca4BAaTtlbAlr+W+9u0wmFKVZo3lmVSDeZAEKz55A==" })

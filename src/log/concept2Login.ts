import puppeteer, { Page } from "puppeteer"
import { cryptography } from "../lib/crypto"


interface ILogin {
  username: string
  password: string
  cleanup?: boolean
}

const loginConcept2 = async ({ username, password, cleanup = false }: ILogin) => {
  const decryptedPassword = cryptography.decrypt(password, process.env.SERVER_SECRET || ``)
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto("https://log.concept2.com/login")
  await page.waitForSelector(`#username`)
  await page.click(`#username`)
  await page.type(`#username`, username)
  await page.waitForSelector(`#password`)
  await page.click(`#password`)
  await page.type(`#password`, decryptedPassword)

await Promise.all([
      page.click("body > div.clean-outer-container > div > form > input.btn.btn-primary.btn-block"),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
]);
 
  // await page.waitForTimeout(5000)
  const el = await page.$(`body > div.clean-outer-container > div > form > div.form-errors`)
  if (!el) {
    if (cleanup) {
      await browser.close()
    }
    return { success: true, page, browser }
  }
  const loginError = await page.evaluate(p => p.textContent, el);
  if (loginError.toLowerCase().includes(`incorrect`)) {
    console.log("login failed", username, decryptedPassword)
    if (cleanup) {
      await browser.close()
    }
    return { success: false, page, browser }
  }
  // validate login
  if (cleanup) {
    await browser.close()
  }
  return { success: true, page, browser }
  // await page.waitFor(5000)
  // await page.screenshot({ path: 'example.png' });
}

const logRow = async ({ distance, page }: { distance: string, page: Page }) => {
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
    (form) => form.submit()
  )
  return { success: true, page }
}

interface ILogRow extends ILogin {
  distance: string
}
const logConcept2Row = async ({ distance, username, password }: ILogRow) => {
  var { success, page, browser } = await loginConcept2({ username, password })
  // check if login successfull
  if (!success) {
    await browser.close()
    return { loginSuccess: false, logSuccess: false }
  }
  var { success, page } = await logRow({ distance, page })
  // check if worked
  await browser.close()
  // if success return { status: "success" }
  return { loginSuccess: true, logSuccess: true }
}

export { logConcept2Row, loginConcept2 }
// loginConcept2({ username: "LawJolla", password: "2cjusRCieT8AtiOSeq3vVQtEQ/1zcY1V0VbUk98NxfLT215bGUT3tESJ5T6CCOCptf1ncrpf/lXsG0+B04Af442k5oEjqxnWxMbVSVaC3w3X4XupdMHuJjxPL+8WPcjQu/DPc7ALa3L1JA==" })

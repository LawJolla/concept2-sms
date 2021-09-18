import { Page } from "puppeteer";
import { loginConcept2 } from "./concept2Login";

const getTeamAffiliation = async ({ username, password }: { username: string, password: string }) => {
  try {
    const { page } = await loginConcept2({ username, password })
    await page.goto(`https://log.concept2.com/profile`)
    await page.waitForSelector(`body > div.container.default > div > main > section.content > p:nth-child(2) > a:nth-child(1)`)
    const team = await page.evaluate(() => {
      return {
        name: document.querySelector(`body > div.container.default > div > main > section.content > h2:nth-child(1)`)?.innerHTML,
        userProfile: document.querySelector(`body > div.container.default > div > main > section.content > p:nth-child(2) > a:nth-child(1)`)?.getAttribute(`href`)?.split(`/`)?.[4],
        teamName: "Milo Fitness Factory",
        // teamName: document.querySelector(`body > div.container.default > div > main > section.content > p:nth-child(3) > a:nth-child(9)`)?.innerHTML,
        teamLink: "https://log.concept2.com/team/10547"
        // teamLink: document.querySelector(`body > div.container.default > div > main > section.content > p:nth-child(3) > a:nth-child(9)`)?.getAttribute("href")
      }
    })
    return team
  } catch (e) {
    console.log(`[getTeamAffiliation]`, e)
  }
}

// const test = async () => {
//   const team = await getTeamAffiliation({ username: "LawJolla", password: "ilovecato1" })
//   console.log("team", team)
// }

// test()
export default getTeamAffiliation
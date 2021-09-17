import puppeteer, { Page } from "puppeteer"

const individualStats = async ({ name, teamLink, teamName }: { name: string, teamLink: string, teamName: string }) => {
  let browser
  try {
    browser = await puppeteer.launch({
      args: ["--disable-setuid-sandbox"],
      'ignoreHTTPSErrors': true
    })
    const page = await browser.newPage()
    await page.goto(teamLink)
    await page.waitForSelector(`body > div.container.default > div > main > section.content > table > tbody`, { timeout: 2000 })
    // @ts-ignore
    // let bodyHTML = await page.evaluate(() => document?.body?.innerHTML);
    // console.log(bodyHTML)
    const rowers: { rank: string, name: string, distance: string }[] = await page.$$eval('body > div.container.default > div > main > section.content > table > tbody tr', trs => trs.map((tr) => {
      const tds = tr.querySelectorAll("td")
      return {
        rank: tds[0].innerHTML,
        name: tds[1]?.querySelector("a")?.innerHTML,
        distance: tds[5].innerHTML,
      }
    }));
    const user = rowers.find(r => r.name === name)
    const text = `At ${teamName} you are 🚣‍♀️ number ${user?.rank} with ${user?.distance}\n\n${rowers.slice(0, 10).map(r => `${r.rank}. ${r.distance}, ${r.name}`).join("\n")}\n🚣‍♀️🚣‍♀️🚣‍♀️`
    await browser?.close()
    return { rowers, user, text }
  } catch (e) {
    console.log(e)
    await browser?.close()
  }
}

// individualStats({ name: "Dennis Walsh", teamLink: "https://log.concept2.com/team/10547/ftc/2022", teamName: "Milo" })
export default individualStats
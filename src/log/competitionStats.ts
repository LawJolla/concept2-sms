import ordinal from "ordinal"
import puppeteer, { Page } from "puppeteer"

const competitionStats = async ({ team }: { team: string }) => {
  let browser
  try {
    browser = await puppeteer.launch({
      args: ["--disable-setuid-sandbox"],
      'ignoreHTTPSErrors': true
    })
    const page = await browser.newPage()
    await page.goto("https://log.concept2.com/challenges/ftc/2022/teams?type=&subtype=all&size=all")

    await page.waitForSelector(`body > div.container.default > div > main > section.content > table > tbody`, { timeout: 10000 })
    // @ts-ignore
    // let bodyHTML = await page.evaluate(() => document?.body?.innerHTML);
    // console.log(bodyHTML)
    const teams: { rank: string, name: string, distance: string, type: string }[] = await page.$$eval('body > div.container.default > div > main > section.content > table > tbody tr', trs => trs.map((tr) => {
      const tds = tr.querySelectorAll("td")
      return {
        rank: tds[0].innerHTML,
        name: tds[1]?.querySelector("a")?.innerHTML,
        type: tds[2].innerHTML,
        distance: tds[3].innerHTML,
      }
    }));
    const t = teams.find(r => r.name === team)
    await page.goto(`https://log.concept2.com/challenges/ftc/2022/teams?type=${t?.type.split(`/`)[0].toLowerCase()}&subtype=all&size=all`)
    await page.waitForSelector(`body > div.container.default > div > main > section.content > table > tbody`, { timeout: 10000 })
    // @ts-ignore
    // let bodyHTML = await page.evaluate(() => document?.body?.innerHTML);
    // console.log(bodyHTML)
    const teamsByType: { rank: string, name: string, distance: string, type: string }[] = await page.$$eval('body > div.container.default > div > main > section.content > table > tbody tr', trs => trs.map((tr) => {
      const tds = tr.querySelectorAll("td")
      return {
        rank: tds[0].innerHTML,
        name: tds[1]?.querySelector("a")?.innerHTML,
        type: tds[2].innerHTML,
        distance: tds[3].innerHTML,
      }
    }));
    // await browser?.close()

    const x = {
      top5: teams.splice(0, 5),
      team: t,
      teamInType: teamsByType.find(t => t.name === team),
      top5ByType: teamsByType.splice(0, 5),

    }

    const text = `We are ${x.team?.rank && ordinal(Number(x.team?.rank))} overall and ${x.teamInType?.rank && ordinal(Number(x.teamInType?.rank))} in the ${x.teamInType?.type} group with ${x.team?.distance}
    \n\nTop 5 in ${x.teamInType?.type}\n${x.top5ByType.map(t => `${t.rank}. ${t.distance}, ${t.name}`).join("\n")}
    `
    return { data: x, text }
  } catch (e) {
    console.log("[competitionStats]", e)
    await browser?.close()
  }
}

// competitionStats({ team: "Milo Fitness Factory" })
export default competitionStats
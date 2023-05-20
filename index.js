const puppeteer = require('puppeteer');

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time)
  });
}

async function searchFor(page) {
  await delay(5000);

  // Scrape the class openings
  const panels = await page.$$('div.panel');
  let openings = [];
  for (var p of panels) {
    await p.click();
    await delay(2000);
    // Scrape the class openings
    openings = openings.concat(await p.$$eval('.class-row', (groups) => {
      return groups
        .map((group) => {
          const lessonName = group.querySelector('h4').textContent.trim();
          const lessonDate = Array.from(group.querySelectorAll('b')).find(
            b => b.textContent.trim() == "Class Date").parentElement.textContent;
          const lessonSlot = group.querySelector('div.col-xs-5').textContent.trim();
          const hours = group.querySelector('table.table_sched tbody').
            textContent.replaceAll('X', ' ').trim();
          return { lessonName, lessonDate, hours, lessonSlot };
        });
    }));
    await p.click();
  }
  return openings;
}

const { SNS } = require("@aws-sdk/client-sns");

// Your SNS topic ARN
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

const sns = new SNS({ apiVersion: '2010-03-31' });

async function sendNotificationToSnsTopic(topicArn, message) {
  try {
    const params = {
      Message: message,
      TopicArn: topicArn,
    };

    const result = await sns.publish(params);
    console.log('Notification sent to SNS topic:', result.MessageId);
  } catch (error) {
    console.error('Error sending notification to SNS topic:', error);
  }
}

async function main() {
  // Launch the browser and open a new page
  const browser = await puppeteer.launch({
    headless: "new"
  });
  const page = await browser.newPage();
  // Forward console messages from the browser page to the terminal
  page.on('console', (message) => {
    console.log('Browser console:', message.text());
  });

  // Navigate to the website
  const url = 'https://www.teamunify.com/team/pnsgac/page/lesson-registration';
  await page.goto(url);

  // Click on the h4 tag with the specified text content
  let openings = await searchFor(page)
  await delay(1000);
  // Close the browser
  await browser.close();
  openings = openings.filter(o => o && o.lessonSlot != '0 Slots Open');

  // Check if there are any class openings
  if (openings.length > 0) {
    // Prepare the notification content
    const message = openings
      .map((opening) => `${JSON.stringify(opening, null, 4)}`)
      .join('\n');

    // Send the notification to the SNS topic
    await sendNotificationToSnsTopic(SNS_TOPIC_ARN, `Class openings:\n${message}`);
  } else {
    console.log('No class openings found.');
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

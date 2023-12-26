const functions = require("firebase-functions");
const axios = require("axios");
const { Configuration, OpenAIApi } = require("openai");
const moment = require("moment");

const LINE_MESSAGING_API = "https://api.line.me/v2/bot";
const LINE_HEADER = {
    "Content-Type": "application/json",
    Authorization: "Bearer t8cQtU91CzypTOrdaOS3cLjiZADN+SEic7qmglUOunS8rqukKFUJudIr8VCuHt2RUBpZk9yyyG3G/skXjcFOSSB3xd0Wrr/4I0XVy9bgqmJQbz2LWfPZkEsDcMuBQrwXzRqxajwuIvteDqWIo2idjQdB04t89/1O/w1cDnyilFU=",
};

const configuration = new Configuration({
    apiKey: "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",
});
const openai = new OpenAIApi(configuration);

exports.LineWebhook = functions.region("asia-southeast1").https.onRequest(async (req, res) => {
    const events = req.body.events;
    for (const event of events) {
        if (event.source.type === "group" && event.type === "message" && event.message.type === "text") {
            const message = event.message.text;

            if (message.includes('อับดุลเอ้ย')) {
                const question = message.split(':')[1];
                const response = await openaiRequest(question);
                const payload = {
                    type: "text",
                    text: response,
                };
                await reply(event.replyToken, payload);
            } else if (
                message.includes('พักครั้งที่ 1') ||
                message.includes('พักครั้งที่ 2') ||
                message.includes('เข้างาน') ||
                message.includes('ออกงาน') ||
                message.includes('ห้องน้ำ') ||
                message.includes('สูบบุหรี่')
                message.includes('กลับมา')
            ) {
                const user = event.source.userId; // Assuming userId is available
                const timestamp = moment().format(); // Get current timestamp
                saveTime(user, timestamp);
                const response = 'บันทึกเวลาสำเร็จ';
                const payload = {
                    type: "text",
                    text: response,
                };
                await reply(event.replyToken, payload);
            }
        }
    }
    return res.end();
});

const openaiRequest = async (message) => {
    const completion = await openai.createChatCompletion({
        model: "gpt-4.0-turbo", // Use ChatGPT 4.0
        messages: [
            {
                role: "user",
                content: message,
            },
        ],
    });
    console.log(JSON.stringify(completion.data));
    return completion.data.choices[0].message.content;
}

const reply = async (replyToken, payload) => {
    await axios({
        method: "post",
        url: `${LINE_MESSAGING_API}/message/reply`,
        headers: LINE_HEADER,
        data: JSON.stringify({
            replyToken: replyToken,
            messages: [payload],
        }),
    });
};

const saveTime = (user, timestamp) => {
    // Implement your logic to save the user's timestamp (e.g., store in a database)
    console.log(`User ${user} timestamp: ${timestamp}`);
};

const functions = require('firebase-functions');
const request = require('request-promise');
const admin = require('firebase-admin');

admin.initializeApp();

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ZR0y9lYsqxNbbMVGWtyQ5yq5HnRDj4ugfrh6kG0F7DhsB2azRhJ2RhuuK7Hv15nhS9zeAx0tu8GJ+Y1BQu0cn9TjDSBA+SLuHLkJQy7UdEfQ22WD0oui4omQ649/GyGWfQaeBvHEdKu+KR6XhAZyygdB04t89/1O/w1cDnyilFU=', // Replace with your Line access token
};

const db = admin.firestore();

exports.LineBot = functions.https.onRequest(async (req, res) => {
  const events = req.body.events;

  if (!events || events.length === 0) {
    console.log('Invalid request or no events');
    return res.status(200).end();
  }

  try {
    await handleMessages(req.body);
    res.status(200).end();
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).end();
  }
});

let previousAction = null;

const handleMessages = async (body) => {
  const event = body.events[0];

  if (event.type === 'message' && event.message.type === 'text') {
    const messageText = event.message.text;
    const user = event.source.userId;
    const timestamp = Date.now();

    console.log('Received message:', messageText);

    if (messageText.includes('เข้างาน')) {
      console.log('Handling เข้างาน'); 
      await reply(event.replyToken, 'บันทึกสำเร็จ');

      // Save time_in of เข้างาน in the database
      await saveTime(user, 'getin', timestamp);
      previousAction = 'getin';
    } else if (messageText.includes('พักครั้งที่1')) {
      console.log('Handling พักครั้งที่1'); 

      // Save time_in of พักครั้งที่1 in the database
      await saveTime(user, 'break1', timestamp);
      await reply(event.replyToken, 'บันทึกเวลาสำเร็จ');
      previousAction = 'break1';
    } else if (messageText.includes('พักครั้งที่2')) {
      console.log('Handling พักครั้งที่2'); 

      await saveTime(user, 'break2', timestamp);
      await reply(event.replyToken, 'บันทึกเวลาสำเร็จ');
      previousAction = 'break2';
    } else if (messageText.includes('ห้องน้ำ+สูบบุหรี่')) {
      console.log('Handling ห้องน้ำ+สูบบุหรี่'); 

      await saveTime(user, 'freebreak', timestamp);
      await reply(event.replyToken, 'บันทึกเวลาสำเร็จ');
      previousAction = 'freebreak';
    } else if (messageText.includes('ออกงาน')) {
      console.log('Handling ออกงาน'); 

      await saveTime(user, 'getin', timestamp, true);
      await reply(event.replyToken, 'บันทึกเวลาสำเร็จ');
      previousAction = 'getin';
    } else if (messageText.includes('กลับมา') && previousAction) {
      console.log('Handling กลับมา'); 

      // Save time_out of the previous action and calculate sum
      await saveTime(user, previousAction, timestamp, true);
      await reply(event.replyToken, 'บันทึกเวลาสำเร็จ');
    }
  }
};


const reply = async (replyToken, text) => {
  await request({
    method: 'POST',
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [
        {
          type: 'text',
          text: text,
        },
      ],
    }),
  });
};

const saveTime = async (userId, collectionName, timestamp, isReturn) => {
  try {
    const formattedTime = new Date(timestamp);
    const dateString = formattedTime.toISOString().split('T')[0];

    const userRef = db.collection(dateString).doc(collectionName).collection(userId);

    // Check if there is an existing document
    const existingRecord = await userRef.get();

    if (existingRecord.docs.length > 0) {
      const data = existingRecord.docs[0].data();

      if (isReturn) {
        const timeOut = formattedTime.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
        const diffInMinutes = (formattedTime - data.time_in.toDate()) / (1000 * 60);

        await userRef.doc(existingRecord.docs[0].id).update({
          time_out: formattedTime,
          sum: diffInMinutes,
        });
      } else {
        // Update the existing document with a new time_in
        await userRef.doc(existingRecord.docs[0].id).update({
          time_in: formattedTime,
        });
      }
    } else {
      // Create a new document with time_in
      await userRef.add({
        time_in: formattedTime,
        sum: 0, // Initialize sum to 0
      });
    }
  } catch (error) {
    console.error('Error saving time to Firestore:', error);
  }
};

import admin from "firebase-admin";
import {JSONFilePreset} from "lowdb/node";

const mainDb = await JSONFilePreset('mainDb.json', {})

export default function sendNotificaiton(title, body, data) {
    if (mainDb && mainDb.data["notificationToken"]) {
        const message = {
            notification: {
                title: title,
                body: body
            },
            data: data,
            token: mainDb.data["notificationToken"]
        };

        admin.messaging().send(message)
            .then((response) => {
                // Response is a message ID string.
                console.log('Successfully sent message:', response);
            })
            .catch((error) => {
                console.log('Error sending message:', error);
            });
    }
}

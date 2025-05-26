import admin from "firebase-admin";
import {JSONFilePreset} from "lowdb/node";

const mainDb = await JSONFilePreset('mainDb.json', {})

export default function sendNotificaiton(title, body, data) {
    if (mainDb && mainDb.data && mainDb.data["notificationToken"]) {
        fetch('http://localhost:5000/sendNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({title: title, body: body, token: mainDb.data.notificationToken}),
        });
    }
}

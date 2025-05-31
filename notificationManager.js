import {JSONFilePreset} from "lowdb/node";

const mainDb = await JSONFilePreset('mainDb.json', {})

export default function sendNotificaiton(title, body, data) {
    if (mainDb && mainDb.data && mainDb.data["notificationToken"]) {
        fetch('https://snapremote-notification-1.onrender.com/sendNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({title: title, body: body, token: mainDb.data.notificationToken}),
        });
    }
}

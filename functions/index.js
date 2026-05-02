const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();
const db = admin.firestore();

const resend = new Resend("YOUR_API_KEY");

async function sendEmail(to, html) {
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject: "Reservation Update",
    html
  });
}

function reminderEmail(data) {
  return `<h2>Reminder</h2><p>Your reservation is still active.</p>`;
}

function warningEmail(data) {
  return `<h2>Warning</h2><p>Only 2 hours left.</p>`;
}

exports.runAutomationChecks = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async () => {

    const snapshot = await db.collection("products").get();
    const now = Date.now();

    for (const doc of snapshot.docs) {
      const data = doc.data();

      if (data.status === "reserved" && !data.reminderSent && now >= data.reminderAt) {
        await sendEmail(data.reservedBy, reminderEmail(data));
        await doc.ref.update({ reminderSent: true });
      }

      if (data.status === "reserved" && !data.warningSent && now >= data.warningAt) {
        await sendEmail(data.reservedBy, warningEmail(data));
        await doc.ref.update({ warningSent: true });
      }

      if (data.status === "reserved" && now >= data.reservedUntil) {
        await doc.ref.update({
          status: "available",
          reservedUntil: 0,
          reservedBy: "",
          reminderSent: false,
          warningSent: false
        });
      }
    }

    return null;
  });

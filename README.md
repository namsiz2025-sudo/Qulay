# Qulay

```python
from flask import Flask, request
import requests
import os

app = Flask(_name_)

TOKEN = os.getenv("WA_TOKEN")
PHONE_ID = os.getenv("PHONE_ID")
VERIFY = os.getenv("VERIFY_TOKEN")
VERSION = os.getenv("GRAPH_VERSION", "v23.0")

@app.route("/webhook", methods=["GET"])
def verify():
    if request.args.get("hub.verify_token") == VERIFY:
        return request.args.get("hub.challenge", ""), 200
    return "Unauthorized", 403

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.get_json(silent=True) or {}

    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            messages = change.get("value", {}).get("messages", [])

            for msg in messages:
                user = msg.get("from")
                if not user:
                    continue

                reply = (
                    "ئەسسالامۇ ئەلەيكۇم! 🌹\n"
                    "قۇلاي تور سودىسىغا خۇش كەپسىز!\n\n"
                    "1️⃣ مەھسۇلاتلار\n"
                    "2️⃣ زاكاز قىلىش\n"
                    "3️⃣ خېرىدارلار مۇلازىمىتى"
                )

                url = (
                    f"https://graph.facebook.com/"
                    f"{VERSION}/{PHONE_ID}/messages"
                )

                requests.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {TOKEN}"
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "to": user,
                        "type": "text",
                        "text": {"body": reply}
                    },
                    timeout=15
                )

    return "OK", 200

if _name_ == "_main_":
    app.run()
```

تاماملانغاندىن كېيىن ماڭا *«بولدى»* دەپ يېزىڭ.

كېيىنكى قەدەمدە `requirements.txt` ھۆججىتىنى قۇرىمىز. ❤️

⚠️ API Token نى ھېچكىمگە ئەۋەتمەڭ.

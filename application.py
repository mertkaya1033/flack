import os

from flask import Flask, session, render_template, request, jsonify, redirect, \
    url_for
from flask_session import Session
from flask_socketio import SocketIO, emit
from datetime import datetime

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# Configure session to use filesystem
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)
chat = {"general": [], "hello": []}


@app.route("/")
def index():
    if session.get("channelName") is None:
        session["channelName"] = "general"

    if session.get("username") != "" and session.get("username") is not None:
        return render_template("index.html")

    return render_template("signin.html")


@app.route("/signin", methods=["POST"])
def signin():
    session["username"] = request.form.get("username")
    return redirect(url_for("index"))


@socketio.on("send")
def send(data):
    chat[data["channelName"]].append(
        {"sender": data["sender"], "message": data["message"],
         "sentAt": str(datetime.now().strftime("%H:%M:%S"))})
    if len(chat[data["channelName"]]) > 100:
        chat[data["channelName"]].pop(0)

    dataSent = {"channelName": data["channelName"], "sender": data["sender"],
                "message": data["message"],
                "sentAt": str(datetime.now().strftime("%H:%M"))}

    emit("update-channel", dataSent, broadcast=True)


@app.route("/open", methods=["POST"])
def open():
    data = {"username": session["username"],
            "chat": chat[session["channelName"]],
            "channelName": session["channelName"],
            "channels": list(chat.keys())}
    return jsonify(data)


@socketio.on("create-channel")
def channel_creation(data):
    if data["channelName"] not in chat.keys() and data["channelName"] != "":
        chat[data["channelName"]] = []
        emit("channel-creation", data, broadcast=True)


@app.route("/switch-channel", methods=["POST"])
def switch_channel():
    session["channelName"] = request.form.get("channelName")
    data = {"username": session["username"],
            "chat": chat[session["channelName"]],
            "channelName": session["channelName"],
            "channels": list(chat.keys())}
    return jsonify(data)


@app.route("/logout", methods=["POST"])
def logout():
    session["username"] = ""
    session["channelName"] = "general"
    return redirect(url_for("index"))

const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 直接把网页发给浏览器
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>一体化局域网聊天室</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 20px auto; padding: 10px; }
        #chat-box { border: 1px solid #ccc; height: 350px; overflow-y: scroll; padding: 10px; margin-bottom: 10px; background: #f9f9f9; border-radius: 5px; }
        .system-msg { color: gray; font-size: 0.9em; font-style: italic; }
        .my-msg { color: blue; font-weight: bold; }
        .other-msg { color: black; }
        #input-area { display: flex; }
        #message-input { flex: 1; padding: 10px; font-size: 16px; }
        button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h2>💬 局域网聊天室</h2>
      <div id="chat-box"></div>
      <div id="input-area">
        <input type="text" id="message-input" placeholder="输入消息..." autocomplete="off" />
        <button id="send-btn">发送</button>
      </div>

      <script>
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const socket = new WebSocket(protocol + window.location.host);

        const chatBox = document.getElementById("chat-box");
        const input = document.getElementById("message-input");
        const btn = document.getElementById("send-btn");

        socket.onmessage = (event) => {
          const div = document.createElement("div");
          const data = JSON.parse(event.data);
          
          if (data.type === "system") {
            div.className = "system-msg";
            div.textContent = '[系统] ' + data.message;
          } else {
            div.className = data.isMe ? "my-msg" : "other-msg";
            div.textContent = data.from + ': ' + data.text;
          }
          
          chatBox.appendChild(div);
          chatBox.scrollTop = chatBox.scrollHeight;
        };

        function send() {
          const msg = input.value.trim();
          if (msg) {
            socket.send(msg);
            input.value = "";
          }
        }
        btn.onclick = send;
        input.addEventListener("keypress", (e) => { if (e.key === "Enter") send(); });
      </script>
    </body>
    </html>
  `);
});

// WebSocket 聊天逻辑
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  
  broadcast(JSON.stringify({ type: 'system', message: `新用户 ${ip} 加入聊天室` }));

  ws.on('message', (data) => {
    ws.send(JSON.stringify({ type: 'message', from: '我', text: data.toString(), isMe: true }));
    broadcast(JSON.stringify({ type: 'message', from: ip, text: data.toString(), isMe: false }), ws);
  });

  ws.on('close', () => {
    broadcast(JSON.stringify({ type: 'system', message: `用户 ${ip} 离开了聊天室` }));
  });
});

function broadcast(data, excludeSocket = null) {
  wss.clients.forEach((client) => {
    if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// 监听 3000 端口
server.listen(3000, '0.0.0.0', () => {
  console.log('=================================');
  console.log('🚀 服务已启动！');
  console.log('本机访问: http://localhost:3000');
  console.log('局域网访问: http://你的局域网IP:3000');
  console.log('=================================');
});
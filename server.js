const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve the install script directly at the root for a cleaner command:
// curl -sSL https://your-url.onrender.com | bash
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(path.join(__dirname, 'install.sh'));
});

// Keep /install.sh for compatibility
app.get('/install.sh', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(path.join(__dirname, 'install.sh'));
});

// Moved landing page to /welcome
app.get('/welcome', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ClawGate | OpenClaw Security</title>
            <style>
                body { background: #050505; color: #00ff9d; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .box { border: 1px solid #00ff9d; padding: 2rem; border-radius: 8px; box-shadow: 0 0 20px rgba(0, 255, 157, 0.2); }
                code { color: #fff; background: #222; padding: 0.5rem; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class="box">
                <h1>🛡️ ClawGate</h1>
                <p>Run the command below to install the OpenClaw security gate:</p>
                <code>curl -sSL https://clawgate-dist-x17i.onrender.com | bash</code>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`ClawGate distribution server running on port ${PORT}`);
});

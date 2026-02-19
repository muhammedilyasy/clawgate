import * as http from 'http';

// The following objects are provided by the OpenClaw runtime environment.
declare const api: any;
declare const browser: any;
declare const shell: any;
import * as fs from 'fs';
import * as path from 'path';
import { Server } from 'socket.io';
import { exec } from 'child_process';

const DANGEROUS_COMMANDS = [/rm\s/, /sudo\s/, /chmod\s/, /mkfs\s/, /mv\s.*\/dev\/null/];
const CHALLENGE_KEYWORDS = ['captcha', '2fa', 'verify your identity', 'security check'];

export const before_tool_call: any = async (context: any) => {
    const { toolName, args } = context;

    let shouldPause = false;
    let reason = '';
    let interceptedInfo = '';

    if (toolName === 'bash' && typeof args.command === 'string') {
        const isDangerous = DANGEROUS_COMMANDS.some(regex => regex.test(args.command));
        if (isDangerous) {
            shouldPause = true;
            reason = 'Dangerous Command Detected';
            interceptedInfo = args.command;
        }
    }

    if (!shouldPause && (toolName.includes('browser') || toolName.includes('page'))) {
        const state = await browser.getState();
        const hasChallenge = CHALLENGE_KEYWORDS.some(kw => state.title?.toLowerCase().includes(kw) || state.url?.toLowerCase().includes(kw));
        if (hasChallenge) {
            shouldPause = true;
            reason = 'Security Challenge Detected';
            interceptedInfo = `URL: ${state.url}`;
        }
    }

    if (shouldPause) {
        return await enterPauseState(reason, interceptedInfo, context);
    }

    return { status: 'continue' };
};

async function enterPauseState(reason: string, info: string, context: any) {
    const port = 3000 + Math.floor(Math.random() * 1000);

    const server = http.createServer((req, res) => {
        const indexPath = path.join(__dirname, 'index.html');
        fs.readFile(indexPath, (err, data) => {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    });

    const io = new Server(server);
    server.listen(port);

    // Quick Tunnel
    const tunnelProcess = exec(`cloudflared tunnel --url http://localhost:${port}`);
    const tunnelUrl = await resolveTunnelUrl(tunnelProcess);

    await api.notify({
        title: `🛡️ ClawGate: ${reason}`,
        message: `A security gate has been triggered.\n\nCommand/Page: ${info}\n\nAccess Gateway: ${tunnelUrl}`,
        priority: 'high'
    });

    // Streaming logic
    const screencastCleanup = await browser.startScreencast((frame) => {
        io.emit('streamFrame', frame.data);
    });

    return new Promise((resolve) => {
        io.on('connection', (socket) => {
            socket.emit('init', { reason, command: info });

            socket.on('mouseClick', async (pos) => {
                await browser.click(pos.x, pos.y);
            });

            socket.on('approve', () => {
                cleanup(server, tunnelProcess, screencastCleanup);
                resolve({ status: 'continue' });
            });

            socket.on('terminate', () => {
                cleanup(server, tunnelProcess, screencastCleanup);
                resolve({ status: 'abort', reason: 'Terminated by user via ClawGate.' });
            });
        });
    });
}

function resolveTunnelUrl(proc: any): Promise<string> {
    return new Promise((resolve) => {
        proc.stderr.on('data', (data: string) => {
            const match = data.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
            if (match) resolve(match[0]);
        });
        // Fallback if not caught immediately
        setTimeout(() => resolve('Checking cloudflared logs...'), 5000);
    });
}

function cleanup(server: any, tunnel: any, screencast: any) {
    server.close();
    tunnel.kill();
    if (screencast) screencast();
}

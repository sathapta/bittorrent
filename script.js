// State variables
let currentMode = 'leeching'; // 'leeching' or 'seeding'
let solutions = { pcp: false, vpn: false, utp: false, tunnel: false };
let isConnectable = false;

// DOM Elements
const modeInputs = document.querySelectorAll('input[name="flowMode"]');
const toggles = document.querySelectorAll('.solution-toggle');
const speedDisplay = document.getElementById('speed-display');
const perfStatus = document.getElementById('perf-status');
const connStatus = document.getElementById('conn-status');
const terminalLog = document.getElementById('terminal-log');
const actionDesc = document.getElementById('action-desc');
const modeInfo = document.getElementById('mode-info');
const linesLayer = document.getElementById('lines-layer');
const packetsContainer = document.getElementById('packets-container');
const dropZone = document.getElementById('drop-zone');
const mappingBadge = document.getElementById('mapping-badge');

// Nodes
const nodeClient = document.getElementById('node-client');
const nodeRouter = document.getElementById('node-router');
const nodeGateway = document.getElementById('node-gateway');
const nodeRemote = document.getElementById('node-remote');
const nodeVPN = document.getElementById('node-vpn');

// Coordinates for nodes (calculated dynamically)
let nodeCoords = {};

// Chart.js Gauge
let gaugeChart;

function initGauge() {
    const ctx = document.getElementById('speedChart').getContext('2d');
    gaugeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [1.8, 48.2], // Value, Remainder (Max: 50)
                backgroundColor: ['#ef4444', '#1e293b'],
                borderWidth: 0,
                cutout: '80%',
                rotation: -135,
                circumference: 270,
                borderRadius: [4, 0]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { tooltip: { enabled: false } },
            animation: {
                animateScale: false,
                animateRotate: true,
                duration: 800,
                easing: 'easeOutCubic'
            }
        }
    });
}

function updateGauge(value, colorStr) {
    if (!gaugeChart) return;
    const max = 50;
    const remainder = max - value;
    let color = '#ef4444'; // red
    if (colorStr === 'green') color = '#10b981';
    else if (colorStr === 'blue') color = '#3b82f6';

    gaugeChart.data.datasets[0].data = [value, remainder];
    gaugeChart.data.datasets[0].backgroundColor[0] = color;
    gaugeChart.update();

    // Animate numbers
    animateValue(speedDisplay, parseFloat(speedDisplay.innerText), value, 800);
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = (progress * (end - start) + start).toFixed(1);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Log System
function addLog(msg, type = 'info') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 });
    const logEl = document.createElement('div');
    logEl.className = 'log-entry';

    let msgClass = '';
    if (type === 'error') msgClass = 'log-msg-error';
    if (type === 'success') msgClass = 'log-msg-success';
    if (type === 'info') msgClass = 'log-msg-info';

    logEl.innerHTML = `
        <span class="log-time">[${timeStr}]</span>
        <span class="log-src">DAEMON</span>
        <span class="${msgClass}">${msg}</span>
    `;
    terminalLog.prepend(logEl);

    // Keep max 20 logs
    if (terminalLog.children.length > 20) {
        terminalLog.removeChild(terminalLog.lastChild);
    }
}

// Initialization and Event Listeners
function init() {
    initGauge();
    cacheNodeCoords();
    window.addEventListener('resize', () => {
        cacheNodeCoords();
        drawTopology();
    });

    modeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            currentMode = e.target.value;
            updateSimulation();
        });
    });

    toggles.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const id = e.target.id.replace('toggle-', '');
            // Only one active solutiion for simplicity, unless it's combinations. Let's make it radio-like behavior for solutions for clearer demo.
            if (e.target.checked) {
                toggles.forEach(t => { if (t !== e.target) t.checked = false; });
                Object.keys(solutions).forEach(k => solutions[k] = false);
            }
            solutions[id] = e.target.checked;

            // Highlight active container
            document.querySelectorAll('.toggle-item').forEach(item => item.classList.remove('active'));
            if (e.target.checked) {
                e.target.closest('.toggle-item').classList.add('active');
            }

            updateSimulation();
        });
    });

    // Start Simulation loop
    updateSimulation();
    setInterval(spawnPacket, 1200);
}

function cacheNodeCoords() {
    const rectClient = nodeClient.getBoundingClientRect();
    const rectRouter = nodeRouter.getBoundingClientRect();
    const rectGateway = nodeGateway.getBoundingClientRect();
    const rectRemote = nodeRemote.getBoundingClientRect();
    const rectVPN = nodeVPN.getBoundingClientRect();
    const containerRect = document.getElementById('topology-area').getBoundingClientRect();

    const getCenter = (rect) => ({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2
    });

    nodeCoords = {
        client: getCenter(rectClient),
        router: getCenter(rectRouter),
        gateway: getCenter(rectGateway),
        remote: getCenter(rectRemote),
        vpn: getCenter(rectVPN)
    };
}

function createPathStr(p1, p2, curveOffset = 0) {
    if (curveOffset === 0) {
        return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    }
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2 - curveOffset;
    return `M ${p1.x} ${p1.y} Q ${midX} ${midY} ${p2.x} ${p2.y}`;
}

function drawTopology() {
    linesLayer.innerHTML = ''; // Keep defs out or re-render them
    linesLayer.innerHTML = `
        <defs>
            <marker id="arrow-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
            <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
            </marker>
        </defs>
    `;

    const addLine = (p1, p2, colorCls, markerId, curve = 0) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", createPathStr(nodeCoords[p1], nodeCoords[p2], curve));
        path.setAttribute("class", `connection-path ${colorCls}`);
        if (markerId) path.setAttribute("marker-start", `url(#${markerId})`);
        linesLayer.appendChild(path);
    };

    // Base connections
    addLine('client', 'router', 'path-blue', '', 0);

    // Depending on state
    if (solutions.vpn || solutions.tunnel) {
        addLine('router', 'gateway', 'path-green', '', 0);
        addLine('gateway', 'vpn', 'path-green', '', 50);
        addLine('vpn', 'remote', 'path-green', '', 0);
    } else {
        if (currentMode === 'leeching') {
            addLine('router', 'gateway', 'path-blue', '', 0);
            addLine('gateway', 'remote', 'path-blue', '', 0);
        } else {
            // Seeding inbound
            addLine('remote', 'gateway', isConnectable ? 'path-green' : 'path-red', '', 0);
            if (isConnectable) {
                addLine('gateway', 'router', 'path-green', '', 0);
            }
        }
    }
}

// Update the entire view based on state
function updateSimulation() {
    isConnectable = solutions.pcp || solutions.vpn || solutions.utp || solutions.tunnel;

    if (solutions.vpn || solutions.tunnel) {
        nodeVPN.classList.remove('hidden');
    } else {
        nodeVPN.classList.add('hidden');
    }

    if (solutions.pcp) {
        document.getElementById('pcp-cgnat-badge').classList.remove('hidden');
        document.getElementById('pcp-router-badge').classList.remove('hidden');
    } else {
        document.getElementById('pcp-cgnat-badge').classList.add('hidden');
        document.getElementById('pcp-router-badge').classList.add('hidden');
    }

    if (solutions.utp) {
        document.getElementById('utp-badge').classList.remove('hidden');
    } else {
        document.getElementById('utp-badge').classList.add('hidden');
    }

    if (solutions.tunnel) {
        document.getElementById('tun-badge').classList.remove('hidden');
    } else {
        document.getElementById('tun-badge').classList.add('hidden');
    }

    if (currentMode === 'leeching') {
        modeInfo.innerHTML = `<strong>Initiating Outbound Connections</strong><br>The NAT444 client sends an outbound request to a remote Seed. An implicit dynamic mapping allows return traffic.`;
        actionDesc.innerHTML = `Outbound requests pass through NAT444 easily. Implicit mappings allow return packets. Speed is decent but rely on active peers.`;
        dropZone.classList.add('hidden');
        mappingBadge.classList.remove('hidden');

        connStatus.innerHTML = '<i class="fa-solid fa-arrow-right-arrow-left"></i> OUTBOUND ACTIVE';
        connStatus.className = 'status-badge badge-connectable';
        connStatus.style.borderColor = '#3b82f6';
        connStatus.style.color = '#3b82f6';
        connStatus.style.background = 'rgba(59, 130, 246, 0.15)';

        updateGauge(25.5, 'blue');
        perfStatus.innerText = 'Moderate Download Speeds (~25 MiB/s). Dependent on remote seeds having open ports.';
        perfStatus.className = 'perf-status';
        perfStatus.style.color = '#3b82f6';
        perfStatus.style.background = 'rgba(59, 130, 246, 0.1)';

        addLog(`Leeching started. Local IP 192.168.1.5 -> Public IP 203.0.113.5`, 'info');

    } else { // Seeding
        mappingBadge.classList.add('hidden');
        if (!isConnectable) {
            modeInfo.innerHTML = `<strong>The "Not Connectable" Barrier</strong><br>Unsolicited inbound packets are dropped by default at the ISP Gateway (NAT444).`;
            actionDesc.innerHTML = `Incoming requests hit the CGNAT barrier and drop! Client is NOT connectable.`;
            dropZone.classList.remove('hidden');

            connStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> NOT CONNECTABLE';
            connStatus.className = 'status-badge badge-notconn';

            updateGauge(1.8, 'red');
            perfStatus.innerText = 'Severely Restricted Upload (~1.8 MiB/s). "The Silent Drop" disables passive incoming connections.';
            perfStatus.className = 'perf-status status-bad';

            addLog(`Inbound connection explicitly dropped by ISP NAT444 Gateway.`, 'error');
        } else {
            modeInfo.innerHTML = `<strong>Strategic Solution Active</strong><br>Barrier bypassed. Inbound connections are successfully routed to the client.`;
            actionDesc.innerHTML = `Barrier bypassed using <b>${getActiveSolutionName()}</b>. Incoming requests reach the client.`;
            dropZone.classList.add('hidden');

            connStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> CONNECTABLE';
            connStatus.className = 'status-badge badge-connectable';

            updateGauge(47.2, 'green');
            perfStatus.innerText = 'Optimal Performance (~47 MiB/s). Full bi-directional connectivity unlocked.';
            perfStatus.className = 'perf-status';
            perfStatus.style.color = '#10b981';
            perfStatus.style.background = 'rgba(16, 185, 129, 0.1)';

            addLog(`Successfully accepted inbound connection via ${getActiveSolutionName()}.`, 'success');
        }
    }

    cacheNodeCoords();
    drawTopology();
}

function getActiveSolutionName() {
    if (solutions.pcp) return 'Port Control Protocol (PCP)';
    if (solutions.vpn) return 'VPN Port Forwarding';
    if (solutions.utp) return 'uTP UDP hole punching (Simulated)';
    if (solutions.tunnel) return 'Reverse Tunneling (Relay)';
    return 'Magic';
}

// Packet Animation Factory
function spawnPacket() {
    cacheNodeCoords();
    const packet = document.createElement('div');
    packet.className = 'packet';

    // Determine path and color
    let path = [];
    let colorClass = 'bg-blue';

    if (currentMode === 'leeching') {
        path = ['client', 'router', 'gateway', 'remote'];
        if (solutions.vpn || solutions.tunnel) path = ['client', 'router', 'gateway', 'vpn', 'remote'];
        colorClass = 'bg-blue';
    } else {
        // Seeding
        if (!isConnectable) {
            path = ['remote', 'gateway']; // Drops at gateway
            colorClass = 'bg-red';
        } else {
            if (solutions.vpn || solutions.tunnel) {
                path = ['remote', 'vpn', 'gateway', 'router', 'client'];
            } else {
                path = ['remote', 'gateway', 'router', 'client'];
            }
            colorClass = 'bg-green';
        }
    }

    packet.classList.add(colorClass);
    packetsContainer.appendChild(packet);

    animatePacket(packet, path, 0);
}

function animatePacket(packet, path, stepIndex) {
    if (stepIndex >= path.length) {
        packet.remove();
        return;
    }

    const startNode = stepIndex === 0 ? path[0] : path[stepIndex];
    const targetNode = stepIndex === 0 ? path[0] : path[stepIndex]; // To skip the first immediate jump

    // Actual animation logic uses GSAP conceptually, but we write simple CSS transitions via JS
    if (stepIndex === 0) {
        packet.style.left = nodeCoords[startNode].x + 'px';
        packet.style.top = nodeCoords[startNode].y + 'px';
        setTimeout(() => animatePacket(packet, path, 1), 50); // Small delay to apply CSS
        return;
    }

    const duration = 600; // ms
    packet.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;
    packet.style.left = nodeCoords[path[stepIndex]].x + 'px';
    packet.style.top = nodeCoords[path[stepIndex]].y + 'px';

    setTimeout(() => {
        // Drop simulation logic
        if (currentMode === 'seeding' && !isConnectable && path[stepIndex] === 'gateway') {
            packet.classList.add('bg-red');
            packet.style.transition = 'transform 0.2s';
            packet.style.transform = 'translate(-50%, -50%) scale(2)';
            packet.style.opacity = '0';

            // Pulse drop zone
            dropZone.classList.remove('hidden');
            clearTimeout(dropZone.timeout);
            dropZone.timeout = setTimeout(() => dropZone.classList.add('hidden'), 500);

            setTimeout(() => packet.remove(), 200);
        } else {
            animatePacket(packet, path, stepIndex + 1);
        }
    }, duration);
}

// Wireshark Modal Elements
const wsModal = document.getElementById('wireshark-modal');
const wsModalContent = wsModal.querySelector('.modal-content');
const wsClose = document.getElementById('ws-close');
const wsPlayPause = document.getElementById('ws-play-pause');
const wsExpand = document.getElementById('ws-expand');
const wsInterface = document.getElementById('ws-interface');
const wsPackets = document.getElementById('ws-packets');
const wsDetails = document.getElementById('ws-details');

let wsActiveNode = null;
let wsInterval = null;
let wsIsPaused = false;
let wsIsFullscreen = false;
let wsPktCount = 0;

function openWireshark(nodeElement) {
    wsActiveNode = nodeElement.id.replace('node-', '');
    let interfaceName = 'eth0';
    if (wsActiveNode === 'client') interfaceName = '192.168.1.5 (Local)';
    else if (wsActiveNode === 'router') interfaceName = '100.64.0.10 (CGNAT Internal)';
    else if (wsActiveNode === 'gateway') interfaceName = '203.0.113.5 (ISP Public)';
    else if (wsActiveNode === 'remote') interfaceName = '198.51.100.2 (Remote Seed)';
    else if (wsActiveNode === 'vpn') interfaceName = 'tun0 (VPN Interface)';

    wsInterface.innerText = interfaceName;
    wsPackets.innerHTML = ''; // Clear old packets
    wsPktCount = 0;
    wsIsPaused = false;
    wsPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
    wsModal.classList.remove('hidden');

    if (wsInterval) clearInterval(wsInterval);
    wsInterval = setInterval(generateWSPacket, 800);
    generateWSPacket();
}

function closeWireshark() {
    wsModal.classList.add('hidden');
    if (wsInterval) clearInterval(wsInterval);
    wsActiveNode = null;
}

// Attach listeners to nodes
document.querySelectorAll('.node').forEach(node => {
    node.addEventListener('click', () => openWireshark(node));
});

// Expandable tree in Details Pane
document.querySelectorAll('.tree-line').forEach(line => {
    line.addEventListener('click', () => {
        const children = line.nextElementSibling;
        if (children && children.classList.contains('tree-children')) {
            children.classList.toggle('hidden');
            line.classList.toggle('expanded');
        }
    });
});

if (wsClose) wsClose.addEventListener('click', closeWireshark);
if (wsPlayPause) {
    wsPlayPause.addEventListener('click', () => {
        wsIsPaused = !wsIsPaused;
        wsPlayPause.innerHTML = wsIsPaused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
    });
}
if (wsExpand) {
    wsExpand.addEventListener('click', () => {
        wsIsFullscreen = !wsIsFullscreen;
        if (wsIsFullscreen) {
            wsModalContent.classList.add('fullscreen');
            wsExpand.innerHTML = '<i class="fa-solid fa-compress"></i>';
        } else {
            wsModalContent.classList.remove('fullscreen');
            wsExpand.innerHTML = '<i class="fa-solid fa-expand"></i>';
        }
    });
}

// WS Packet Generator
function generateWSPacket() {
    if (wsIsPaused || !wsActiveNode || wsModal.classList.contains('hidden')) return;

    wsPktCount++;
    const now = new Date();
    const timeStr = now.toISOString().split('T')[1].substring(0, 12);

    let src = '192.168.1.5';
    let dst = '198.51.100.2';
    let proto = 'TCP';
    let len = Math.floor(Math.random() * 1000) + 64;
    let info = '[SYN] Seq=0 Win=65535 Len=0';
    let pktClass = 'pkt-tcp';

    // Tailor packet based on mode and node
    if (currentMode === 'seeding') {
        src = '198.51.100.2';
        dst = '203.0.113.5';

        if (!isConnectable) {
            if (wsActiveNode === 'gateway') {
                pktClass = 'pkt-err';
                info = '[Dropped] Unsolicited Inbound Connection';
            } else if (wsActiveNode === 'client' || wsActiveNode === 'router') {
                wsPktCount--;
                return; // Client sees no incoming
            }
        } else {
            dst = '192.168.1.5'; // Assume mapped through
            if (solutions.utp) {
                proto = 'UDP';
                pktClass = 'pkt-udp';
                info = 'uTP ST_SYN Seq=1';
            } else {
                proto = 'BitTorrent';
                pktClass = 'pkt-bt';
                info = 'Handshake, Peer ID: -TR3000-';
            }
        }
    } else {
        if (solutions.utp) {
            proto = 'UDP';
            pktClass = 'pkt-udp';
            info = 'uTP DATA Seq=5 Ack=3';
        } else {
            proto = 'BitTorrent';
            pktClass = 'pkt-bt';
            info = 'Piece: 145, Length: 16384';
            len = 16384;
        }
    }

    const tr = document.createElement('tr');
    tr.className = `ws-row ${pktClass}`;
    tr.innerHTML = `
        <td>${wsPktCount}</td>
        <td>${timeStr}</td>
        <td>${src}</td>
        <td>${dst}</td>
        <td>${proto}</td>
        <td>${len}</td>
        <td>${info}</td>
    `;

    tr.addEventListener('click', () => {
        document.querySelectorAll('.ws-row').forEach(row => row.classList.remove('selected'));
        tr.classList.add('selected');

        const portSrc = Math.floor(Math.random() * 50000) + 1024;
        const portDst = proto === 'BitTorrent' ? 6881 : (Math.floor(Math.random() * 50000) + 1024);

        // Update details pane
        document.getElementById('ws-dt-len').innerText = len;
        document.getElementById('ws-dt-len2').innerText = len;
        const arrTime = new Date().toISOString();
        document.getElementById('ws-dt-arr').innerText = arrTime;
        document.getElementById('ws-dt-epoch').innerText = (Date.now() / 1000).toFixed(3);

        document.getElementById('ws-dt-ip-src').innerText = src;
        document.getElementById('ws-dt-ip-dst').innerText = dst;
        document.getElementById('ws-dt-ip-src2').innerText = src;
        document.getElementById('ws-dt-ip-dst2').innerText = dst;
        document.getElementById('ws-dt-iplen').innerText = len - 14; // Ethernet header

        let macSrc = '00:1A:2B:3C:4D:5E';
        let macDst = 'FF:FF:FF:FF:FF:FF';
        if (src === '192.168.1.5') macSrc = 'A1:B2:C3:D4:E5:F6';
        if (dst === '192.168.1.5') macDst = 'A1:B2:C3:D4:E5:F6';

        document.getElementById('ws-dt-mac-src').innerText = macSrc;
        document.getElementById('ws-dt-mac-dst').innerText = macDst;
        document.getElementById('ws-dt-mac-src2').innerText = macSrc;
        document.getElementById('ws-dt-mac-dst2').innerText = macDst;

        // Transport Layer specifics
        document.getElementById('ws-dt-proto').innerText = proto === 'UDP' ? 'User Datagram Protocol' : 'Transmission Control Protocol';
        document.getElementById('ws-dt-proto-num').innerText = proto === 'UDP' ? 'UDP (17)' : 'TCP (6)';
        document.getElementById('ws-dt-port-src').innerText = portSrc;
        document.getElementById('ws-dt-port-dst').innerText = portDst;
        document.getElementById('ws-dt-port-src2').innerText = portSrc;
        document.getElementById('ws-dt-port-dst2').innerText = portDst;

        // App layer
        const appNode = document.getElementById('ws-dt-app-node');
        if (proto === 'BitTorrent' || proto === 'UDP') {
            appNode.classList.remove('hidden');
            document.getElementById('ws-dt-app-proto').innerText = proto === 'UDP' ? 'uTorrent Transport Protocol' : 'BitTorrent Protocol';
            document.getElementById('ws-dt-msg').innerText = proto === 'UDP' ? 'ST_DATA' : 'Piece data';
            document.getElementById('ws-dt-paylen').innerText = len - 54; // Assume Headers
        } else {
            // TCP SYN, err etc
            appNode.classList.add('hidden');
        }
    });

    wsPackets.appendChild(tr);

    // Auto scroll and prune
    if (wsPackets.children.length > 50) {
        wsPackets.removeChild(wsPackets.firstChild);
    }
    const pane = document.querySelector('.packet-list-pane');
    if (pane) pane.scrollTop = pane.scrollHeight;
}

// Set up
document.addEventListener("DOMContentLoaded", init);

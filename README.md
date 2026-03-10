# BitTorrent NAT444/CGNAT Dashboard

An interactive, front-end only dashboard designed to visualize the complexities of BitTorrent Peer-to-Peer traffic traversing NAT444 (Carrier-Grade NAT) architectures. This project demonstrates how explicit and implicit port mappings affect inbound and outbound connectivity, detailing various traversal strategies.

## Features

- **Interactive Topology Diagram:** Visualizes the network components from a local client, through a customer router, to the ISP's CGNAT Gateway, and finally to a remote seed on the internet.
- **Traffic Simulation:** Generates continuous dummy packet animations across the topology map.
  - **Leeching Mode:** Demonstrates successful outbound connections utilizing implicit port mappings. 
  - **Seeding Mode:** Shows the default behavior of NAT444 aggressively dropping unsolicited incoming connections (The "Silent Drop").
- **Strategic Traversal Solutions:** Toggle to apply and visually simulate mechanisms used to bypass NAT restrictions:
  - **Port Control Protocol (PCP):** Explicitly request router and gateway mappings.
  - **VPN Port Forwarding:** Tunnel out to a server with a dedicated public IP address.
  - **uTorrent Transport Protocol (uTP):** Simulated UDP hole punching logic.
  - **Reverse Tunneling (TUN):** Relay inbound traffic via a middleman node (e.g. Pinggy/ngrok).
- **Wireshark Live Packet View Simulation:** Click on any node in the topology to open a simulated WireShark modal. It streams generated packets relevant to the selected interface and applies context-aware styling. Packet details are expandable.
- **Performance Impact Metrics:** A real-time gauge chart indicating potential bandwidth (MiB/s) constraints compared directly to symmetric connection capability.

## Technology Stack

- **HTML5 & CSS3** (Vanilla)
- **Vanilla JavaScript** (ES6+)
- **Chart.js** (Line/Gauge Chart rendering)
- **FontAwesome** (Icons)

## Setup & Running

This dashboard requires no backend or build step to run locally.

1. Clone or download the source code.
2. Open `index.html` in any modern web browser.
3. Use the control panel on the left to toggle between different states and solutions. Click on devices in the network view to inspect simulated ingress/egress packets.

## Directory Structure

```text
.
├── index.html       # Main application markup & UI structure
├── style.css        # Dashboard styling, dark theme variables, & animations
├── script.js        # Event listeners, simulation logic, & Wireshark generator
└── README.md        # Documentation
```

## Contributing

Designed as a standalone frontend showcase for networking concepts. Any direct stylistic or logical improvements can be PRed directly. Ensure all code changes maintain a vanilla JS/CSS footprint to keep the simulation zero-dependency capable.

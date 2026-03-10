# BitTorrent NAT444/CGNAT Dashboard

An interactive, premium front-end dashboard designed to visualize the complexities of BitTorrent Peer-to-Peer traffic traversing NAT444 (Carrier-Grade NAT) architectures. This project demonstrates how explicit and implicit port mappings affect inbound and outbound connectivity, detailing various traversal strategies through real-time simulation and deep-packet inspection mocks.

## Features

- **Interactive Topology Diagram:** Visualizes network nodes from a local client, through a customer router, to the ISP's CGNAT Gateway, and to a remote seed.
- **Context-Aware Visualizations:**
  - **PCP (Port Control Protocol):** Displays explicit port mapping badges at both the local router and the CGNAT gateway.
  - **uTP (uTorrent Transport):** Shows UDP Hole Punching status indicators to explain return traffic flow.
  - **Reverse Tunneling (TUN):** Dynamically inserts a Relay node into the traffic path with public endpoint tracking.
- **Traffic Simulation:**
  - **Leeching Mode:** Demonstrates successful outbound connections utilizing implicit dynamic mappings.
  - **Seeding Mode:** Shows how NAT444 "Silent Drops" unsolicited incoming connections, and how various solutions bypass this barrier.
- **Advanced Wireshark Mock:**
  - **Interactive Nodes:** Click any device (Client, Gateway, Relay, etc.) to view live traffic on that specific interface.
  - **Modern UI:** Features a sleek dark theme, live stream pause/play, and fullscreen expansion.
  - **Deep Inspection:** Protocol layers (Frame, Ethernet, IPv4, TCP/UDP, BitTorrent) are expandable to show detailed field values like TTL, Header Length, and Info Hashes.
- **Telemetry & Impact:** Real-time gauge tracking of effective bandwidth based on connectivity status.

## Technology Stack

- **HTML5 & CSS3:** Vanilla implementation with custom variables and glassmorphism effects.
- **Vanilla JavaScript:** State management, SVG topology rendering, and dynamic packet generation.
- **Chart.js:** Logic-driven gauge and performance visualization.
- **FontAwesome:** Rich iconography for network infrastructure.

## Setup & Running

This project is a standalone static application. No installation or backend is required.

1. Download the repository files.
2. Open `index.html` in a modern web browser.
3. Use the **Control Panel** to toggle traffic modes and connectivity solutions.
4. Interact with the **Network View** to inspect traffic via the simulated Wireshark tool.

## Directory Structure

```text
.
├── index.html       # Application structure and UI layout
├── style.css        # Premium dark theme, animations, and responsive styles
├── script.js        # Simulation logic, SVG rendering, and Wireshark engine
└── README.md        # Technical documentation
```

## Contributing

Designed as a high-fidelity educational tool for networking concepts. Contributions should maintain the zero-dependency, vanilla-focused approach to ensure maximum portability and performance.

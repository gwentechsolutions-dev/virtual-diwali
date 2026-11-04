# Development-build privacy

No selfies, face embeddings or third-party avatar requests are collected. The face-photo pipeline is not enabled. Firework playback does not request microphone permission.

Voice is optional and off on entry. Selecting **Join voice** requests browser microphone permission and sends your audio to other participants who joined voice in the same room using encrypted WebRTC connections. The application server relays connection setup messages, not microphone audio, and does not record audio. A configured TURN service can relay encrypted media when a direct connection is unavailable. WebRTC connections may disclose network addresses to peers and configured STUN/TURN services. Individual mute, microphone mute, voice volume and distance-based voice attenuation are available. Leaving voice, leaving the game or losing the room connection stops local microphone tracks. Browser permission settings remain under your control.

Your display name, selected type, outfit, position and gesture are shared with the participants in your room. Inventory and coin balance are sent only over your own room connection. Text chat is visible to current participants and held in browser memory; the application does not persist chat to disk.

A random 256-bit guest secret stays in localStorage under a room-specific key. The server stores its SHA-256 digest and matches that digest on rejoin. Treat an invitation as private: anyone with the invitation code can join unless the host has locked the room. Copying localStorage secrets to another browser copies that guest identity; use separate browser profiles for separate guests.

Room data is stored in private JSON records in `DATA_DIR`. Do not expose that directory over HTTP. Rooms expire after 24 hours. Expired records are removed at startup and by periodic cleanup; stopped servers cannot perform cleanup until restarted. Operator backups are outside application control and should have an explicit retention policy before public release. Ended rooms cannot be rejoined.

Google Fonts is an external font request and can disclose the visitor's IP address to Google. System fonts are available as a fallback. Self-host those font families if your deployment requires zero third-party requests.

Production must use HTTPS/WSS and `PUBLIC_ORIGIN`. Development HTTP is intended for localhost or a trusted local network. No service credentials are embedded in frontend code. No advertising, analytics or payments are configured.

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise l'aperçu depuis iPhone / autre appareil sur le réseau local :
  // sans cela, les chunks `/_next/*` renvoient 403 (Origin = IP LAN).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;

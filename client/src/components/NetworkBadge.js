import { Zap, Globe, Cloud } from "lucide-react";

export default function NetworkBadge({ type }) {
  if (!type) return null;

  const config = {
    host: {
      label: "Local Network",
      icon: <Zap size={14} />,
      color: "bg-green-100 text-green-700 border-green-200",
      description: "Direct WiFi (Fastest)",
    },
    srflx: {
      label: "Direct Internet",
      icon: <Globe size={14} />,
      color: "bg-blue-100 text-blue-700 border-blue-200",
      description: "P2P via Internet",
    },
    relay: {
      label: "Cloud Relay",
      icon: <Cloud size={14} />,
      color: "bg-orange-100 text-orange-700 border-orange-200",
      description: "Slow (via Server)",
    },
  };

  const current = config[type] || config.srflx;

  return (
    <div className={`flex flex-col items-center gap-1 animate-fade-in`}>
      <div
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${current.color}`}
      >
        {current.icon}
        {current.label}
      </div>
      <span className="text-[10px] text-gray-400 font-medium">
        {current.description}
      </span>
    </div>
  );
}

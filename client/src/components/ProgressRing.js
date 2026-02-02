export default function ProgressRing({ progress, size = 120 }) {
  const stroke = 8;
  const radius = size / 2 - stroke * 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={size} width={size} className="transform -rotate-90">
        <circle
          stroke="#334155" // gray-700
          strokeWidth={stroke}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke="#3b82f6" // blue-500
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="transition-all duration-300 ease-out"
        />
      </svg>
      <div className="absolute text-2xl font-bold text-white">{progress}%</div>
    </div>
  );
}


import React, { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  isActive: boolean;
  isModelSpeaking: boolean;
  volume: number; // 0 to 1
}

const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isActive, isModelSpeaking, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const particles: { x: number; y: number; size: number; speed: number; angle: number }[] = Array.from({ length: 12 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 20 + 10,
      speed: Math.random() * 0.5 + 0.2,
      angle: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Pulse background
      const baseRadius = 80 + (volume * 60);
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius);
      
      if (isModelSpeaking) {
        gradient.addColorStop(0, 'rgba(124, 58, 237, 0.4)');
        gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');
      } else if (isActive) {
        gradient.addColorStop(0, 'rgba(14, 165, 233, 0.4)');
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(75, 85, 99, 0.2)');
        gradient.addColorStop(1, 'rgba(75, 85, 99, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw "bubbles"
      particles.forEach((p, i) => {
        p.angle += p.speed * (isActive ? 1.5 : 1);
        const dist = 60 + volume * 40 + Math.sin(p.angle) * 20;
        const x = centerX + Math.cos(p.angle + i) * dist;
        const y = centerY + Math.sin(p.angle + i) * dist;

        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 + volume * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = isModelSpeaking ? 'rgba(139, 92, 246, 0.3)' : (isActive ? 'rgba(56, 189, 248, 0.3)' : 'rgba(156, 163, 175, 0.3)');
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, isModelSpeaking, volume]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64 md:w-96 md:h-96">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="w-full h-full"
      />
      <div className={`absolute inset-0 flex items-center justify-center`}>
        <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-white/20 flex items-center justify-center shadow-2xl transition-all duration-300 ${isActive ? 'scale-110 border-blue-400 shadow-blue-500/50' : 'scale-100'} ${isModelSpeaking ? 'border-purple-400 shadow-purple-500/50' : ''}`}>
          <div className={`w-24 h-24 md:w-40 md:h-40 rounded-full bg-gradient-to-tr ${isModelSpeaking ? 'from-purple-600 to-indigo-600' : 'from-blue-600 to-cyan-600'} flex items-center justify-center transition-all duration-500`}>
            <i className={`fas ${isModelSpeaking ? 'fa-volume-up' : (isActive ? 'fa-microphone' : 'fa-microphone-slash')} text-3xl md:text-5xl text-white`}></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceVisualizer;

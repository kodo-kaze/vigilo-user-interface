"use client";

import React, { useState, useEffect } from "react";
import {
  LiquidGlassCard,
  LiquidPill,
  LiquidInnerCard,
} from "@/src/components/ui";
import { NearestCameraData } from "@/src/hooks/useNearestCamera";

export interface PassengerStreamPlayerProps {
  camera: NearestCameraData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
  className?: string;
}

export default function PassengerStreamPlayer({
  camera,
  isLoading,
  error,
  onRefresh,
  className = "",
}: PassengerStreamPlayerProps) {
  const [streamError, setStreamError] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [useWebRtc, setUseWebRtc] = useState(false);

  // Reset stream error when camera changes
  useEffect(() => {
    setStreamError(false);
    setStreamKey((k) => k + 1);
  }, [camera?.cam_id]);

  const handleRetry = () => {
    setStreamError(false);
    setStreamKey((k) => k + 1);
    onRefresh?.();
  };

  const isMatched = Boolean(camera && camera.matched && camera.cam_id);
  const isCrowdAlert = Boolean(camera?.is_crowd || (camera?.crowd_probability || 0) >= 0.6);
  const isModerateCrowd = Boolean((camera?.crowd_probability || 0) >= 0.3 && !isCrowdAlert);
  const isCameraOnline = camera?.status === "ONLINE" || camera?.active;

  // Live MJPEG stream served securely through Geo Server reverse WebSocket relay
  const cloudMjpegUrl = camera?.cam_id
    ? `/api/geo/cameras/${camera.cam_id}/stream?t=${streamKey}`
    : `/video_feed?t=${streamKey}`;

  return (
    <LiquidGlassCard
      hasTopSpecular={true}
      className={`relative w-full max-w-4xl mx-auto p-0 rounded-2xl sm:rounded-3xl border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col ${className}`}
    >
      {/* Video / Radar Display Viewport */}
      <div className="relative w-full aspect-video min-h-[280px] sm:min-h-[380px] bg-black/60 flex items-center justify-center overflow-hidden">
        {/* Background Radar Scanner Grid Lines */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"
        />

        {/* Live Stream View (when camera is matched and online) */}
        {isMatched && !streamError && (
          <>
            {useWebRtc && camera?.webrtc_player_url ? (
              <iframe
                src={camera.webrtc_player_url}
                title="Live WebRTC Video"
                className="w-full h-full border-0 select-none"
                allow="autoplay; fullscreen"
                onError={() => setStreamError(true)}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={streamKey}
                src={cloudMjpegUrl}
                alt={camera?.name || "Live Station Feed"}
                className="h-full w-full object-contain select-none transition-opacity duration-300"
                onError={() => setStreamError(true)}
              />
            )}
          </>
        )}

        {/* Empty / Scanning / Radar Screen when no camera matched or loading */}
        {(!isMatched || isLoading) && !error && (
          <div className="relative flex flex-col items-center justify-center p-6 text-center select-none z-10">
            {/* Animated Concentric Radar Scanner */}
            <div className="relative flex h-28 w-28 items-center justify-center mb-4">
              <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping opacity-40" />
              <div className="absolute inset-2 rounded-full border border-cyan-500/30" />
              <div className="absolute inset-6 rounded-full border border-cyan-400/40" />
              <div className="absolute inset-10 rounded-full border border-cyan-300/50" />
              {/* Rotating Sweep Line */}
              <div
                className="absolute inset-0 rounded-full origin-center animate-spin"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, rgba(6,182,212,0.3) 60deg, transparent 65deg)",
                  animationDuration: "3s",
                }}
              />
              <svg
                className="w-8 h-8 text-cyan-300 relative z-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>

            <h3 className="text-base font-semibold text-white font-sans drop-shadow-md">
              {isLoading ? "Querying Geo Server..." : "Scanning Nearest Sector Optical Sensors"}
            </h3>
            <p className="mt-1 text-xs text-gray-400 max-w-sm leading-relaxed">
              Evaluating nearest camera coordinates with 15-meter hysteresis to eliminate visual jitter.
            </p>
          </div>
        )}

        {/* Stream Error / Standby Fallback */}
        {streamError && isMatched && (
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center bg-black/70 backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-950/40 mb-3 text-amber-300">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-white">Stream Syncing</h4>
            <p className="mt-1 text-xs text-gray-400 max-w-xs">
              Optical stream {camera?.cam_id} is initializing outbound frames.
            </p>
            <button
              onClick={handleRetry}
              className="mt-3 px-4 py-1.5 rounded-full border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white transition-all cursor-pointer"
            >
              Reconnect Stream
            </button>
          </div>
        )}

        {/* HUD Top Bar Floating Overlay */}
        {isMatched && (
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-20">
            {/* Left: Camera Name & Live Status */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <LiquidPill
                size="xs"
                variant={isCameraOnline ? "success" : "warning"}
                dotColor={isCameraOnline ? "bg-emerald-400" : "bg-amber-400"}
                dotPulse={Boolean(isCameraOnline)}
              >
                {isCameraOnline ? "LIVE RADAR" : "STANDBY"}
              </LiquidPill>

              <LiquidPill size="xs" variant="default" className="hidden sm:inline-flex">
                {camera?.name || camera?.cam_id}
              </LiquidPill>
            </div>

            {/* Right: Distance & Hysteresis Lock */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {typeof camera?.distance_meters === "number" && (
                <LiquidPill size="xs" variant="cyan" dotColor="bg-cyan-400">
                  📍 {Math.round(camera.distance_meters)}m away
                </LiquidPill>
              )}

              {camera?.hysteresis_retained && (
                <LiquidPill size="xs" variant="glass" className="hidden md:inline-flex">
                  🔒 Locked (15m)
                </LiquidPill>
              )}
            </div>
          </div>
        )}

        {/* HUD Bottom Bar Floating Overlay */}
        {isMatched && (
          <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-20">
            {/* Crowd Congestion Warning Pill */}
            <div className="pointer-events-auto">
              {isCrowdAlert ? (
                <LiquidPill size="sm" variant="alert" dotColor="bg-red-400" dotPulse>
                  ⚠️ HIGH DENSITY SURGE ALERT • Avoid Corridor
                </LiquidPill>
              ) : isModerateCrowd ? (
                <LiquidPill size="sm" variant="warning" dotColor="bg-amber-400">
                  ⚡ MODERATE CONGESTION • Moving
                </LiquidPill>
              ) : (
                <LiquidPill size="sm" variant="success" dotColor="bg-emerald-400">
                  ✓ CLEAR FLOW • Free Transit Corridor
                </LiquidPill>
              )}
            </div>

            {/* Telemetry Quick Badges */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <LiquidPill size="xs" variant="default">
                👤 {camera?.person_count ?? 0} Headcount
              </LiquidPill>

              {(camera?.dense_clusters_count ?? 0) > 0 && (
                <LiquidPill size="xs" variant="alert">
                  🔥 {camera?.dense_clusters_count} Clusters
                </LiquidPill>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Information Strip & Controls below the viewport */}
      {isMatched && (
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-black/40 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white tracking-tight">
                {camera?.station_name || "Central Station Hub"}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-xs text-cyan-300 font-mono">
                {camera?.zone || "Platform Sector"}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Automated 10s keep-alive heartbeat streaming via Vigilo Edge Cloud Bridge.
            </p>
          </div>

          {/* Stream Format Controls */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {camera?.webrtc_player_url && (
              <button
                onClick={() => setUseWebRtc(!useWebRtc)}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer border ${
                  useWebRtc
                    ? "border-cyan-400/50 bg-cyan-950/50 text-cyan-300"
                    : "border-white/10 bg-white/[0.04] text-gray-400 hover:text-white"
                }`}
              >
                {useWebRtc ? "WebRTC (Low Latency)" : "MJPEG Feed"}
              </button>
            )}

            <button
              onClick={handleRetry}
              title="Refresh Camera Query"
              className="p-1.5 rounded-full border border-white/10 bg-white/[0.04] text-gray-300 hover:text-white hover:bg-white/[0.1] transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </LiquidGlassCard>
  );
}
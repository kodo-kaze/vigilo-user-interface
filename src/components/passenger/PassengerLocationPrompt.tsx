"use client";

import React from "react";
import {
  LiquidGlassCard,
  LiquidGlassButton,
  LiquidPill,
  LiquidInnerCard,
} from "@/src/components/ui";
import {
  Coordinates,
  LocationPermissionState,
  StationSectorPreset,
} from "@/src/hooks/usePassengerLocation";

export interface PassengerLocationPromptProps {
  permissionState: LocationPermissionState;
  coords: Coordinates | null;
  activePreset: StationSectorPreset | null;
  presets: StationSectorPreset[];
  error: string | null;
  onRequestLocation: () => void;
  onSelectPreset: (preset: StationSectorPreset) => void;
  onResetLocation: () => void;
  className?: string;
}

export default function PassengerLocationPrompt({
  permissionState,
  coords,
  activePreset,
  presets,
  error,
  onRequestLocation,
  onSelectPreset,
  onResetLocation,
  className = "",
}: PassengerLocationPromptProps) {
  const isGranted = permissionState === "granted";
  const isSimulated = permissionState === "simulated";
  const isRequesting = permissionState === "requesting";
  const isDenied = permissionState === "denied";

  return (
    <LiquidGlassCard
      hasTopSpecular={true}
      className={`w-full max-w-xl mx-auto p-6 sm:p-8 rounded-2xl sm:rounded-3xl border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl ${className}`}
    >
      {/* Header section with pulsating radar emblem */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-950/40 backdrop-blur-xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.4),0_8px_24px_rgba(6,182,212,0.25)]">
            <svg
              className={`h-7 w-7 text-cyan-300 ${isRequesting ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.4" />
            </svg>
          </div>
          {/* Subtle sonar rings if requesting or granted */}
          {(isRequesting || isGranted) && (
            <span className="pointer-events-none absolute -inset-2 rounded-2xl border border-cyan-400/30 animate-ping opacity-30" />
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans drop-shadow-md">
          {isGranted
            ? "Live GPS Locked"
            : isSimulated
            ? `Sector: ${activePreset?.name || "Simulated"}`
            : "Passenger Station Radar"}
        </h2>

        <p className="mt-1.5 text-xs sm:text-sm text-gray-300 max-w-md leading-relaxed font-sans">
          {isGranted
            ? "Your coordinates are continuously paired with the closest CCTV optical sensor via 15m geo-hysteresis."
            : isSimulated
            ? `Exploring real-time crowd dynamics inside ${activePreset?.zone || "station zone"}.`
            : "Enable location to automatically view live crowd density and corridor feeds nearest to your current platform."}
        </p>

        {/* Status pill strip */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {isGranted && coords && (
            <LiquidPill variant="cyan" size="sm" dotColor="bg-cyan-400" dotPulse>
              GPS: {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)} (±{Math.round(coords.accuracy || 0)}m)
            </LiquidPill>
          )}

          {isSimulated && (
            <LiquidPill variant="warning" size="sm" dotColor="bg-amber-400">
              Indoor Simulation Active
            </LiquidPill>
          )}

          {isDenied && (
            <LiquidPill variant="alert" size="sm" dotColor="bg-red-400">
              Location Blocked
            </LiquidPill>
          )}
        </div>
      </div>

      {/* Error alert banner */}
      {error && !isSimulated && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-center text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-col items-center gap-3 w-full">
        {!isGranted && (
          <LiquidGlassButton
            onClick={onRequestLocation}
            disabled={isRequesting}
            variant="cyan"
            size="md"
            className="w-full sm:w-auto"
            iconLeft={
              <svg className="w-4 h-4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2v20M2 12h20M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />
              </svg>
            }
          >
            {isRequesting ? "Acquiring Satellites..." : "Allow Live Location"}
          </LiquidGlassButton>
        )}

        {(isGranted || isSimulated) && (
          <button
            onClick={onResetLocation}
            className="text-xs text-gray-400 hover:text-white transition-colors underline decoration-dotted underline-offset-4 cursor-pointer mt-1"
          >
            Switch to another sector or reset
          </button>
        )}
      </div>

      {/* Station Sector Presets for indoor navigation / fallback */}
      <div className="mt-6 pt-5 border-t border-white/[0.08] w-full">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Station Sector Shortcuts
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            Indoor Fallback
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presets.map((preset) => {
            const isSelected = activePreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`group flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "border-cyan-400/50 bg-cyan-950/40 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                    : "border-white/[0.08] bg-white/[0.03] text-gray-300 hover:border-white/20 hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-semibold text-white group-hover:text-cyan-200 transition-colors">
                    {preset.name}
                  </span>
                  {isSelected && (
                    <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                </div>
                <span className="mt-1 text-[10px] text-gray-400 line-clamp-1">
                  {preset.description}
                </span>
                <span className="mt-1 text-[9px] font-mono text-gray-500">
                  {preset.coords.lat.toFixed(4)}, {preset.coords.lon.toFixed(4)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </LiquidGlassCard>
  );
}
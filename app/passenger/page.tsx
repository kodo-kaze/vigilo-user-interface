"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UiloraLiquidChrome,
  LiquidNavMenu,
  LiquidPill,
  LiquidGlassCard,
  LiquidGlassButton,
} from "@/src/components/ui";
import { usePassengerLocation } from "@/src/hooks/usePassengerLocation";
import { useNearestCamera } from "@/src/hooks/useNearestCamera";
import {
  PassengerLocationPrompt,
  PassengerStreamPlayer,
} from "@/src/components/passenger";

export default function PassengerRadarPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [showLocationSettings, setShowLocationSettings] = useState(false);

  const {
    coords,
    permissionState,
    error: locationError,
    activePreset,
    presets,
    requestLocation,
    selectPreset,
    resetLocation,
  } = usePassengerLocation();

  const {
    cameraData,
    isLoading: isQueryingCamera,
    error: cameraError,
    refresh: refreshCamera,
  } = useNearestCamera(coords, 3000);

  const hasCoordinates = Boolean(coords);

  return (
    <div className="relative min-h-screen w-full bg-[#030712] text-white flex flex-col overflow-x-hidden">
      {/* Dynamic Molten Chrome Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <UiloraLiquidChrome
          baseColor="#040508"
          chromeColor="#f0f0f0"
          viscosity={0.3}
          speed={0.3}
          distortion={0.6}
          isPaused={isPaused}
        />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 pb-28">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between gap-4 mb-6">
          <Link href="/" className="flex items-center gap-3 group select-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Vigilo"
              className="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Vigilo <span className="text-cyan-400">Radar</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">
                Passenger Terminal Hub
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {hasCoordinates ? (
              <LiquidPill
                size="sm"
                variant={permissionState === "granted" ? "cyan" : "warning"}
                dotColor={permissionState === "granted" ? "bg-cyan-400" : "bg-amber-400"}
                dotPulse={permissionState === "granted"}
              >
                {permissionState === "granted" ? "GPS Active" : "Sector Sim"}
              </LiquidPill>
            ) : (
              <LiquidPill size="sm" variant="default" dotColor="bg-gray-400">
                Standby
              </LiquidPill>
            )}

            <button
              onClick={() => setShowLocationSettings(!showLocationSettings)}
              title="Location & Sector Options"
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                showLocationSettings
                  ? "border-cyan-400/50 bg-cyan-950/60 text-cyan-300"
                  : "border-white/10 bg-white/[0.04] text-gray-400 hover:text-white"
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Station Sector Quick-Select Strip (when coordinates are already locked) */}
        {hasCoordinates && (
          <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
            <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider shrink-0 mr-1">
              Sectors:
            </span>

            {/* GPS Auto-Track button */}
            <button
              onClick={requestLocation}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                permissionState === "granted"
                  ? "border-cyan-400/50 bg-cyan-950/60 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                  : "border-white/10 bg-white/[0.04] text-gray-300 hover:text-white"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${permissionState === "granted" ? "bg-cyan-400 animate-pulse" : "bg-gray-400"}`} />
              Auto GPS ({coords ? `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}` : "Detect"})
            </button>

            {/* Presets */}
            {presets.map((preset) => {
              const isActive = activePreset?.id === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "border-cyan-400/50 bg-cyan-950/60 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                      : "border-white/10 bg-white/[0.04] text-gray-300 hover:text-white"
                  }`}
                >
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                  {preset.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Location Permission Prompt Modal/Section */}
        {(!hasCoordinates || showLocationSettings) && (
          <div className="mb-6">
            <PassengerLocationPrompt
              permissionState={permissionState}
              coords={coords}
              activePreset={activePreset}
              presets={presets}
              error={locationError}
              onRequestLocation={requestLocation}
              onSelectPreset={(p) => {
                selectPreset(p);
                setShowLocationSettings(false);
              }}
              onResetLocation={resetLocation}
            />
          </div>
        )}

        {/* Live Passenger Stream Display */}
        {hasCoordinates && (
          <div className="flex flex-col gap-6">
            <PassengerStreamPlayer
              camera={cameraData}
              isLoading={isQueryingCamera}
              error={cameraError}
              onRefresh={refreshCamera}
            />

            {/* Live Crowd Advisory Card */}
            <LiquidGlassCard
              hasTopSpecular={true}
              className="p-5 sm:p-6 rounded-2xl border-white/[0.1] bg-black/40 backdrop-blur-xl"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-950/40 text-cyan-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      Station Corridor Passenger Guidance
                    </h3>
                    <LiquidPill size="xs" variant="glass">
                      AI Conflux Inference
                    </LiquidPill>
                  </div>
                  <p className="mt-1 text-xs text-gray-300 leading-relaxed">
                    {cameraData?.is_crowd || (cameraData?.crowd_probability || 0) >= 0.6
                      ? "Corridor is experiencing high pedestrian density. Expect 2-3 minute transit delays. Consider taking alternate escalators on Platform 2."
                      : (cameraData?.crowd_probability || 0) >= 0.3
                      ? "Moderate pedestrian movement detected. Corridors and fare gates are flowing steadily."
                      : "Corridor is fully clear. High boarding velocity with zero chokepoint congestion detected across turnstiles."}
                  </p>
                </div>
              </div>
            </LiquidGlassCard>
          </div>
        )}
      </div>

      {/* Floating Speed Dial Navigation Menu */}
      <LiquidNavMenu
        position="bottom-right"
        isPaused={isPaused}
        onTogglePlayPause={() => setIsPaused((prev) => !prev)}
      />
    </div>
  );
}
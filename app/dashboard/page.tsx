"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  UiloraLiquidChrome,
  LiquidNavMenu,
  DashboardVideoFeed,
  CrowdDynamicsCard,
  CameraDetailsCard,
  type TelemetryStats,
} from "@/src/components/ui";
import { usePassengerLocation } from "@/src/hooks/usePassengerLocation";
import { useNearestCamera } from "@/src/hooks/useNearestCamera";

const DEFAULT_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

const AUTO_START_STORAGE_KEY = "vigilo_auto_start_camera";

export interface GeoCameraSummary {
  cam_id: string;
  name: string;
  zone?: string;
  station_name?: string;
  status?: string;
  active?: boolean;
  is_public?: boolean;
  is_crowd?: boolean;
  crowd_probability?: number;
  person_count?: number;
  people_per_megapixel?: number;
  dense_clusters_count?: number;
  gatherings_count?: number;
  stream_url?: string;
  mjpeg_url?: string;
}

export default function DashboardPage() {
  const [isPaused, setIsPaused] = useState(false);
  const backendUrl = DEFAULT_BACKEND_URL;
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [isPowerToggling, setIsPowerToggling] = useState(false);

  // Cloud cameras registered via Edge Server to Geo Server
  const [cameras, setCameras] = useState<GeoCameraSummary[]>([]);
  const [selectedCamId, setSelectedCamId] = useState<string | null>(null);

  // Live GPS Location detector
  const { coords } = usePassengerLocation();

  // Dynamic Nearest Camera resolver with 15m geo-hysteresis & 10s heartbeat
  const { cameraData: nearestCamera } = useNearestCamera(coords);

  // Initialize autoStartCamera lazily from localStorage to prevent setState in effect
  const [autoStartCamera, setAutoStartCamera] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(AUTO_START_STORAGE_KEY);
        if (stored !== null) {
          return stored === "true";
        }
      } catch {
        // ignore
      }
    }
    return false;
  });

  const hasAutoEngagedRef = useRef(false);

  const [stats, setStats] = useState<TelemetryStats>({
    status: "CONNECTING",
    is_suspended: true,
    is_crowd: false,
    crowd_probability: 0.0,
    people_count: 0,
    density_per_megapixel: 0.0,
    nearest_neighbor_distance: 0.0,
    dense_clusters_count: 0,
    gatherings_count: 0,
    isolated_count: 0,
    heatmap_enabled: true,
    clusters_enabled: true,
    fps: 0.0,
    capture_fps: 0.0,
    camera_connected: false,
    resolution: "Detecting...",
    camera_source: "Live Vision Ingestion",
    zone: "Central Station Hub • Operations Control Room",
    model_mesh: "YOLO26m + Conflux Random Forest + Spatial Clustering",
    uptime_seconds: 0,
  });

  const [streamKey, setStreamKey] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleAutoStart = useCallback(() => {
    setAutoStartCamera((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTO_START_STORAGE_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  // Poll telemetry metrics from Cloud Geo Server (/api/geo/cameras) with fallback to local (/stats)
  const fetchTelemetry = useCallback(async () => {
    try {
      // 1. Try Cloud Geo Server first
      const geoRes = await fetch("/api/geo/cameras", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const camList: GeoCameraSummary[] = geoData.cameras || [];
        setCameras(camList);

        if (camList.length > 0) {
          const current =
            camList.find((c) => c.cam_id === selectedCamId) || camList[0];

          if (!selectedCamId && current.cam_id) {
            setSelectedCamId(current.cam_id);
          }

          const isOnline = current.status === "ONLINE" || Boolean(current.active);
          const isSuspended = !current.active || current.status === "STANDBY";

          setStats((prev) => ({
            ...prev,
            status: isSuspended ? "STANDBY" : (current.status || "ONLINE"),
            is_suspended: isSuspended,
            is_crowd: Boolean(current.is_crowd),
            crowd_probability: typeof current.crowd_probability === "number" ? current.crowd_probability : 0.0,
            people_count: current.person_count ?? 0,
            density_per_megapixel: current.people_per_megapixel ?? 0.0,
            dense_clusters_count: current.dense_clusters_count ?? 0,
            gatherings_count: current.gatherings_count ?? 0,
            camera_connected: isOnline,
            camera_source: current.name || current.cam_id,
            zone: current.zone || prev.zone,
            resolution: "1920×1080",
          }));

          setStreamError(false);
          setStreamConnected(isOnline && !isSuspended);
          return;
        }
      }
    } catch {
      // Geo Server unreachable, fallback to local
    }

    // 2. Fallback to local edge server /stats
    try {
      const res = await fetch(`${DEFAULT_BACKEND_URL}/stats`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          setStats((prev) => ({
            ...prev,
            ...data,
            fps: typeof data.fps === "number" ? data.fps : (prev.fps ?? 0),
            density_per_megapixel:
              typeof data.density_per_megapixel === "number"
                ? data.density_per_megapixel
                : (prev.density_per_megapixel ?? 0),
            nearest_neighbor_distance:
              typeof data.nearest_neighbor_distance === "number"
                ? data.nearest_neighbor_distance
                : (prev.nearest_neighbor_distance ?? 0),
            crowd_probability:
              typeof data.crowd_probability === "number"
                ? data.crowd_probability
                : (prev.crowd_probability ?? 0),
            people_count:
              typeof data.people_count === "number"
                ? data.people_count
                : (prev.people_count ?? 0),
            uptime_seconds:
              typeof data.uptime_seconds === "number"
                ? data.uptime_seconds
                : (prev.uptime_seconds ?? 0),
          }));
          setStreamError(false);
          if (data.camera_connected && !data.is_suspended) {
            setStreamConnected(true);
          } else if (data.is_suspended) {
            setStreamConnected(false);
          }
        }
      } else {
        setStreamConnected(false);
      }
    } catch {
      setStreamConnected(false);
    }
  }, [selectedCamId]);

  useEffect(() => {
    // Asynchronously trigger initial fetch without cascading render
    const initialTimer = setTimeout(() => {
      fetchTelemetry();
    }, 0);

    pollIntervalRef.current = setInterval(fetchTelemetry, 750);
    return () => {
      clearTimeout(initialTimer);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [fetchTelemetry]);

  // Automatically bind nearest camera and user coordinates to telemetry stats
  useEffect(() => {
    if (!nearestCamera || !nearestCamera.matched) return;

    if (nearestCamera.cam_id && (!selectedCamId || selectedCamId !== nearestCamera.cam_id)) {
      setSelectedCamId(nearestCamera.cam_id);
    }

    const isOnline = nearestCamera.status === "ONLINE" || Boolean(nearestCamera.active);
    const isSuspended = !nearestCamera.active || nearestCamera.status === "STANDBY";

    setStats((prev) => ({
      ...prev,
      status: isSuspended ? "STANDBY" : (nearestCamera.status || "ONLINE"),
      is_suspended: isSuspended,
      is_crowd: Boolean(nearestCamera.is_crowd),
      crowd_probability:
        typeof nearestCamera.crowd_probability === "number"
          ? nearestCamera.crowd_probability
          : prev.crowd_probability,
      people_count: nearestCamera.person_count ?? prev.people_count,
      density_per_megapixel:
        nearestCamera.people_per_megapixel ?? prev.density_per_megapixel,
      dense_clusters_count:
        nearestCamera.dense_clusters_count ?? prev.dense_clusters_count,
      gatherings_count:
        nearestCamera.gatherings_count ?? prev.gatherings_count,
      camera_connected: isOnline,
      camera_source: nearestCamera.name || nearestCamera.cam_id || prev.camera_source,
      zone: nearestCamera.zone || prev.zone,
      lat: nearestCamera.lat ?? prev.lat,
      lon: nearestCamera.lon ?? prev.lon,
      user_lat: coords?.lat ?? prev.user_lat,
      user_lon: coords?.lon ?? prev.user_lon,
      distance_meters: nearestCamera.distance_meters ?? prev.distance_meters,
      resolution: "1920×1080",
    }));

    setStreamError(false);
    setStreamConnected(isOnline && !isSuspended);
  }, [nearestCamera, coords, selectedCamId]);

  // Keep user coordinates updated in stats when location is acquired
  useEffect(() => {
    if (coords) {
      setStats((prev) => ({
        ...prev,
        user_lat: coords.lat,
        user_lon: coords.lon,
      }));
    }
  }, [coords]);

  // Passenger Heartbeat Loop: keeps the active cloud stream alive on Geo Server (30s reaper)
  useEffect(() => {
    if (!selectedCamId) return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/geo/cameras/${selectedCamId}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        // ignore
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);
    return () => clearInterval(interval);
  }, [selectedCamId]);

  // If user enabled auto-start, automatically wake up camera once on dashboard load
  useEffect(() => {
    if (autoStartCamera && !hasAutoEngagedRef.current && stats.is_suspended) {
      hasAutoEngagedRef.current = true;
      fetch(`${DEFAULT_BACKEND_URL}/camera/resume`, {
        method: "POST",
        headers: { Accept: "application/json" },
      })
        .then((res) => {
          if (res.ok) {
            setStreamError(false);
            setStreamKey((k) => k + 1);
            fetchTelemetry();
          }
        })
        .catch(() => {});
    }
  }, [autoStartCamera, stats.is_suspended, fetchTelemetry]);

  // Restart stream image on retry
  const handleRetry = () => {
    setStreamError(false);
    setStreamKey((prev) => prev + 1);
    fetchTelemetry();
  };

  const handleSelectCamera = (camId: string) => {
    setSelectedCamId(camId);
    setStreamError(false);
    setStreamKey((prev) => prev + 1);
  };

  // Toggle backend camera & inference power suspension
  const handleTogglePower = useCallback(async () => {
    setIsPowerToggling(true);
    try {
      const toggleUrl = selectedCamId
        ? `/api/edge/cameras/${selectedCamId}/toggle`
        : `${DEFAULT_BACKEND_URL}/camera/toggle`;

      const res = await fetch(toggleUrl, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setStreamError(false);
        setStreamKey((prev) => prev + 1);
      }
    } catch (e) {
      console.error("Failed to toggle camera power:", e);
    } finally {
      setIsPowerToggling(false);
      fetchTelemetry();
    }
  }, [selectedCamId, fetchTelemetry]);

  // Toggle 2D ground thermal density heatmap
  const handleToggleHeatmap = useCallback(async () => {
    const nextVal = !(stats.heatmap_enabled ?? true);
    setStats((prev) => ({ ...prev, heatmap_enabled: nextVal }));
    try {
      await fetch(`${DEFAULT_BACKEND_URL}/camera/options?heatmap=${nextVal}`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
    } catch (e) {
      console.error("Failed to toggle ground heatmap:", e);
    }
  }, [stats.heatmap_enabled]);

  // Toggle density-aware spatial cluster hulls and gatherings
  const handleToggleClusters = useCallback(async () => {
    const nextVal = !(stats.clusters_enabled ?? true);
    setStats((prev) => ({ ...prev, clusters_enabled: nextVal }));
    try {
      await fetch(`${DEFAULT_BACKEND_URL}/camera/options?clusters=${nextVal}`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
    } catch (e) {
      console.error("Failed to toggle spatial clusters:", e);
    }
  }, [stats.clusters_enabled]);

  const isAlert = Boolean(stats.is_crowd || stats.status === "CROWD ALERT");
  const probabilityPercent = Math.round((stats.crowd_probability ?? 0) * 100);

  // Format uptime into MM:SS or HH:MM:SS
  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  };

  // Stream URL: prefers cloud Geo Server relay /api/geo/cameras/{id}/stream, falls back to /video_feed
  const streamSrc = selectedCamId
    ? `/api/geo/cameras/${selectedCamId}/stream?t=${streamKey}`
    : `${backendUrl}/video_feed?t=${streamKey}`;

  return (
    <main className="relative h-screen max-h-screen w-full overflow-hidden bg-[#040508] text-white selection:bg-cyan-500/20 selection:text-white p-2.5 sm:p-3.5 lg:p-4 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      {/* Dynamic Molten Liquid Chrome Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <UiloraLiquidChrome
          baseColor="#040508"
          chromeColor="#f0f0f0"
          viscosity={0.3}
          speed={0.4}
          distortion={0.7}
          isPaused={isPaused}
        />
      </div>

      {/* Decorative Vignette */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1] pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(4,5,8,0.5)_0%,rgba(4,5,8,0.25)_40%,rgba(4,5,8,0.88)_100%)]"
      />

      {/* Main Glass Workspace Container (Wide Bento Frame, Zero-Scroll) */}
      <div className="relative z-10 mx-auto w-full max-w-[1640px] h-full flex flex-col justify-between gap-2.5 sm:gap-3">
        {/* TOP SECTION: LIVE VIDEO FOOTAGE */}
        <DashboardVideoFeed
          backendUrl={backendUrl}
          streamSrc={streamSrc}
          cameras={cameras}
          selectedCamId={selectedCamId || undefined}
          onSelectCamera={handleSelectCamera}
          stats={stats}
          locationCoords={coords}
          distanceMeters={nearestCamera?.distance_meters}
          streamConnected={streamConnected}
          streamError={streamError}
          streamKey={streamKey}
          isAlert={isAlert}
          onRetry={handleRetry}
          onStreamLoad={() => {
            setStreamError(false);
            setStreamConnected(true);
          }}
          onStreamError={() => {
            setStreamError(true);
            setStreamConnected(false);
          }}
          onTogglePower={handleTogglePower}
          isPowerToggling={isPowerToggling}
          autoStartCamera={autoStartCamera}
          onToggleAutoStart={handleToggleAutoStart}
          onToggleHeatmap={handleToggleHeatmap}
          onToggleClusters={handleToggleClusters}
        />

        {/* BOTTOM ROW: RECTANGULAR BENTO GRID */}
        <section className="shrink-0 w-full max-w-[92%] sm:max-w-[90%] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 select-none">
          {/* BOTTOM-LEFT BENTO CARD: CROWD DYNAMICS (8 COLUMNS) */}
          <CrowdDynamicsCard
            stats={stats}
            isAlert={isAlert}
            probabilityPercent={probabilityPercent}
          />

          {/* BOTTOM-RIGHT BENTO CARD: LOCATION & CAMERA DETAILS (4 COLUMNS) */}
          <CameraDetailsCard
            stats={stats}
            formatUptime={formatUptime}
            onTogglePower={handleTogglePower}
            isPowerToggling={isPowerToggling}
            autoStartCamera={autoStartCamera}
            onToggleAutoStart={handleToggleAutoStart}
          />
        </section>
      </div>

      {/* Floating Speed Dial Controls */}
      <LiquidNavMenu
        isPaused={isPaused}
        onTogglePlayPause={() => setIsPaused((prev) => !prev)}
        position="bottom-right"
      />
    </main>
  );
}

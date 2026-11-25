"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Coordinates } from "./usePassengerLocation";

export interface PlaybackUrls {
  stream_path: string;
  webrtc_whep_url: string;
  webrtc_player_url: string;
  hls_url: string;
}

export interface NearestCameraData {
  matched: boolean;
  distance_meters?: number;
  hysteresis_retained?: boolean;
  cam_id?: string;
  edge_node_id?: string;
  station_name?: string;
  name?: string;
  zone?: string;
  lat?: number;
  lon?: number;
  is_public?: boolean;
  active?: boolean;
  is_streaming_to_cloud?: boolean;
  status?: string;
  is_crowd?: boolean;
  crowd_probability?: number;
  person_count?: number;
  people_per_megapixel?: number;
  dense_clusters_count?: number;
  gatherings_count?: number;
  updated_at?: string;
  stream_path?: string;
  webrtc_whep_url?: string;
  webrtc_player_url?: string;
  hls_url?: string;
  playback?: PlaybackUrls;
  detail?: string;
}

export function useNearestCamera(coords: Coordinates | null, pollIntervalMs: number = 3000) {
  const [data, setData] = useState<NearestCameraData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currentCamIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  // Fetch nearest camera from Geo Server API
  const fetchNearestCamera = useCallback(async () => {
    if (!coords) return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    try {
      const params = new URLSearchParams({
        lat: String(coords.lat),
        lon: String(coords.lon),
      });

      if (currentCamIdRef.current) {
        params.append("current_cam_id", currentCamIdRef.current);
      }

      const res = await fetch(`/api/geo/nearest-camera?${params.toString()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const json: NearestCameraData = await res.json();
        setData(json);
        if (json.matched && json.cam_id) {
          currentCamIdRef.current = json.cam_id;
        }
        setError(null);
      } else if (res.status === 404) {
        const errJson = await res.json().catch(() => ({}));
        setData(null);
        setError(errJson.detail || "No active public cameras available near your location");
      } else {
        setError(`Geo Server responded with status ${res.status}`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to query Geo Server");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [coords]);

  // Initial fetch and polling loop whenever coordinates change
  useEffect(() => {
    if (!coords) {
      setData(null);
      currentCamIdRef.current = null;
      return;
    }

    setIsLoading(true);
    fetchNearestCamera();

    const interval = setInterval(() => {
      fetchNearestCamera();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [coords, fetchNearestCamera, pollIntervalMs]);

  // Passenger Heartbeat Loop: keeps the camera active in the Geo Server's idle stream reaper
  useEffect(() => {
    const camId = data?.cam_id;
    if (!camId || !data?.matched) return;

    // Send heartbeat every 10 seconds (Geo Server idle timeout is 30s)
    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/geo/cameras/${camId}/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        console.warn("[Passenger Heartbeat Error]:", e);
      }
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 10000);

    return () => clearInterval(heartbeatInterval);
  }, [data?.cam_id, data?.matched]);

  return {
    cameraData: data,
    isLoading,
    error,
    refresh: fetchNearestCamera,
  };
}

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface Coordinates {
  lat: number;
  lon: number;
  accuracy?: number;
}

export interface StationSectorPreset {
  id: string;
  name: string;
  zone: string;
  coords: Coordinates;
  description: string;
}

export const STATION_SECTOR_PRESETS: StationSectorPreset[] = [
  {
    id: "concourse-main",
    name: "Main Concourse",
    zone: "Terminal Concourse 04 • Gate South",
    coords: { lat: 28.6139, lon: 77.2090, accuracy: 5 },
    description: "Main concourse turnstiles & central ticketing hall",
  },
  {
    id: "platform-1-escalator",
    name: "Platform 1 Escalator",
    zone: "Platform 1 • Vertical Transit",
    coords: { lat: 28.6142, lon: 77.2095, accuracy: 4 },
    description: "Escalator mezzanine to Platform 1 boarding",
  },
  {
    id: "platform-2-hall",
    name: "Platform 2 Boarding",
    zone: "Platform Hub • Track Sector 3",
    coords: { lat: 28.6146, lon: 77.2102, accuracy: 6 },
    description: "Track edge sector 3 boarding area",
  },
  {
    id: "sealdah-central",
    name: "Central Terminal Entry",
    zone: "North Terminal • Main Gate",
    coords: { lat: 22.5675, lon: 88.3712, accuracy: 8 },
    description: "Station north pedestrian screening gate",
  },
];

export type LocationPermissionState =
  | "prompt"
  | "requesting"
  | "granted"
  | "denied"
  | "simulated"
  | "unsupported";

export function usePassengerLocation() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<StationSectorPreset | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Check initial browser permission status if supported
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setPermissionState("unsupported");
      return;
    }

    if ("permissions" in navigator && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((result) => {
          if (result.state === "granted") {
            setPermissionState("granted");
            requestLocation();
          } else if (result.state === "denied") {
            setPermissionState("denied");
          } else {
            setPermissionState("prompt");
          }

          result.onchange = () => {
            if (result.state === "granted") {
              setPermissionState("granted");
              requestLocation();
            } else if (result.state === "denied") {
              setPermissionState("denied");
            } else {
              setPermissionState("prompt");
            }
          };
        })
        .catch(() => {
          // Fallback if permissions query fails
        });
    }

    return () => {
      if (watchIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setPermissionState("unsupported");
      setError("Geolocation is not supported by your browser");
      return;
    }

    setPermissionState("requesting");
    setError(null);
    setActivePreset(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords: Coordinates = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCoords(newCoords);
        setPermissionState("granted");
        setError(null);

        // Start live watching for walking movement
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (watchPos) => {
            setCoords({
              lat: watchPos.coords.latitude,
              lon: watchPos.coords.longitude,
              accuracy: watchPos.coords.accuracy,
            });
          },
          (err) => {
            console.warn("[Geolocation Watch]:", err.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000,
          }
        );
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
          setError("Location access denied. Choose a station sector below to view crowd feeds.");
        } else {
          setPermissionState("prompt");
          setError(err.message || "Unable to acquire current location");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const selectPreset = useCallback((preset: StationSectorPreset) => {
    if (watchIdRef.current !== null && typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setActivePreset(preset);
    setCoords(preset.coords);
    setPermissionState("simulated");
    setError(null);
  }, []);

  const resetLocation = useCallback(() => {
    if (watchIdRef.current !== null && typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setActivePreset(null);
    setCoords(null);
    setPermissionState("prompt");
    setError(null);
  }, []);

  return {
    coords,
    permissionState,
    error,
    activePreset,
    requestLocation,
    selectPreset,
    resetLocation,
    presets: STATION_SECTOR_PRESETS,
  };
}
